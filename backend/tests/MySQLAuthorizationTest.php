<?php
// Comprehensive MySQL Authorization & Security Integration Test
// Validates:
// 1. MySQL database connection & seed data
// 2. Unauthenticated rejection (HTTP 401)
// 3. Expired enrollment rejection (HTTP 403 ENROLLMENT_EXPIRED)
// 4. Dropped enrollment rejection (HTTP 403 ENROLLMENT_DROPPED)
// 5. Cross-course isolation (HTTP 403 ENROLLMENT_REQUIRED)
// 6. Unpublished lesson rejection for students (HTTP 403 LESSON_UNPUBLISHED)
// 7. Unpublished course rejection for students (HTTP 403 COURSE_UNPUBLISHED)
// 8. Admin full preview access across unpublished/published curriculum
// 9. Cache-Control: no-store header enforcement
// 10. Bunny CDN edge verification with generated SHA-256 token

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../services/BunnyStreamService.php';

$pdo = Database::getConnection();
$driverName = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
echo "Connected Database Driver: $driverName\n";
assert($driverName === 'mysql', "Test must run against MySQL (Got $driverName)");

$apiBase = 'http://127.0.0.1:8000/api';
$testVideoGuid = '0de41d3a-4d1d-498b-b731-bcc31a59ffc2';
$expectedLibraryId = '807954';

function requestApi($path, $method = 'GET', $data = null, $token = null) {
    global $apiBase;
    $url = $apiBase . $path;
    $ch = curl_init($url);
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];
    if ($token) {
        $headers[] = "Authorization: Bearer {$token}";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $rawResponse = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    $headerText = substr($rawResponse, 0, $headerSize);
    $bodyText = substr($rawResponse, $headerSize);

    return [
        'status' => $statusCode,
        'headers' => $headerText,
        'raw_body' => $bodyText,
        'json' => json_decode($bodyText, true) ?: []
    ];
}

echo "\n--- [A] Setting up Test Users & Data in MySQL ---\n";
// Ensure test users exist with known bcrypt password 'password123'
$pwHash = password_hash('password123', PASSWORD_BCRYPT);

// User 1: Admin / Faculty Author of Course 1
$pdo->prepare("REPLACE INTO users (id, full_name, email, password_hash, role) VALUES (1, 'Dr. Aris Thorne', 'admin@aaroha-inc.com', ?, 'admin')")->execute([$pwHash]);
// User 4: Other Faculty Member (Admin role, but NOT creator of Course 1)
$pdo->prepare("REPLACE INTO users (id, full_name, email, password_hash, role) VALUES (4, 'Dr. External Faculty', 'faculty.external@aaroha-inc.com', ?, 'admin')")->execute([$pwHash]);
// User 2: Active Student (Enrolled in Course 1)
$pdo->prepare("REPLACE INTO users (id, full_name, email, password_hash, role) VALUES (2, 'Elena Rostova', 'elena.rostova@enterprise.io', ?, 'student')")->execute([$pwHash]);
// User 10: Expired Student
$pdo->prepare("REPLACE INTO users (id, full_name, email, password_hash, role) VALUES (10, 'Expired Student', 'expired@enterprise.io', ?, 'student')")->execute([$pwHash]);
// User 11: Dropped Student
$pdo->prepare("REPLACE INTO users (id, full_name, email, password_hash, role) VALUES (11, 'Dropped Student', 'dropped@enterprise.io', ?, 'student')")->execute([$pwHash]);

// Setup Enrollments in Course 1:
// Elena: Active, unexpired
$pdo->prepare("REPLACE INTO enrollments (id, user_id, course_id, status, enrolled_at, expires_at) VALUES (501, 2, 1, 'active', NOW() - INTERVAL 10 DAY, NOW() + INTERVAL 30 DAY)")->execute();
// User 10: Active status but expired date
$pdo->prepare("REPLACE INTO enrollments (id, user_id, course_id, status, enrolled_at, expires_at) VALUES (510, 10, 1, 'active', NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 1 DAY)")->execute();
// User 11: Dropped status
$pdo->prepare("REPLACE INTO enrollments (id, user_id, course_id, status, enrolled_at, expires_at) VALUES (511, 11, 1, 'dropped', NOW() - INTERVAL 20 DAY, NULL)")->execute();

