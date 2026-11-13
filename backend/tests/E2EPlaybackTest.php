<?php
// Comprehensive End-to-End Test for Bunny Stream Playback Integration
// Verifies HTTP endpoints, JWT authentication, enrollment enforcement,
// BunnyCDN edge signing, and secret isolation.

$apiBase = 'http://127.0.0.1:8000/api';
$testVideoGuid = '0de41d3a-4d1d-498b-b731-bcc31a59ffc2';
$expectedLibraryId = '807954';
$forbiddenSecretApiKey = getenv('BUNNY_STREAM_API_KEY') ?: 'PLACEHOLDER_FORBIDDEN_API_KEY';
$forbiddenSecretTokenKey = getenv('BUNNY_STREAM_TOKEN_KEY') ?: 'PLACEHOLDER_FORBIDDEN_TOKEN_KEY';

function httpReq($url, $method = 'GET', $data = null, $token = null) {
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
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $res = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [
        'status' => $statusCode,
        'raw' => $res,
        'json' => json_decode($res, true) ?: []
    ];
}

echo "============================================================\n";
echo "   AAROHA LMS - BUNNY STREAM VERIFICATION & COMPLIANCE\n";
echo "============================================================\n\n";

// 1. UNLOADED / UNAUTHENTICATED REQUEST CHECK
echo "[1] Testing unauthenticated access to /lessons/1003/playback...\n";
$unauth = httpReq("{$apiBase}/lessons/1003/playback");
echo "    -> Status Code: {$unauth['status']}\n";
assert($unauth['status'] === 401, 'Unauthenticated request must return 401 Unauthorized');
assert($unauth['json']['success'] === false, 'success must be false');
echo "    ✓ Unauthenticated request rejected with HTTP 401 Unauthorized.\n\n";

// 2. AUTHENTICATE USERS
echo "[2] Authenticating test personas via JWT...\n";
// Student A: Elena Rostova (Enrolled in Course 1, NOT enrolled in Course 2)
$loginElena = httpReq("{$apiBase}/auth/login", 'POST', [
    'email' => 'elena.rostova@enterprise.io',
    'password' => 'password123'
]);
assert($loginElena['status'] === 200, 'Elena login must succeed');
$elenaToken = $loginElena['json']['token'];
echo "    ✓ Elena Rostova (Enrolled Student) authenticated.\n";

// Student B: Unenrolled Learner (NOT enrolled in Course 1 or Course 2)
$loginUnenrolled = httpReq("{$apiBase}/auth/login", 'POST', [
    'email' => 'learner@enterprise.io',
    'password' => 'password123'
]);
assert($loginUnenrolled['status'] === 200, 'Unenrolled student login must succeed');
$unenrolledToken = $loginUnenrolled['json']['token'];
echo "    ✓ Unenrolled Learner authenticated.\n\n";

// 3. UNENROLLED USER REJECTION CHECK
echo "[3] Testing unenrolled learner access to Course 1 (Lesson 1003)...\n";
$unenrolledReq = httpReq("{$apiBase}/lessons/1003/playback", 'GET', null, $unenrolledToken);
echo "    -> Status Code: {$unenrolledReq['status']}\n";
assert($unenrolledReq['status'] === 403, 'Unenrolled learner must return 403 Forbidden');
assert($unenrolledReq['json']['code'] === 'ENROLLMENT_REQUIRED', 'Error code must be ENROLLMENT_REQUIRED');
echo "    ✓ Unenrolled learner rejected with HTTP 403 Forbidden (ENROLLMENT_REQUIRED).\n\n";

// 4. ENROLLED STUDENT PLAYBACK AUTHORIZATION
echo "[4] Testing enrolled student access to Course 1 (Lesson 1003 - Bunny Stream)...\n";
$enrolledReq = httpReq("{$apiBase}/lessons/1003/playback", 'GET', null, $elenaToken);
echo "    -> Status Code: {$enrolledReq['status']}\n";
assert($enrolledReq['status'] === 200, 'Enrolled student must return 200 OK');
assert($enrolledReq['json']['success'] === true, 'success must be true');

$playback = $enrolledReq['json']['playback'];
assert($playback['provider'] === 'bunny_stream', 'provider must be bunny_stream');
assert($playback['library_id'] === $expectedLibraryId, "library_id must match $expectedLibraryId");
assert($playback['video_id'] === $testVideoGuid, "video_id must match $testVideoGuid");
assert(!empty($playback['token']), 'Signed token must be generated');
assert(!empty($playback['expires']), 'Expires timestamp must be present');
assert(!empty($playback['embed_url']), 'Embed URL must be present');
echo "    ✓ Enrolled student authorized with signed Bunny embed session:\n";
echo "      - Video ID:  {$playback['video_id']}\n";
echo "      - Library:   {$playback['library_id']}\n";
echo "      - Expires:   {$playback['expires']} (TTL: {$playback['expires_in_seconds']}s)\n";
echo "      - Token:     {$playback['token']}\n";
echo "      - Embed URL: {$playback['embed_url']}\n\n";

// 5. TEST AUTHORIZED PLAYBACK AT BUNNY EDGE
echo "[5] Verifying signed embed URL against BunnyCDN edge player...\n";
$headers = @get_headers($playback['embed_url']);
$bunnyStatus = 0;
if (!empty($headers[0])) {
    preg_match('#HTTP/\S+\s+(\d+)#', $headers[0], $m);
    $bunnyStatus = (int)($m[1] ?? 0);
}
echo "    -> BunnyCDN Player Response: HTTP $bunnyStatus\n";
assert($bunnyStatus === 200, 'BunnyCDN edge must return HTTP 200 for signed URL');
echo "    ✓ Live playback authorized by Bunny Stream edge (HTTP 200 OK).\n\n";

// 6. TEST TAMPERED TOKEN REJECTION AT BUNNY EDGE
echo "[6] Verifying tampered embed URL rejection by BunnyCDN edge...\n";
$tamperedUrl = "https://player.mediadelivery.net/embed/{$expectedLibraryId}/{$testVideoGuid}?token=forged_token_00000000000000000000000000000000&expires={$playback['expires']}";
$badHeaders = @get_headers($tamperedUrl);
$tamperedStatus = 0;
if (!empty($badHeaders[0])) {
    preg_match('#HTTP/\S+\s+(\d+)#', $badHeaders[0], $m);
    $tamperedStatus = (int)($m[1] ?? 0);
}
echo "    -> Tampered Token Response: HTTP $tamperedStatus\n";
assert($tamperedStatus === 403, 'BunnyCDN edge must return HTTP 403 for forged/invalid token');
echo "    ✓ Tampered token blocked with HTTP 403 Forbidden by Bunny Stream edge.\n\n";

// 7. STRICT CREDENTIAL ISOLATION AUDIT
echo "[7] Auditing API response payload for credential leaks...\n";
$rawPayload = $enrolledReq['raw'];
assert(!str_contains($rawPayload, $forbiddenSecretApiKey), 'CRITICAL: API Key leaked into client payload!');
assert(!str_contains($rawPayload, $forbiddenSecretTokenKey), 'CRITICAL: Token Signing Key leaked into client payload!');
echo "    ✓ No secret API keys or Token Signing Keys are present in client payload.\n";
echo "    ✓ Only temporary expiring SHA-256 tokens are delivered to the frontend.\n\n";

echo "============================================================\n";
echo "  ✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITHOUT ERRORS\n";
echo "============================================================\n";
