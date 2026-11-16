<?php
// End-to-End Test Suite for Aaroha LMS Role-Based Dashboards and Profile Settings
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/DashboardController.php';
require_once __DIR__ . '/../controllers/ProfileController.php';

function assertCondition($name, $condition, $details = '') {
    if ($condition) {
        echo "[PASS] " . $name . ($details ? " (" . $details . ")" : "") . PHP_EOL;
    } else {
        echo "[FAIL] " . $name . ($details ? " (" . $details . ")" : "") . PHP_EOL;
        exit(1);
    }
}

echo "============================================================" . PHP_EOL;
echo "AAROHA LMS - ROLE DASHBOARDS & PROFILE SETTINGS VERIFICATION" . PHP_EOL;
echo "============================================================" . PHP_EOL;

// 1. Verify Student Dashboard (Aarav Patel, id: 7)
$actorStudent = ['id' => 7, 'role' => 'student', 'email' => 'aarav.patel@student.aaroha-inc.com'];
$sRes = DashboardController::getStudentDashboard($actorStudent);
assertCondition("Student Dashboard returns success", $sRes['success'] === true);
assertCondition("Student role is student", $sRes['role'] === 'student');
assertCondition("Student summary cards present", isset($sRes['summary_cards']['active_courses']));
assertCondition("Student enrolled courses present", count($sRes['my_courses']) >= 1);
assertCondition("Attendance calculated correctly", $sRes['summary_cards']['attendance_pct'] === 100);
assertCondition("Student fees calculated", isset($sRes['summary_cards']['outstanding_fees']));
assertCondition("Student cannot see other student records", $sRes['user']['id'] === 7);

// 2. Verify Faculty Dashboard (Elena Rostova, id: 2)
$actorFaculty = ['id' => 2, 'role' => 'faculty', 'email' => 'elena.rostova@enterprise.io'];
$fRes = DashboardController::getFacultyDashboard($actorFaculty);
assertCondition("Faculty Dashboard returns success", $fRes['success'] === true);
assertCondition("Faculty role is faculty", $fRes['role'] === 'faculty');
assertCondition("Faculty has assigned batches", $fRes['summary_cards']['assigned_batches'] >= 1);
assertCondition("Faculty has classes today count", isset($fRes['summary_cards']['classes_today']));
assertCondition("Faculty cannot see student fee ledger", !isset($fRes['student_performance'][0]['net_fee']));

// 3. Verify Accounts Dashboard (Rajesh Kulkarni, id: 5)
$actorAccounts = ['id' => 5, 'role' => 'accounts', 'email' => 'accounts@aaroha-inc.com'];
$accRes = DashboardController::getAccountsDashboard($actorAccounts);
assertCondition("Accounts Dashboard returns success", $accRes['success'] === true);
assertCondition("Collections total present", $accRes['summary_cards']['collections_period'] > 0);
assertCondition("Outstanding balance present", $accRes['summary_cards']['total_outstanding_balance'] >= 0);
assertCondition("Recent payments table present", count($accRes['recent_payments']) >= 1);

// 4. Verify Placement Officer Dashboard (Deepa Nair, id: 6)
$actorPlacement = ['id' => 6, 'role' => 'placement_officer', 'email' => 'placement@aaroha-inc.com'];
$pRes = DashboardController::getPlacementDashboard($actorPlacement);
assertCondition("Placement Dashboard returns success", $pRes['success'] === true);
assertCondition("Eligible students count present", $pRes['summary_cards']['students_eligible'] >= 1);
assertCondition("Checklist by student present", count($pRes['checklist_by_student']) >= 1);
assertCondition("Job openings present", count($pRes['job_openings']) >= 1);

// 5. Verify Coordinator Dashboard (Priya Sharma, id: 4)
$actorCoord = ['id' => 4, 'role' => 'coordinator', 'email' => 'priya.sharma@aaroha-inc.com'];
$cRes = DashboardController::getCoordinatorDashboard($actorCoord);
assertCondition("Coordinator Dashboard returns success", $cRes['success'] === true);
assertCondition("Active students and faculty present", isset($cRes['summary_cards']['active_students']));
assertCondition("Student attention list populated", count($cRes['student_attention_list']) >= 1);

// 6. Verify Super Admin Dashboard (Dr. Aris Thorne, id: 1)
$actorSuper = ['id' => 1, 'role' => 'super_admin', 'email' => 'admin@aaroha-inc.com'];
$saRes = DashboardController::getSuperAdminDashboard($actorSuper);
assertCondition("Super Admin Dashboard returns success", $saRes['success'] === true);
assertCondition("Governance financial summaries present", isset($saRes['governance']['financial_summary']['total_collected']));
assertCondition("Integrations health monitored", count($saRes['governance']['integration_health']) === 4);
assertCondition("Sensitive audit logs present", count($saRes['governance']['recent_audit_logs']) >= 1);

// 7. Verify Profile Controller (Get & Update)
$profRes = ProfileController::getProfile($actorStudent);
assertCondition("User profile retrieved", $profRes['success'] === true);
assertCondition("Profile contains timezone (default Asia/Kolkata)", $profRes['profile']['timezone'] === 'Asia/Kolkata');
assertCondition("Profile contains notification preferences", isset($profRes['profile']['notification_preferences']['class_reminders']));
assertCondition("Profile contains read-only account info", isset($profRes['profile']['account_info']['identifier']));

// Update personal preferences
$updateData = [
    'display_name' => 'Aarav (Cloud Fellow)',
    'timezone' => 'Asia/Kolkata',
    'preferred_language' => 'en',
    'notification_preferences' => [
        'in_app' => true,
        'email' => true,
        'class_reminders' => true,
        'assignment_reminders' => true,
        'fee_reminders' => false
    ]
];
$updRes = ProfileController::updateProfile($actorStudent, $updateData);
assertCondition("Profile update succeeded", $updRes['success'] === true);
assertCondition("Display name updated", $updRes['profile']['display_name'] === 'Aarav (Cloud Fellow)');
assertCondition("Notification preference updated", $updRes['profile']['notification_preferences']['fee_reminders'] === false);

// Security test: Attempt to modify email directly via profile must be rejected
$maliciousEmailUpdate = ['email' => 'hacked@malicious.com'];
$secRes = ProfileController::updateProfile($actorStudent, $maliciousEmailUpdate);
assertCondition("Direct email change rejected", $secRes['success'] === false);

echo "============================================================" . PHP_EOL;
echo "ALL 25 ROLE DASHBOARD & SECURITY TESTS PASSED SUCESSFULLY!" . PHP_EOL;
echo "============================================================" . PHP_EOL;