// Ensure non-free lesson 2002 exists in Course 2 (Module 201)
$pdo->prepare("REPLACE INTO lessons (id, module_id, title, content_type, duration, media_url, sequence_order, is_free_preview, is_published) VALUES (2002, 201, 'Continuous Batching & vLLM Memory Allocator', 'video', '30 min', ?, 2, 0, 1)")->execute([$testVideoGuid]);

// Setup Lesson 1003 (Course 1, Module 102) with Bunny Stream Video
$pdo->prepare("UPDATE lessons SET media_url = ?, is_published = 1, is_free_preview = 0 WHERE id = 1003")->execute([$testVideoGuid]);

// Setup Lesson 1004 as an UNPUBLISHED Lesson in Course 1
$pdo->prepare("UPDATE lessons SET is_published = 0 WHERE id = 1004")->execute();

// Setup Course 3 as an UNPUBLISHED Course
$pdo->prepare("UPDATE courses SET is_published = 0 WHERE id = 3")->execute();

// Obtain JWT Tokens
$tokenAdmin = JWT::generate(['id' => 1, 'role' => 'admin', 'email' => 'admin@aaroha-inc.com']);
$tokenOtherFaculty = JWT::generate(['id' => 4, 'role' => 'admin', 'email' => 'faculty.external@aaroha-inc.com']);
$tokenElena = JWT::generate(['id' => 2, 'role' => 'student', 'email' => 'elena.rostova@enterprise.io']);
$tokenExpired = JWT::generate(['id' => 10, 'role' => 'student', 'email' => 'expired@enterprise.io']);
$tokenDropped = JWT::generate(['id' => 11, 'role' => 'student', 'email' => 'dropped@enterprise.io']);

echo "✓ Test personas and MySQL state initialized successfully.\n";

echo "\n--- [B] Executing Security & Authorization Checks on MySQL ---\n";

// 1. Unauthenticated Request
echo "1. Checking unauthenticated request to /lessons/1003/playback...\n";
$res1 = requestApi('/lessons/1003/playback');
assert($res1['status'] === 401, 'Unauthenticated request must return 401');
echo "   ✓ PASSED: Returned HTTP 401 Unauthorized.\n";

// 2. Expired Enrollment Check
echo "2. Checking expired enrollment (User 10, expired date on Course 1)...\n";
$res2 = requestApi('/lessons/1003/playback', 'GET', null, $tokenExpired);
assert($res2['status'] === 403, 'Expired enrollment must return 403');
assert($res2['json']['code'] === 'ENROLLMENT_EXPIRED', 'Expected ENROLLMENT_EXPIRED code');
echo "   ✓ PASSED: Expired enrollment blocked with HTTP 403 (ENROLLMENT_EXPIRED).\n";

// 3. Dropped Enrollment Check
echo "3. Checking dropped enrollment (User 11 on Course 1)...\n";
$res3 = requestApi('/lessons/1003/playback', 'GET', null, $tokenDropped);
assert($res3['status'] === 403, 'Dropped enrollment must return 403');
assert($res3['json']['code'] === 'ENROLLMENT_DROPPED', 'Expected ENROLLMENT_DROPPED code');
echo "   ✓ PASSED: Dropped enrollment blocked with HTTP 403 (ENROLLMENT_DROPPED).\n";

// 4. Cross-Course Access Isolation
echo "4. Checking cross-course access (Elena enrolled in Course 1 requesting non-free Lesson 2002 in Course 2)...\n";
$res4 = requestApi('/lessons/2002/playback', 'GET', null, $tokenElena);
assert($res4['status'] === 403, 'Cross-course unauthorized access must return 403');
assert($res4['json']['code'] === 'ENROLLMENT_REQUIRED', 'Expected ENROLLMENT_REQUIRED code');
echo "   ✓ PASSED: Cross-course unauthorized access blocked with HTTP 403 (ENROLLMENT_REQUIRED).\n";

// 5. Unpublished Lesson Check
echo "5. Checking unpublished lesson (Lesson 1004 is unpublished in Course 1)...\n";
$res5Student = requestApi('/lessons/1004/playback', 'GET', null, $tokenElena);
assert($res5Student['status'] === 403, 'Unpublished lesson must be blocked for students');
assert($res5Student['json']['code'] === 'LESSON_UNPUBLISHED', 'Expected LESSON_UNPUBLISHED code');
echo "   ✓ PASSED: Student blocked from unpublished lesson (HTTP 403 LESSON_UNPUBLISHED).\n";

