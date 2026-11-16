<?php
// Aaroha LMS - Comprehensive Management Actions Audit & Lifecycle Verification
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/AdminPortalController.php';
require_once __DIR__ . '/../controllers/CourseController.php';
require_once __DIR__ . '/../controllers/CertificateController.php';
require_once __DIR__ . '/../controllers/AuthController.php';

function assertCondition($description, $condition) {
    if ($condition) {
        echo "[PASS] {$description}\n";
    } else {
        echo "[FAIL] {$description}\n";
        debug_print_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        exit(1);
    }
}

echo "============================================================\n";
echo "AAROHA LMS - MANAGEMENT ACTIONS & LIFECYCLE AUDIT TEST\n";
echo "============================================================\n\n";

$pdo = Database::getConnection();
$adminActor = [
    'id' => 1,
    'full_name' => 'System Super Admin',
    'email' => 'admin@aaroha-inc.com',
    'role' => 'super_admin'
];

// =============================================================
// 1. STUDENT LIFECYCLE, MULTI-ROLE & SAFE DELETION
// =============================================================
echo "--- 1. Student Lifecycle, Multi-Role & Deletion Guardrails ---\n";

// Create test student 1 (with records)
$testEmail1 = 'audit.student1.' . time() . '@aaroha.test';
$uniqueMobile1 = '98' . substr(strval(time()), -8);
$s1Res = AdminPortalController::createStudent([
    'full_name' => 'Audit Test Student One',
    'email' => $testEmail1,
    'mobile' => $uniqueMobile1,
    'education' => 'B.Tech CS',
    'experience_years' => '1'
], $adminActor);
assertCondition("Student 1 created", $s1Res['success'] && !empty($s1Res['student_id']));
$s1Id = $s1Res['student_id'];

// 1.1 Update profile
$updRes = AdminPortalController::updateStudentProfile($s1Id, [
    'full_name' => 'Audit Test Student One Updated',
    'email' => $testEmail1,
    'mobile' => $uniqueMobile1,
    'education' => 'M.Tech AI',
    'experience_years' => '2',
    'internal_notes' => 'Executive audit verified profile'
], $adminActor);
assertCondition("Student profile updated", $updRes['success']);

// 1.2 Enroll student in course 1
$enrRes = AdminPortalController::enrollStudentCourse($s1Id, [
    'course_id' => 1,
    'batch_id' => 1
], $adminActor);
assertCondition("Student enrolled in course 1 batch 1", $enrRes['success']);

