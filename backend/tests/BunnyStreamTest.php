<?php
// Unit & Integration Test for Bunny Stream Service and Playback Controller
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../services/BunnyStreamService.php';
require_once __DIR__ . '/../controllers/PlaybackController.php';

echo "=== 1. TEST BUNNY STREAM SERVICE CONFIG & DETECTIONS ===\n";
$config = BunnyStreamService::getConfig();
assert(!empty($config['library_id']), 'Library ID should not be empty');
assert($config['library_id'] === '807954', 'Library ID must match 807954');
assert(!empty($config['token_key']), 'Token key should not be empty');
echo "✓ Config loaded: Library={$config['library_id']}, CDN={$config['cdn_hostname']}\n";

$testVideoId = '0de41d3a-4d1d-498b-b731-bcc31a59ffc2';
assert(BunnyStreamService::isBunnyStream($testVideoId), 'UUID should be detected as Bunny Stream');
assert(BunnyStreamService::extractVideoId($testVideoId) === $testVideoId, 'UUID extracted cleanly');
assert(!BunnyStreamService::isBunnyStream('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'YouTube should not be Bunny Stream');
echo "✓ Provider detections and GUID extractions passed\n";

echo "\n=== 2. TEST OFFICIAL TOKEN GENERATION SPECIFICATION ===\n";
$expires = time() + 3600;
$token = BunnyStreamService::generateEmbedToken($testVideoId, $expires);
$expectedToken = hash('sha256', $config['token_key'] . $testVideoId . $expires);
assert($token === $expectedToken, 'Generated token matches SHA-256 specification');
echo "✓ Token hash algorithm verified: $token\n";

echo "\n=== 3. TEST PLAYBACK SESSION GENERATION ===\n";
$session = BunnyStreamService::generatePlaybackSession($testVideoId, 1800);
assert(!isset($session['token_key']), 'CRITICAL: token_key must never be in session payload');
assert(!isset($session['api_key']), 'CRITICAL: api_key must never be in session payload');
assert($session['provider'] === 'bunny_stream', 'Provider must be bunny_stream');
assert($session['video_id'] === $testVideoId, 'Video ID matches');
assert(str_contains($session['embed_url'], 'player.mediadelivery.net/embed/807954/' . $testVideoId), 'Embed URL matches pattern');
assert(str_contains($session['embed_url'], 'token='), 'Embed URL includes token param');
assert(str_contains($session['embed_url'], 'expires='), 'Embed URL includes expires param');
echo "✓ Playback session structure verified safe with zero exposed secrets\n";

echo "\n=== 4. TEST LIVE EMBED REACHABILITY WITH GENERATED TOKEN ===\n";
$ch = curl_init($session['embed_url']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
// curl_close is omitted in PHP 8.5+
echo "Bunny Stream player HTTP code: $httpCode\n";
assert($httpCode === 200, "Signed embed URL must return 200 OK (Got $httpCode)");
echo "✓ Authorized playback URL successfully authorized by BunnyCDN edge!\n";

echo "\n=== 5. TEST INVALID TOKEN REJECTION BY BUNNY EDGE ===\n";
$invalidUrl = "https://player.mediadelivery.net/embed/807954/{$testVideoId}?token=badtoken123&expires={$expires}";
$ch = curl_init($invalidUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_exec($ch);
$badHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
// curl_close is omitted in PHP 8.5+
echo "Tampered token HTTP code: $badHttpCode\n";
assert($badHttpCode === 403, "Tampered embed token must return 403 Forbidden (Got $badHttpCode)");
echo "✓ Tampered/unauthorized token rejected by Bunny edge with HTTP 403\n";

echo "\n=== 6. TEST PLAYBACK CONTROLLER ENROLLMENT ENFORCEMENT ===\n";
// User 1 is admin
$adminUser = ['id' => 1, 'role' => 'admin', 'email' => 'admin@aaroha-inc.com'];
// User 2 is student enrolled in Course 1 (which contains Lesson 1003)
$enrolledStudent = ['id' => 2, 'role' => 'student', 'email' => 'elena.rostova@enterprise.io'];
// User 3 is student unenrolled in Course 1
$unenrolledStudent = ['id' => 3, 'role' => 'student', 'email' => 'learner@enterprise.io'];

// Case A: Enrolled Student -> Lesson 1003 (Course 1)
$resEnrolled = PlaybackController::getPlaybackSession(1003, $enrolledStudent);
assert($resEnrolled['success'] === true, 'Enrolled student should have success=true');
assert(isset($resEnrolled['playback']['embed_url']), 'Enrolled student gets embed_url');
assert($resEnrolled['playback']['video_id'] === $testVideoId, 'Playback video matches test video');
echo "✓ Case A PASSED: Enrolled student authorized to play lesson 1003\n";

// Case B: Unenrolled Student -> Lesson 1003 (Course 1)
$resUnenrolled = PlaybackController::getPlaybackSession(1003, $unenrolledStudent);
assert($resUnenrolled['success'] === false, 'Unenrolled student must have success=false');
assert($resUnenrolled['code'] === 'ENROLLMENT_REQUIRED', 'Unenrolled student receives ENROLLMENT_REQUIRED');
echo "✓ Case B PASSED: Unenrolled student rejected with ENROLLMENT_REQUIRED (HTTP 403)\n";

// Case C: Enrolled Student -> Non-free Lesson 2002 (Course 2, which User 2 is NOT enrolled in)
$resUnenrolledCourse2 = PlaybackController::getPlaybackSession(2002, $enrolledStudent);
assert($resUnenrolledCourse2['success'] === false, 'Student not enrolled in Course 2 must have success=false');
assert($resUnenrolledCourse2['code'] === 'ENROLLMENT_REQUIRED', 'Unenrolled in Course 2 receives ENROLLMENT_REQUIRED');
echo "✓ Case C PASSED: Student not enrolled in Course 2 rejected with ENROLLMENT_REQUIRED\n";

// Case D: Admin -> Lesson 1003 (Course 1) & Lesson 2002 (Course 2)
$resAdmin = PlaybackController::getPlaybackSession(1003, $adminUser);
assert($resAdmin['success'] === true, 'Admin should have full access');
$resAdmin2 = PlaybackController::getPlaybackSession(2002, $adminUser);
assert($resAdmin2['success'] === true, 'Admin should have full access to Course 2');
echo "✓ Case D PASSED: Admin granted access to all curriculum\n";

echo "\n🎉 ALL INTEGRATION AND SECURITY TESTS PASSED PERFECTLY!\n";
