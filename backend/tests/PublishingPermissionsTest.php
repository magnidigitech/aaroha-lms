<?php
// Aaroha LMS - Content Ownership, Publishing Permissions & Audience Rules Verification Test Suite
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/PublishingController.php';
require_once __DIR__ . '/../controllers/DashboardController.php';

function assertTest($name, $condition, $details = '') {
    if ($condition) {
        echo "[PASS] " . $name . ($details ? " (" . $details . ")" : "") . PHP_EOL;
    } else {
        echo "[FAIL] " . $name . ($details ? " (" . $details . ")" : "") . PHP_EOL;
        exit(1);
    }
}

echo "============================================================" . PHP_EOL;
echo "AAROHA LMS - PUBLISHING PERMISSIONS & AUDIENCE ENFORCEMENT" . PHP_EOL;
echo "============================================================" . PHP_EOL;

$pdo = Database::getConnection();

// Test Actors
$admin = ['id' => 1, 'role' => 'super_admin', 'email' => 'admin@aaroha-inc.com'];
$facultyElena = ['id' => 2, 'role' => 'faculty', 'email' => 'elena.rostova@enterprise.io'];
$studentAarav = ['id' => 7, 'role' => 'student', 'email' => 'aarav.patel@student.aaroha-inc.com']; // Enrolled in course 1, batch 1
$studentUnenrolled = ['id' => 99, 'role' => 'student', 'email' => 'stranger@nowhere.com']; // Not enrolled in course 1

// -------------------------------------------------------------
// 1. SEPARATE PUBLISHING DESTINATIONS & DEFAULTS
// -------------------------------------------------------------
echo PHP_EOL . "--- 1. Separate Publishing Destinations & Defaults ---" . PHP_EOL;

// Default destination must be private_lms
$matRes = PublishingController::createMaterial([
    'title' => 'Core Go Concurrency Internals',
    'course_id' => 1,
    'batch_id' => 1,
    'description' => 'Goroutines and channel multiplexing deep-dive.'
], $facultyElena);

assertTest("New learning material created", $matRes['success'] === true);
assertTest("Default destination is private_lms", $matRes['destination'] === 'private_lms');
$createdMatId = $matRes['material_id'];

// -------------------------------------------------------------
// 2. FACULTY PERMISSIONS & PUBLIC SUBMISSION WORKFLOW
// -------------------------------------------------------------
echo PHP_EOL . "--- 2. Faculty Permissions & Public Submission Workflow ---" . PHP_EOL;

// Faculty attempting to publish directly to public_website MUST be intercepted and set to pending_review
$facultyPublicMat = PublishingController::createMaterial([
    'title' => 'Public Architectural Pattern: Consensus in the Cloud',
    'course_id' => 1,
    'destination' => 'public_website',
    'description' => 'Whitepaper on consensus systems.'
], $facultyElena);

assertTest("Faculty public material creation intercepted", $facultyPublicMat['success'] === true);
assertTest("Faculty public material status is pending_review", $facultyPublicMat['status'] === 'pending_review');
assertTest("Faculty public material approval_status is pending_review", $facultyPublicMat['approval_status'] === 'pending_review');
$pendingMatId = $facultyPublicMat['material_id'];

// Faculty submitting public article for review
$articleSub = PublishingController::createPublicSubmission([
    'title' => 'Fault-Tolerant Consensus with Raft in Distributed Go',
    'content_type' => 'article',
    'summary' => 'Deep dive into Raft consensus.',
    'body' => 'In this article, we construct a replicated state machine...',
    'consent_given' => 1
], $facultyElena);

assertTest("Faculty public submission created", $articleSub['success'] === true);
assertTest("Article submission status is pending_review", $articleSub['status'] === 'pending_review');
$articleId = $articleSub['id'];

// -------------------------------------------------------------
// 3. ADMIN REVIEW WORKFLOW (APPROVE, REQUEST CHANGES, REJECT)
// -------------------------------------------------------------
echo PHP_EOL . "--- 3. Admin Review Workflow ---" . PHP_EOL;

// Non-admin attempting to approve must fail
$unauthReview = PublishingController::adminReviewPublicContent(
    'public_website_content',
    $articleId,
    'approve',
    'Looks good',
    $facultyElena
);
assertTest("Faculty cannot self-approve public submissions", $unauthReview['success'] === false);

// Admin approves public article
$adminApproval = PublishingController::adminReviewPublicContent(
    'public_website_content',
    $articleId,
    'approve',
    'High quality technical breakdown. Approved for Aaroha public engineering blog.',
    $admin
);
assertTest("Admin can approve public submission", $adminApproval['success'] === true);