// 1.3 Add an attendance record to create a real academic dependency
$enrId = (int)$pdo->query("SELECT id FROM enrollments WHERE user_id = {$s1Id} LIMIT 1")->fetchColumn();
$pdo->prepare("
    INSERT INTO attendance_records (session_id, enrollment_id, user_id, status, marked_by, marked_at)
    VALUES (1, ?, ?, 'present', 1, CURRENT_TIMESTAMP)
")->execute([$enrId, $s1Id]);

// 1.4 Check deletion eligibility - MUST BE FALSE because of attendance record!
$elig1 = AdminPortalController::checkStudentDeletionEligibility($s1Id);
assertCondition("Deletion check identifies retained records", !$elig1['eligible']);
assertCondition("Attendance count reported accurately", $elig1['attendance_count'] >= 1);
assertCondition("Recommendation provides archive alternative", !empty($elig1['recommendation']));

// 1.5 Attempt hard delete - MUST BE REJECTED!
$delFailRes = AdminPortalController::deleteStudent($s1Id, $adminActor);
assertCondition("Hard delete rejected due to retained academic history", !$delFailRes['success']);

// 1.6 Withdraw from enrolment
$withRes = AdminPortalController::withdrawStudentEnrollment($s1Id, [
    'withdrawal_reason' => 'Relocated for employment'
], $adminActor);
assertCondition("Withdrawal from enrolment succeeded", $withRes['success']);

// Check user account still exists and historical records intact
$chkUser = $pdo->query("SELECT id FROM users WHERE id = {$s1Id}")->fetch();
assertCondition("User account preserved after withdrawal", !empty($chkUser));
$attChk = $pdo->query("SELECT COUNT(*) FROM attendance_records WHERE user_id = {$s1Id}")->fetchColumn();
assertCondition("Attendance records strictly preserved after withdrawal", $attChk >= 1);

// 1.7 Deactivate Account
$deactRes = AdminPortalController::deactivateStudentAccount($s1Id, [
    'reason' => 'Administrative pause'
], $adminActor);
assertCondition("Student account deactivated", $deactRes['success']);

// Verify user table and profile table status
$uStat = $pdo->query("SELECT status, deactivated_at FROM users WHERE id = {$s1Id}")->fetch();
assertCondition("User status updated to deactivated", $uStat['status'] === 'deactivated' && !empty($uStat['deactivated_at']));

// 1.8 Reactivate Account
$reactRes = AdminPortalController::reactivateStudentAccount($s1Id, $adminActor);
assertCondition("Student account reactivated", $reactRes['success']);
$uStat2 = $pdo->query("SELECT status FROM users WHERE id = {$s1Id}")->fetch();
assertCondition("User status restored to active", $uStat2['status'] === 'active');

// 1.9 Archive Student
$archRes = AdminPortalController::archiveStudent($s1Id, [
    'archival_reason' => 'Term complete',
    'enrolment_resolution' => 'retain_history'
], $adminActor);
assertCondition("Student archived", $archRes['success']);

// Verify exclusion from default getStudents view
$defStudents = AdminPortalController::getStudents(['view' => 'active']);
$foundInActive = false;
foreach ($defStudents['students'] as $s) {
    if ((int)$s['user_id'] === $s1Id) $foundInActive = true;
}
assertCondition("Archived student excluded from default active list", !$foundInActive);

// Verify inclusion in archived view
$archStudents = AdminPortalController::getStudents(['view' => 'archived']);
$foundInArchived = false;
foreach ($archStudents['students'] as $s) {
    if ((int)$s['user_id'] === $s1Id) $foundInArchived = true;
}
assertCondition("Archived student visible in archived list", $foundInArchived);

// 1.10 Restore Student (must restore as deactivated!)
$restRes = AdminPortalController::restoreStudent($s1Id, $adminActor);
assertCondition("Student restored from archive", $restRes['success']);
$uStat3 = $pdo->query("SELECT status, is_archived FROM users WHERE id = {$s1Id}")->fetch();
assertCondition("Restored student is marked deactivated (not active login)", $uStat3['status'] === 'deactivated' && (int)$uStat3['is_archived'] === 0);

// 1.11 Eligible Student Deletion (zero history)
$testEmail2 = 'audit.unused.student.' . time() . '@aaroha.test';
$uniqueMobile2 = '97' . substr(strval(time()), -8);
$s2Res = AdminPortalController::createStudent([
    'full_name' => 'Unused Test Fellow',
    'email' => $testEmail2,
    'mobile' => $uniqueMobile2
], $adminActor);
$s2Id = $s2Res['student_id'];

$elig2 = AdminPortalController::checkStudentDeletionEligibility($s2Id);
assertCondition("Eligible check confirms unused student can be deleted", $elig2['eligible']);
$delSuccessRes = AdminPortalController::deleteStudent($s2Id, $adminActor);
assertCondition("Unused student permanently deleted", $delSuccessRes['success'] && !$delSuccessRes['multi_role_retained']);

// 1.12 Multi-Role User: Deleting student profile preserves other roles
$multiEmail = 'multi.user.' . time() . '@aaroha.test';
$stuCode = 'STU-M-' . time();
$facCode = 'FAC-M-' . time();
$pdo->prepare("
    INSERT INTO users (full_name, email, password_hash, role, authorized_roles_json, created_at)
    VALUES ('Multi Role User', ?, 'dummy_hash', 'student', '[\"student\", \"faculty\"]', CURRENT_TIMESTAMP)
")->execute([$multiEmail]);
$multiId = (int)$pdo->lastInsertId();

$pdo->prepare("
    INSERT INTO student_profiles (user_id, student_id_code, account_status, created_at)
    VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
")->execute([$multiId, $stuCode]);
$pdo->prepare("
    INSERT INTO faculty_profiles (user_id, faculty_id_code, account_status, created_at)
    VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
")->execute([$multiId, $facCode]);

$delMultiRes = AdminPortalController::deleteStudent($multiId, $adminActor);
assertCondition("Multi-role student deletion succeeds", $delMultiRes['success']);
assertCondition("Multi-role account retained", $delMultiRes['multi_role_retained']);
assertCondition("Remaining role assigned to faculty", $delMultiRes['remaining_role'] === 'faculty');

$multiUserAfter = $pdo->query("SELECT role, authorized_roles_json, deleted_at FROM users WHERE id = {$multiId}")->fetch();
assertCondition("User account NOT deleted in database", empty($multiUserAfter['deleted_at']));
assertCondition("User role transitioned to faculty", $multiUserAfter['role'] === 'faculty');
$spChk = $pdo->query("SELECT id FROM student_profiles WHERE user_id = {$multiId}")->fetch();
assertCondition("Student profile row cleanly removed", empty($spChk));
$fpChk = $pdo->query("SELECT id FROM faculty_profiles WHERE user_id = {$multiId}")->fetch();
assertCondition("Faculty profile row preserved", !empty($fpChk));

// =============================================================
// 2. FACULTY LIFECYCLE, WORKLOAD & REASSIGNMENT
// =============================================================
echo "\n--- 2. Faculty Lifecycle, Workload & Reassignment ---\n";

// Create test faculty member
$facEmail1 = 'audit.faculty1.' . time() . '@aaroha.test';
$f1Res = AdminPortalController::createFaculty([
    'full_name' => 'Dr. Audit Faculty One',
    'email' => $facEmail1,
    'title' => 'Professor of Software Systems',
    'expertise' => 'Distributed Algorithms',
    'mobile' => '9123456789'
], $adminActor);
assertCondition("Faculty 1 created", $f1Res['success']);
$f1Id = $f1Res['faculty_id'];

// Create substitute faculty member
$facEmailSub = 'audit.substitute.' . time() . '@aaroha.test';
$fSubRes = AdminPortalController::createFaculty([
    'full_name' => 'Dr. Substitute Faculty',
    'email' => $facEmailSub,
    'title' => 'Associate Professor',
    'expertise' => 'Cloud Systems',
    'mobile' => '9123456780'
], $adminActor);
$fSubId = $fSubRes['faculty_id'];

// Assign Faculty 1 to Batch 1
$asgRes = AdminPortalController::assignFacultyBatch($f1Id, [
    'batch_id' => 1,
    'role' => 'Lead Faculty',
    'is_lead' => true
], $adminActor);
assertCondition("Faculty 1 assigned to Batch 1", $asgRes['success']);

// Schedule a future class session for Faculty 1
$futureTime = date('Y-m-d H:i:s', strtotime('+2 days'));
$futureEndTime = date('Y-m-d H:i:s', strtotime('+2 days +2 hours'));
$pdo->prepare("
    INSERT INTO class_sessions (batch_id, faculty_id, topic, start_time, end_time, status, created_at)
    VALUES (1, ?, 'Upcoming Lecture on Paxos', ?, ?, 'scheduled', CURRENT_TIMESTAMP)
")->execute([$f1Id, $futureTime, $futureEndTime]);
$futureSessionId = (int)$pdo->lastInsertId();

// 2.1 Inspect Faculty Workload
$workload = AdminPortalController::getFacultyWorkload($f1Id);
assertCondition("Workload inspects upcoming sessions", $workload['upcoming_count'] >= 1);
assertCondition("Workload lists available substitutes", count($workload['available_substitutes']) >= 1);

// 2.2 Deactivate Faculty with Reassignment to Substitute
$deactFacRes = AdminPortalController::deactivateFacultyAccount($f1Id, [
    'reassignment_option' => 'reassign',
    'substitute_faculty_id' => $fSubId,
    'reason' => 'Sabbatical leave'
], $adminActor);
assertCondition("Faculty deactivated with workload reassign", $deactFacRes['success']);

// Verify the future session has been transferred to substitute faculty
$csAfter = $pdo->query("SELECT faculty_id FROM class_sessions WHERE id = {$futureSessionId}")->fetch();
assertCondition("Future class session successfully reassigned to substitute", (int)$csAfter['faculty_id'] === $fSubId);

// 2.3 Reactivate Faculty
$reactFacRes = AdminPortalController::reactivateFacultyAccount($f1Id, $adminActor);
assertCondition("Faculty reactivated", $reactFacRes['success']);

// 2.4 Archive Faculty with unassign option
$archFacRes = AdminPortalController::archiveFaculty($f1Id, [
    'reassignment_option' => 'unassign',
    'reason' => 'Term completed'
], $adminActor);
assertCondition("Faculty archived", $archFacRes['success']);

// Verify exclusion from default getFaculty view
$defFaculty = AdminPortalController::getFaculty(['view' => 'active']);
$foundFacInActive = false;
foreach ($defFaculty['faculty'] as $f) {
    if ((int)$f['user_id'] === $f1Id) $foundFacInActive = true;
}
assertCondition("Archived faculty excluded from default active list", !$foundFacInActive);

// 2.5 Restore Faculty (must restore as deactivated)
$restFacRes = AdminPortalController::restoreFaculty($f1Id, $adminActor);
assertCondition("Faculty restored", $restFacRes['success']);
$fStat = $pdo->query("SELECT status, is_archived FROM users WHERE id = {$f1Id}")->fetch();
assertCondition("Restored faculty is deactivated and unarchived", $fStat['status'] === 'deactivated' && (int)$fStat['is_archived'] === 0);

// =============================================================
// 3. BATCHES MANAGEMENT & ROSTER CONTROLS
// =============================================================
echo "\n--- 3. Batches Management & Roster Controls ---\n";

$bCode = 'AUDIT-' . time();
$batchCreateRes = AdminPortalController::createBatch([
    'course_id' => 1,
    'batch_code' => $bCode,
    'title' => 'Audit Test Cohort',
    'start_date' => '2026-12-01',
    'end_date' => '2027-04-30',
    'capacity' => 25,
    'delivery_mode' => 'Online Live'
], $adminActor);
assertCondition("Test batch created", $batchCreateRes['success']);
$testBatchId = $batchCreateRes['batch_id'];

// 3.1 Update batch
$updBRes = AdminPortalController::updateBatch($testBatchId, [
    'title' => 'Audit Test Cohort Revised',
    'batch_code' => $bCode,
    'start_date' => '2026-12-01',
    'end_date' => '2027-05-15',
    'capacity' => 35,
    'delivery_mode' => 'Hybrid Classroom',
    'status' => 'upcoming'
], $adminActor);
assertCondition("Batch updated", $updBRes['success']);

// 3.2 Add student to batch
$addStuRes = AdminPortalController::addBatchStudent($testBatchId, [
    'user_id' => $s1Id
], $adminActor);
if (!$addStuRes['success']) {
    print_r($addStuRes);
}
assertCondition("Student added to batch", $addStuRes['success']);

// 3.3 Inspect batch students
$bStudents = AdminPortalController::getBatchStudents($testBatchId);
assertCondition("Batch student roster returned", count($bStudents['students']) >= 1);

// 3.4 Withdraw student from batch
$withStuRes = AdminPortalController::withdrawBatchStudent($testBatchId, $s1Id, [
    'reason' => 'Transferring to another cohort'
], $adminActor);
assertCondition("Student withdrawn from cohort batch", $withStuRes['success']);

// 3.5 Archive and Restore batch
$archBRes = AdminPortalController::archiveBatch($testBatchId, $adminActor);
assertCondition("Batch archived", $archBRes['success']);
$restBRes = AdminPortalController::restoreBatch($testBatchId, $adminActor);
assertCondition("Batch restored", $restBRes['success']);

// =============================================================
// 4. SUPPORT TICKETS REAL-TIME THREAD & TRIAGE
// =============================================================
echo "\n--- 4. Support Tickets Real-Time Thread & Triage ---\n";

// Get ticket 1 thread
$thread = AdminPortalController::getTicketThread(1);
assertCondition("Ticket thread retrieved", $thread['success'] && !empty($thread['ticket']));
assertCondition("Ticket messages loaded", count($thread['messages']) >= 1);

// Post public reply to student
$repRes = AdminPortalController::replySupportTicket(1, [
    'message' => 'We verified your system and updated the configuration.',
    'is_internal_note' => 0
], $adminActor);
assertCondition("Student reply dispatched", $repRes['success']);

// Post internal staff note
$noteRes = AdminPortalController::replySupportTicket(1, [
    'message' => 'Staff audit confirmed memory allocation fixed.',
    'is_internal_note' => 1
], $adminActor);
assertCondition("Internal staff note logged", $noteRes['success']);

// Update ticket status
$statRes = AdminPortalController::updateTicketStatus(1, ['status' => 'resolved'], $adminActor);
assertCondition("Ticket status updated to resolved", $statRes['success']);

// =============================================================
// 5. CERTIFICATE REISSUE
// =============================================================
echo "\n--- 5. Certificate Reissue ---\n";

$reissueRes = CertificateController::reissueCertificate(1, [
    'reissue_reason' => 'Legal name correction requested by graduate',
    'recipient_name' => 'Verified Student Alumnus',
    'grade' => 'Highest Executive Distinction'
], $adminActor);
assertCondition("Certificate reissued", $reissueRes['success']);
assertCondition("New certificate code generated", !empty($reissueRes['certificate']['certificate_code']));
assertCondition("Previous certificate code preserved", !empty($reissueRes['certificate']['previous_certificate_code']));

// =============================================================
// 6. COURSE RESTORE & TASK STATUS
// =============================================================
echo "\n--- 6. Course Restore & Task Status ---\n";

// Delete course 2 temporarily then restore it
$delCourseRes = CourseController::deleteCourse(2, 1, 'admin');
$restCourseRes = CourseController::restoreCourse(2, 1, 'admin');
assertCondition("Course restored from archive", $restCourseRes['success']);

// Close task with closure reason
$testTaskId = (int)$pdo->query("SELECT id FROM tasks WHERE is_deleted = 0 LIMIT 1")->fetchColumn();
$closeTaskRes = CourseController::toggleTaskStatus($testTaskId, [
    'status' => 'closed',
    'closure_reason' => 'Submission deadline elapsed'
], 1, 'admin');
if (!$closeTaskRes['success']) {
    print_r($closeTaskRes);
}
assertCondition("Task status changed to closed", $closeTaskRes['success'] && $closeTaskRes['status'] === 'closed');

// Reopen task
$reopenTaskRes = CourseController::toggleTaskStatus($testTaskId, [
    'status' => 'published'
], 1, 'admin');
assertCondition("Task reopened to published", $reopenTaskRes['success'] && $reopenTaskRes['status'] === 'published');

echo "\n============================================================\n";
echo "ALL MANAGEMENT ACTIONS & LIFECYCLE AUDIT TESTS PASSED!\n";
echo "============================================================\n";