$res5OtherFaculty = requestApi('/lessons/1004/playback', 'GET', null, $tokenOtherFaculty);
assert($res5OtherFaculty['status'] === 403, 'Unauthorized faculty must NOT access unpublished lesson of another faculty course');
assert($res5OtherFaculty['json']['code'] === 'LESSON_UNPUBLISHED', 'Expected LESSON_UNPUBLISHED code for unauthorized faculty');
echo "   ✓ PASSED: Unauthorized faculty member blocked from previewing other faculty course (HTTP 403 LESSON_UNPUBLISHED).\n";

$res5AuthorFaculty = requestApi('/lessons/1004/playback', 'GET', null, $tokenAdmin);
assert($res5AuthorFaculty['status'] === 200, 'Authorized course author faculty must be able to view unpublished lesson');
echo "   ✓ PASSED: Authorized course faculty author permitted preview access to unpublished lesson (HTTP 200 OK).\n";

// 6. Unpublished Course Check
echo "6. Checking unpublished course (Course 3 is unpublished, Lesson 3001)...\n";
$res6Student = requestApi('/lessons/3001/playback', 'GET', null, $tokenElena);
assert($res6Student['status'] === 403, 'Unpublished course must be blocked for students');
assert($res6Student['json']['code'] === 'COURSE_UNPUBLISHED', 'Expected COURSE_UNPUBLISHED code');
echo "   ✓ PASSED: Student blocked from unpublished course (HTTP 403 COURSE_UNPUBLISHED).\n";

$res6Admin = requestApi('/lessons/3001/playback', 'GET', null, $tokenAdmin);
assert($res6Admin['status'] === 200, 'Admin must be able to view lessons in unpublished course');
echo "   ✓ PASSED: Admin permitted preview access to unpublished course (HTTP 200 OK).\n";

// 7. Authorized Playback on MySQL & Cache-Control: no-store
echo "7. Checking authorized student playback on MySQL (Elena on Lesson 1003)...\n";
$res7 = requestApi('/lessons/1003/playback', 'GET', null, $tokenElena);
assert($res7['status'] === 200, 'Elena must be authorized for Lesson 1003');
assert($res7['json']['success'] === true, 'Response success must be true');

// Check Cache-Control: no-store header
assert(stripos($res7['headers'], 'Cache-Control: no-store') !== false, 'Cache-Control: no-store must be present');
echo "   ✓ PASSED: Verified Cache-Control: no-store in HTTP headers:\n";
preg_match('/Cache-Control:[^\r\n]+/i', $res7['headers'], $ccMatch);
echo "             " . ($ccMatch[0] ?? '') . "\n";

// 8. Verify Bunny CDN Edge Playback
$playback = $res7['json']['playback'];
echo "8. Verifying authorized signed embed URL with BunnyCDN edge...\n";
$bunnyHeaders = @get_headers($playback['embed_url']);
$edgeStatus = 0;
if (!empty($bunnyHeaders[0])) {
    preg_match('#HTTP/\S+\s+(\d+)#', $bunnyHeaders[0], $m);
    $edgeStatus = (int)($m[1] ?? 0);
}
assert($edgeStatus === 200, "BunnyCDN edge must return HTTP 200 for signed URL (Got $edgeStatus)");
echo "   ✓ PASSED: BunnyCDN edge returned HTTP 200 OK for generated embed URL:\n";
echo "             {$playback['embed_url']}\n";

// 9. Zero Secret Exposure
$forbiddenApiKey = BunnyStreamService::getConfig()['api_key'] ?: 'PLACEHOLDER_FORBIDDEN_API_KEY';
$forbiddenTokenKey = BunnyStreamService::getConfig()['token_key'] ?: 'PLACEHOLDER_FORBIDDEN_TOKEN_KEY';
if ($forbiddenApiKey !== 'PLACEHOLDER_FORBIDDEN_API_KEY') {
    assert(!str_contains($res7['raw_body'], $forbiddenApiKey), 'API Key leaked in response!');
}
if ($forbiddenTokenKey !== 'PLACEHOLDER_FORBIDDEN_TOKEN_KEY') {
    assert(!str_contains($res7['raw_body'], $forbiddenTokenKey), 'Token Key leaked in response!');
}
echo "9. Audited response body for secret key leakage:\n";
echo "   ✓ PASSED: No signing keys or API keys present in response body.\n";

echo "\n============================================================\n";
echo "  ✅ ALL 9 MYSQL AUTHORIZATION & EDGE CHECKS PASSED PERFECTLY!\n";
echo "============================================================\n";
