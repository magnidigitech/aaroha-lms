<?php
// Aaroha LMS - Curriculum CRUD & Relational Authorization Test Suite
// Verifies Course, Module, Lesson, and Task updates, safe deletion, Bunny Video ID validation,
// and relational ownership authorization against native MySQL.

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/CourseController.php';
require_once __DIR__ . '/../controllers/PlaybackController.php';

echo "=== Curriculum CRUD & Relational Authorization Test ===\n";

$pdo = Database::getConnection();

// Personas:
// User 1: Admin / Faculty Owner (admin@aaroha-inc.com)
// User 2: Student Elena (elena.rostova@enterprise.io)
// User 4: Faculty External (faculty.external@aaroha-inc.com, admin role but does NOT own Course 1)

$owner = ['id' => 1, 'role' => 'admin', 'email' => 'admin@aaroha-inc.com'];
$student = ['id' => 2, 'role' => 'student', 'email' => 'elena.rostova@enterprise.io'];
$otherFaculty = ['id' => 4, 'role' => 'admin', 'email' => 'faculty.external@aaroha-inc.com'];

// -------------------------------------------------------------
// 1. Course Update & Relational Permission Check
// -------------------------------------------------------------
echo "\n[1] Testing Course Update & Ownership Enforcement...\n";

// Student attempts to update Course 1 -> Must be 403
$studUpdate = CourseController::updateCourse(1, ['title' => 'Hacked Title'], 2, 'student');
assert($studUpdate['success'] === false, 'Student must not update course');
echo "  ✓ Student update rejected with 403\n";

// Other faculty attempts to update Course 1 (owned by User 1) -> Must be 403
$otherUpdate = CourseController::updateCourse(1, ['title' => 'Other Title'], 4, 'admin');
assert($otherUpdate['success'] === false, 'Other faculty must not update Course 1');
echo "  ✓ Other faculty update rejected with 403\n";

// Owner updates Course 1
$ownerUpdate = CourseController::updateCourse(1, [
    'title' => 'Distributed Cloud Architecture & High-Throughput Systems (Updated)',
    'category' => 'Cloud Architecture',
    'level' => 'Advanced Level',
    'duration' => '10 Weeks',
    'is_published' => 1
], 1, 'admin');
assert($ownerUpdate['success'] === true, 'Owner course update must succeed');
assert($ownerUpdate['course']['title'] === 'Distributed Cloud Architecture & High-Throughput Systems (Updated)');
echo "  ✓ Owner course update succeeded and persisted\n";

// -------------------------------------------------------------
// 2. Module Update & Relational Permission Check
// -------------------------------------------------------------
echo "\n[2] Testing Module Update & Ownership Enforcement...\n";

// Module 101 belongs to Course 1 (owned by User 1)
$otherModUpdate = CourseController::updateModule(101, ['title' => 'Unauthorized Module'], 4, 'admin');
assert($otherModUpdate['success'] === false, 'Other faculty must not update Module 101');
echo "  ✓ Other faculty module update rejected with 403\n";

$ownerModUpdate = CourseController::updateModule(101, [
    'title' => 'Module 1: Global Edge Routing & Resilient Mesh Networks (Updated)',
    'estimated_time' => '6 hours to complete'
], 1, 'admin');
assert($ownerModUpdate['success'] === true, 'Owner module update must succeed');
echo "  ✓ Owner module update succeeded\n";

// -------------------------------------------------------------
// 3. Lesson Update & Bunny Stream Video ID Validation
// -------------------------------------------------------------
echo "\n[3] Testing Lesson Update & Bunny Stream Video ID Validation...\n";

// Test 3a: Invalid Bunny Video ID (not a UUID)
$invalidBunnyUpdate = CourseController::updateLesson(1003, [
    'title' => 'Raft Consensus Protocol (Updated)',
    'content_type' => 'video',
    'video_provider' => 'bunny_stream',
    'media_url' => 'invalid-uuid-format',
    'duration' => '25 min'
], 1, 'admin');
assert($invalidBunnyUpdate['success'] === false, 'Invalid Bunny GUID must be rejected');
assert(str_contains($invalidBunnyUpdate['error'], '36-character UUID'), 'Error message must specify 36-character UUID');
echo "  ✓ Invalid Bunny Video ID format rejected with clear error\n";

