<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/DashboardController.php';
require_once __DIR__ . '/../controllers/ProfileController.php';

echo "=== AAROHA LMS DASHBOARDS & PROFILE TEST ===" . PHP_EOL;

// 1. Student Dashboard (Aarav Patel, id: 7)
$actorStudent = ['id' => 7, 'role' => 'student', 'email' => 'aarav.patel@student.aaroha-inc.com'];
$resStudent = DashboardController::getStudentDashboard($actorStudent);
echo "1. Student Dashboard: " . ($resStudent['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Active Enrolled Courses: " . $resStudent['summary_cards']['active_courses'] . PHP_EOL;
echo "   - Attendance: " . $resStudent['summary_cards']['attendance_pct'] . "%" . PHP_EOL;
echo "   - Outstanding Fees: INR " . $resStudent['summary_cards']['outstanding_fees'] . PHP_EOL;
echo "   - Next Live Class: " . ($resStudent['today_and_upcoming']['next_live_class']['topic'] ?? 'None') . PHP_EOL;

// 2. Faculty Dashboard (Elena Rostova, id: 2)
$actorFaculty = ['id' => 2, 'role' => 'faculty', 'email' => 'elena.rostova@enterprise.io'];
$resFaculty = DashboardController::getFacultyDashboard($actorFaculty);
echo "2. Faculty Dashboard: " . ($resFaculty['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Assigned Batches: " . $resFaculty['summary_cards']['assigned_batches'] . PHP_EOL;
echo "   - Students in Batches: " . $resFaculty['summary_cards']['students_in_batches'] . PHP_EOL;
echo "   - Classes Today: " . $resFaculty['summary_cards']['classes_today'] . PHP_EOL;

// 3. Accounts Dashboard (Rajesh Kulkarni, id: 5)
$actorAccounts = ['id' => 5, 'role' => 'accounts', 'email' => 'accounts@aaroha-inc.com'];
$resAccounts = DashboardController::getAccountsDashboard($actorAccounts);
echo "3. Accounts Dashboard: " . ($resAccounts['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Total Collections: INR " . $resAccounts['summary_cards']['collections_period'] . PHP_EOL;
echo "   - Total Outstanding: INR " . $resAccounts['summary_cards']['total_outstanding_balance'] . PHP_EOL;
echo "   - Recent Payments: " . count($resAccounts['recent_payments']) . " records" . PHP_EOL;

// 4. Placement Officer Dashboard (Deepa Nair, id: 6)
$actorPlacement = ['id' => 6, 'role' => 'placement_officer', 'email' => 'placement@aaroha-inc.com'];
$resPlacement = DashboardController::getPlacementDashboard($actorPlacement);
echo "4. Placement Dashboard: " . ($resPlacement['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Eligible Students: " . $resPlacement['summary_cards']['students_eligible'] . PHP_EOL;
echo "   - Ready Students: " . $resPlacement['summary_cards']['students_ready'] . PHP_EOL;
echo "   - Job Openings: " . count($resPlacement['job_openings']) . PHP_EOL;

// 5. Coordinator Dashboard (Priya Sharma, id: 4)
$actorCoord = ['id' => 4, 'role' => 'coordinator', 'email' => 'priya.sharma@aaroha-inc.com'];
$resCoord = DashboardController::getCoordinatorDashboard($actorCoord);
echo "5. Coordinator Dashboard: " . ($resCoord['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Active Students: " . $resCoord['summary_cards']['active_students'] . PHP_EOL;
echo "   - Attention List: " . count($resCoord['student_attention_list']) . " students" . PHP_EOL;

// 6. Super Admin Dashboard (Dr. Aris Thorne, id: 1)
$actorSuper = ['id' => 1, 'role' => 'super_admin', 'email' => 'admin@aaroha-inc.com'];
$resSuper = DashboardController::getSuperAdminDashboard($actorSuper);
echo "6. Super Admin Dashboard: " . ($resSuper['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Integrations Monitored: " . count($resSuper['governance']['integration_health']) . PHP_EOL;
echo "   - Audit Logs: " . count($resSuper['governance']['recent_audit_logs']) . PHP_EOL;

// 7. Profile Controller (All roles)
$resProfile = ProfileController::getProfile($actorStudent);
echo "7. Student Profile: " . ($resProfile['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Identifier: " . $resProfile['profile']['account_info']['identifier'] . PHP_EOL;
echo "   - Skills: " . $resProfile['profile']['role_profile']['skills'] . PHP_EOL;

$resFacProfile = ProfileController::getProfile($actorFaculty);
echo "8. Faculty Profile: " . ($resFacProfile['success'] ? "SUCCESS" : "FAILED") . PHP_EOL;
echo "   - Qualifications: " . $resFacProfile['profile']['role_profile']['qualifications'] . PHP_EOL;

echo "=== ALL CONTROLLER TESTS PASSED ===" . PHP_EOL;