// Verify article is now published
$chkStmt = $pdo->prepare("SELECT status, approval_status, reviewed_by FROM public_website_content WHERE id = ?");
$chkStmt->execute([$articleId]);
$artRow = $chkStmt->fetch();
assertTest("Approved article is published", $artRow['status'] === 'published');
assertTest("Approved article approval_status is approved", $artRow['approval_status'] === 'approved');
assertTest("Reviewer ID matches admin", (int)$artRow['reviewed_by'] === 1);

// -------------------------------------------------------------
// 4. VERSION MANAGEMENT & LIVE CONTENT PRESERVATION
// -------------------------------------------------------------
echo PHP_EOL . "--- 4. Version Management & Live Content Preservation ---" . PHP_EOL;

// Editing an approved public item by faculty must NOT immediately change the live content
$revisionEdit = PublishingController::updateMaterial($createdMatId, [
    'title' => 'REVISED TITLE: Goroutines Advanced Internals',
    'destination' => 'public_website',
    'notify_audience' => 0
], $facultyElena);

// If an approved public item is edited, the live version must be preserved in live_version_data
$chkMat = $pdo->prepare("SELECT * FROM learning_materials WHERE id = ?");
$chkMat->execute([$createdMatId]);
$mRow = $chkMat->fetch();

assertTest("Material update processed", $revisionEdit['success'] === true);
// Revision requires review
assertTest("Revision approval_status is pending_review", $mRow['approval_status'] === 'pending_review');

// -------------------------------------------------------------
// 5. AUDIENCE SELECTION & RECIPIENT COUNT CALCULATION
// -------------------------------------------------------------
echo PHP_EOL . "--- 5. Audience Selection & Recipient Count ---" . PHP_EOL;

// Admin calculating all_students count
$audAllStudents = PublishingController::getAudienceCount('all_students', null, $admin);
assertTest("Admin can target all students", $audAllStudents['success'] === true);
assertTest("All students recipient count > 0", $audAllStudents['recipient_count'] > 0);

// Faculty calculating all_students count MUST be rejected
$facultyAudAll = PublishingController::getAudienceCount('all_students', null, $facultyElena);
assertTest("Faculty cannot target all students", $facultyAudAll['success'] === false);

// Faculty calculating assigned batch count
$facultyAudBatch = PublishingController::getAudienceCount('batch_enrolled', 1, $facultyElena);
assertTest("Faculty can target assigned batch", $facultyAudBatch['success'] === true);
assertTest("Batch recipient count is calculated", $facultyAudBatch['recipient_count'] > 0);

// Faculty calculating unassigned batch count MUST be rejected
$facultyAudUnassigned = PublishingController::getAudienceCount('batch_enrolled', 999, $facultyElena);
assertTest("Faculty cannot target unassigned batch", $facultyAudUnassigned['success'] === false);

// -------------------------------------------------------------
// 6. SERVER-SIDE AUDIENCE ENFORCEMENT & SECURE DOWNLOADS
// -------------------------------------------------------------
echo PHP_EOL . "--- 6. Server-Side Audience Enforcement & File Access ---" . PHP_EOL;

// Create a private LMS material for batch 1
$batchMat = PublishingController::createMaterial([
    'title' => 'Batch 1 Exclusive Lab Architecture Guide',
    'course_id' => 1,
    'batch_id' => 1,
    'audience_type' => 'batch_enrolled',
    'audience_id' => 1,
    'destination' => 'private_lms',
    'file_url' => '/secure/batch1_lab.pdf',
    'status' => 'published'
], $admin);
$batchMatId = $batchMat['material_id'];

// Enrolled student in batch 1 (Aarav, id: 7) accesses material
$dlAarav = PublishingController::secureDownloadMaterial($batchMatId, $studentAarav);
assertTest("Enrolled student can access material", $dlAarav['success'] === true);
assertTest("File URL returned for enrolled student", $dlAarav['file_url'] === '/secure/batch1_lab.pdf');

// Unenrolled student attempts to access material
$dlStranger = PublishingController::secureDownloadMaterial($batchMatId, $studentUnenrolled);
assertTest("Unenrolled student denied access (403)", $dlStranger['success'] === false);

// Guest / Unauthenticated user attempts to access private LMS material
$dlGuest = PublishingController::secureDownloadMaterial($batchMatId, ['role' => 'guest']);
assertTest("Guest denied access to private LMS content (401)", $dlGuest['success'] === false);

// -------------------------------------------------------------
// 7. SCHEDULED PUBLISHING WORKFLOW
// -------------------------------------------------------------
echo PHP_EOL . "--- 7. Scheduled Publishing Workflow ---" . PHP_EOL;

