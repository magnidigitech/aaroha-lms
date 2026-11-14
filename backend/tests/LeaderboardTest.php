<?php
// Unit & Integration Test for Student Ranking Leaderboard & Role Permissions
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../controllers/LeaderboardController.php';

echo "=== 1. TEST LEADERBOARD TABLE INIT & COHORT SEEDING ===\n";
$pdo = Database::getConnection();
LeaderboardController::initTable($pdo);

$board = LeaderboardController::getLeaderboard();
assert($board['success'] === true, 'Leaderboard get must succeed');
assert($board['total'] >= 3, 'Must have at least top 3 podium students seeded');
echo "✓ Baseline leaderboard populated with {$board['total']} ranked students\n";

$topStudent = $board['rankings'][0];
assert($topStudent['rank'] === 1, 'First entry must be rank 1');
assert(!empty($topStudent['student_name']), 'Top student must have a name');
assert($topStudent['points'] > 0, 'Top student must have points');
echo "✓ Rank #1 Student verified: {$topStudent['student_name']} with {$topStudent['points']} pts ({$topStudent['badge_text']})\n";

echo "\n=== 2. TEST ROLE-BASED ACCESS CONTROL (STUDENT READ-ONLY) ===\n";
$studentUser = [
    'id' => 2,
    'role' => 'student',
    'email' => 'elena.rostova@enterprise.io',
    'full_name' => 'Elena Rostova'
];

// Student attempts to update ranking -> Must be rejected with 403 Forbidden
$resStudentUpdate = LeaderboardController::updateRanking($topStudent['id'], ['points' => 9999], $studentUser);
assert($resStudentUpdate['success'] === false, 'Student must NOT be allowed to update ranking');
assert(str_contains(strtolower($resStudentUpdate['error']), 'privileges required'), 'Error must specify faculty privileges required');
echo "✓ PASS: Student update attempt rejected with 403 Forbidden\n";

// Student attempts to create ranking -> Must be rejected with 403 Forbidden
$resStudentCreate = LeaderboardController::createRanking(['student_name' => 'Cheater', 'points' => 10000], $studentUser);
assert($resStudentCreate['success'] === false, 'Student must NOT be allowed to create ranking');
echo "✓ PASS: Student create attempt rejected with 403 Forbidden\n";

echo "\n=== 3. TEST FACULTY / ADMIN EDIT & UPDATE CAPABILITIES ===\n";
$adminUser = [
    'id' => 1,
    'role' => 'admin',
    'email' => 'admin@aaroha-inc.com',
    'full_name' => 'Dr. Aris Thorne'
];

// Faculty updates top student's points and faculty commendation
$updatePayload = [
    'points' => 1050,
    'rank' => 1,
    'grade_pct' => 99.5,
    'badge_text' => 'Grandmaster Architect',
    'faculty_notes' => 'Exceptional performance in distributed state machine invariants.',
    'lessons_completed' => 20,
    'tasks_completed' => 5
];

$resAdminUpdate = LeaderboardController::updateRanking($topStudent['id'], $updatePayload, $adminUser);
assert($resAdminUpdate['success'] === true, 'Admin/Faculty update must succeed');
echo "✓ PASS: Faculty successfully updated ranking for {$topStudent['student_name']}\n";

// Re-verify the updated ranking in leaderboard
$boardAfter = LeaderboardController::getLeaderboard();
$updatedStudent = null;
foreach ($boardAfter['rankings'] as $r) {
    if ($r['id'] === $topStudent['id']) {
        $updatedStudent = $r;
        break;
    }
}

assert($updatedStudent !== null, 'Updated student must exist in leaderboard');
assert($updatedStudent['points'] === 1050, 'Points must be updated to 1050');
assert($updatedStudent['badge_text'] === 'Grandmaster Architect', 'Badge must be Grandmaster Architect');
echo "✓ PASS: Verified updated points (1050) and distinction badge ('Grandmaster Architect')\n";

echo "\n=== 4. TEST FACULTY ADDING NEW STUDENT TO LEADERBOARD ===\n";
$newStudentData = [
    'student_name' => 'Devon Scott',
    'student_email' => 'devon.scott@enterprise.io',
    'student_title' => 'Site Reliability Fellow',
    'points' => 880,
    'rank' => 5,
    'grade_pct' => 88.0,
    'badge_text' => 'High Honors',
    'faculty_notes' => 'Superb zero-trust gateway automation.',
    'lessons_completed' => 14,
    'tasks_completed' => 3
];

$resAdd = LeaderboardController::createRanking($newStudentData, $adminUser);
assert($resAdd['success'] === true, 'Faculty add student must succeed');
$newRankingId = $resAdd['ranking_id'];
echo "✓ PASS: Faculty added new student with ranking ID: $newRankingId\n";

$boardWithNew = LeaderboardController::getLeaderboard();
$foundNew = false;
foreach ($boardWithNew['rankings'] as $r) {
    if ($r['student_email'] === 'devon.scott@enterprise.io') {
        $foundNew = true;
        break;
    }
}
assert($foundNew === true, 'Newly added student must be in leaderboard');
echo "✓ PASS: Verified newly added student in leaderboard standings\n";

echo "\n============================================================\n";
echo "  ✅ ALL LEADERBOARD & ROLE ACCESS TESTS PASSED PERFECTLY!\n";
echo "============================================================\n";