// Test 3b: Valid Bunny Video ID
$validBunnyGuid = '0de41d3a-4d1d-498b-b731-bcc31a59ffc2';
$validBunnyUpdate = CourseController::updateLesson(1003, [
    'title' => 'Raft Consensus Protocol & Split-Brain Mitigation (Bunny Stream Updated)',
    'content_type' => 'video',
    'video_provider' => 'bunny_stream',
    'media_url' => $validBunnyGuid,
    'duration' => '25 min',
    'is_free_preview' => 0,
    'is_published' => 1
], 1, 'admin');
assert($validBunnyUpdate['success'] === true, 'Valid Bunny GUID update must succeed');
assert($validBunnyUpdate['lesson']['media_url'] === $validBunnyGuid);
assert($validBunnyUpdate['lesson']['video_provider'] === 'bunny_stream');
echo "  ✓ Valid Bunny Video ID update succeeded with provider and GUID stored\n";

// Test 3c: Changing to YouTube provider
$ytUpdate = CourseController::updateLesson(1001, [
    'title' => 'Multi-Region Anycast Topology (Updated)',
    'content_type' => 'video',
    'video_provider' => 'youtube',
    'media_url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'duration' => '18 min',
    'is_free_preview' => 1,
    'is_published' => 1
], 1, 'admin');
assert($ytUpdate['success'] === true, 'YouTube update must succeed');
echo "  ✓ Other video provider (YouTube) update succeeded\n";

// -------------------------------------------------------------
// 4. Task / Assignment Update & Relational Permission Check
// -------------------------------------------------------------
echo "\n[4] Testing Assignment Update & Ownership Enforcement...\n";

// Task 2001 belongs to Module 101 / Course 1
$otherTaskUpdate = CourseController::updateTask(2001, ['title' => 'Hacked Task', 'instructions' => 'None'], 4, 'admin');
assert($otherTaskUpdate['success'] === false, 'Other faculty must not update Task 2001');
echo "  ✓ Other faculty task update rejected with 403\n";

$ownerTaskUpdate = CourseController::updateTask(2001, [
    'title' => 'BGP Route Optimization Lab (Updated)',
    'instructions' => 'Configure anycast routing policies with BGP community tags.',
    'task_type' => 'text_response',
    'max_score' => 100,
    'passing_score' => 80
], 1, 'admin');
assert($ownerTaskUpdate['success'] === true, 'Owner task update must succeed');
echo "  ✓ Owner assignment update succeeded\n";

// -------------------------------------------------------------
// 5. Safe Soft Deletion & Playback Exclusion
// -------------------------------------------------------------
echo "\n[5] Testing Safe Soft Deletion & Student Access Exclusion...\n";

// Create temporary lesson to test lecture deletion
$tmpLesson = CourseController::createLesson(101, [
    'title' => 'Temporary Deprecated Lecture',
    'content_type' => 'video',
    'video_provider' => 'bunny_stream',
    'media_url' => $validBunnyGuid,
    'duration' => '5 min',
    'is_free_preview' => 0,
    'is_published' => 1
], 1, 'admin');
assert($tmpLesson['success'] === true);
$tmpLessonId = $tmpLesson['lesson_id'];
echo "  ✓ Created temporary lecture (ID $tmpLessonId)\n";

// Check playback BEFORE deletion -> must succeed for Elena (enrolled)
$pbBefore = PlaybackController::getPlaybackSession($tmpLessonId, $student);
assert($pbBefore['success'] === true, 'Playback must succeed before deletion');
echo "  ✓ Playback authorized before deletion\n";

// Delete lecture
$delLesson = CourseController::deleteLesson($tmpLessonId, 1, 'admin');
assert($delLesson['success'] === true, 'Delete lesson must succeed');
echo "  ✓ Lecture archived (soft-deleted)\n";

// Check playback AFTER deletion -> must return 404 LESSON_DELETED
$pbAfter = PlaybackController::getPlaybackSession($tmpLessonId, $student);
assert($pbAfter['success'] === false, 'Playback must fail after deletion');
assert($pbAfter['code'] === 'LESSON_DELETED', 'Error code must be LESSON_DELETED');
echo "  ✓ Playback rejected for archived lecture (LESSON_DELETED)\n";

// Verify database record still exists (soft-deleted) with historical data preserved
$checkDb = $pdo->prepare("SELECT is_deleted, deleted_at FROM lessons WHERE id = ?");
$checkDb->execute([$tmpLessonId]);
$dbRow = $checkDb->fetch();
assert((int)$dbRow['is_deleted'] === 1, 'is_deleted must be 1 in DB');
assert(!empty($dbRow['deleted_at']), 'deleted_at must be populated in DB');
echo "  ✓ Verified database preserved record with is_deleted=1 and timestamp\n";

echo "\n============================================================\n";
echo "  ✅ ALL CURRICULUM CRUD & AUTHORIZATION CHECKS PASSED!\n";
echo "============================================================\n";