$futureTime = date('Y-m-d H:i:s', time() + 86400 * 5); // 5 days in future
$schedMat = PublishingController::createMaterial([
    'title' => 'Upcoming Midterm Exam Prep Materials',
    'course_id' => 1,
    'batch_id' => 1,
    'destination' => 'private_lms',
    'status' => 'scheduled',
    'scheduled_release_at' => $futureTime,
    'file_url' => '/secure/midterm_prep.pdf'
], $admin);
$schedMatId = $schedMat['material_id'];

// Enrolled student attempts to access scheduled material before release
$dlScheduled = PublishingController::secureDownloadMaterial($schedMatId, $studentAarav);
assertTest("Student cannot access scheduled material before release time", $dlScheduled['success'] === false);

// -------------------------------------------------------------
// 8. PUBLIC WEBSITE API SANITIZATION (NO PRIVATE LEAKS)
// -------------------------------------------------------------
echo PHP_EOL . "--- 8. Public Website API Sanitization ---" . PHP_EOL;

$publicData = PublishingController::getPublicWebsiteContent('all');
assertTest("Public content endpoint succeeds", $publicData['success'] === true);
assertTest("Public courses listed", count($publicData['courses']) >= 1);
assertTest("Public showcases listed", count($publicData['project_showcases']) >= 1);

// Verify NO meeting links, recordings or student rosters in public course listings
$courseItem = $publicData['courses'][0];
assertTest("No meeting links in public course overview", !isset($courseItem['meeting_link']));
assertTest("No student roster in public course overview", !isset($courseItem['students']));
assertTest("No internal notes in public course overview", !isset($courseItem['internal_notes']));

// Verify public showcases only contain approved items
foreach ($publicData['project_showcases'] as $sc) {
    assertTest("Public showcase contains author name", !empty($sc['author_name']));
    assertTest("Public showcase does not leak student email or phone", !isset($sc['author_phone']) && !isset($sc['author_email']));
}

// -------------------------------------------------------------
// 9. DECOUPLED NOTIFICATIONS & MINOR EDIT PRESERVATION
// -------------------------------------------------------------
echo PHP_EOL . "--- 9. Decoupled Notifications & Minor Edits ---" . PHP_EOL;

// Create announcement with notify_audience = 1
$annWithNotif = PublishingController::createAnnouncement([
    'title' => 'Major Curriculum Update Broadcast',
    'content' => 'New distributed systems lab added.',
    'target_type' => 'course',
    'target_id' => 1,
    'notify_audience' => 1
], $admin);

assertTest("Announcement with notification queued", $annWithNotif['notification_status'] === 'queued');

// Minor edit on learning material with notify_audience = 0 does NOT queue notification
$matEditMinor = PublishingController::updateMaterial($createdMatId, [
    'title' => 'Core Go Concurrency Internals (Minor Typo Fix)',
    'notify_audience' => 0
], $admin);

$chkNotif = $pdo->prepare("SELECT notification_status FROM learning_materials WHERE id = ?");
$chkNotif->execute([$createdMatId]);
$matNotifStatus = $chkNotif->fetchColumn();
assertTest("Minor edit does not re-queue notifications", $matNotifStatus !== 'queued');

// -------------------------------------------------------------
// 10. ADMIN PUBLISHING QUEUES
// -------------------------------------------------------------
echo PHP_EOL . "--- 10. Admin Publishing Queues ---" . PHP_EOL;

$queues = PublishingController::getAdminPublishingQueues($admin);
assertTest("Publishing queues returned", $queues['success'] === true);
assertTest("Pending approval queue present", isset($queues['summary']['pending_approval_count']));
assertTest("Scheduled publications queue present", isset($queues['summary']['scheduled_count']));

// -------------------------------------------------------------
// 11. AUDIT LOGGING VERIFICATION
// -------------------------------------------------------------
echo PHP_EOL . "--- 11. Audit Logging Verification ---" . PHP_EOL;

$auditLogs = $pdo->query("SELECT action, entity_type FROM audit_logs WHERE action IN ('CREATE_LEARNING_MATERIAL', 'REVIEW_PUBLIC_CONTENT', 'CREATE_ANNOUNCEMENT')")->fetchAll();
assertTest("Publishing actions recorded in audit log", count($auditLogs) >= 3);

echo PHP_EOL . "============================================================" . PHP_EOL;
echo "ALL PUBLISHING PERMISSIONS & AUDIENCE RULES VERIFIED!" . PHP_EOL;
echo "============================================================" . PHP_EOL;
