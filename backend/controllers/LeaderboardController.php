<?php
// Aaroha LMS - Student Ranking & Academic Leaderboard Controller
// Supports public/student read-only viewing and faculty/admin view & update capabilities.
require_once __DIR__ . '/../config/database.php';

class LeaderboardController {

    /**
     * Ensure student_rankings table and baseline cohort exist.
     */
    public static function initTable(PDO $pdo): void {
        static $initialized = false;
        if ($initialized) return;

        try {
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS student_rankings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        course_id INTEGER,
                        rank_position INTEGER NOT NULL DEFAULT 1,
                        points INTEGER NOT NULL DEFAULT 0,
                        grade_pct REAL NOT NULL DEFAULT 0.00,
                        badge_text TEXT DEFAULT 'Top Performer',
                        faculty_notes TEXT,
                        lessons_completed INTEGER NOT NULL DEFAULT 0,
                        tasks_completed INTEGER NOT NULL DEFAULT 0,
                        updated_by INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                ");
            } else {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS student_rankings (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        user_id INT UNSIGNED NOT NULL,
                        course_id INT UNSIGNED NULL,
                        rank_position INT UNSIGNED NOT NULL DEFAULT 1,
                        points INT UNSIGNED NOT NULL DEFAULT 0,
                        grade_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                        badge_text VARCHAR(100) NULL DEFAULT 'Top Performer',
                        faculty_notes TEXT NULL,
                        lessons_completed INT UNSIGNED NOT NULL DEFAULT 0,
                        tasks_completed INT UNSIGNED NOT NULL DEFAULT 0,
                        updated_by INT UNSIGNED NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_sr_user_course (user_id, course_id),
                        INDEX idx_sr_rank (rank_position, points),
                        CONSTRAINT fk_sr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");
            }

            // Check if student_rankings has records
            $cnt = (int)$pdo->query("SELECT COUNT(*) FROM student_rankings")->fetchColumn();
            if ($cnt === 0) {
                self::seedInitialRankings($pdo);
            }

            $initialized = true;
        } catch (Exception $e) {
            // Log or ignore non-critical migration exceptions
            error_log('Leaderboard init error: ' . $e->getMessage());
        }
    }

    /**
     * Seed baseline academic cohort rankings.
     */
    private static function seedInitialRankings(PDO $pdo): void {
        // 1. Ensure peer student profiles exist
        $peerStudents = [
            ['Elena Rostova', 'elena.rostova@enterprise.io', 'Senior Systems Architect', '/avatars/3d/memo_13.png'],
            ['Marcus Vance', 'marcus.vance@systems-core.io', 'Cloud Infrastructure Engineer', '/avatars/3d/memo_5.png'],
            ['Sophia Lin', 'sophia.lin@ai-dynamics.org', 'Principal ML Engineer', '/avatars/3d/memo_17.png'],
            ['Dev Patel', 'dev.patel@security-mesh.net', 'Site Reliability & Security Architect', '/avatars/3d/memo_24.png'],
            ['Sarah Jenkins', 'sarah.jenkins@distributed-lab.com', 'Distributed Systems Fellow', '/avatars/3d/memo_22.png'],
            ['Liam O\'Connor', 'liam.oconnor@kernel-cloud.io', 'Kernel & Cloud Systems Engineer', '/avatars/3d/memo_8.png'],
            ['Aria Chen', 'aria.chen@cloud-native.io', 'Distributed Consensus Specialist', '/avatars/3d/memo_19.png'],
            ['David Kim', 'david.kim@ai-scale.tech', 'Inference Optimization Engineer', '/avatars/3d/memo_11.png']
        ];

        $hash = '$2y$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // password123
        $userIdMap = [];

        foreach ($peerStudents as $peer) {
            [$name, $email, $title, $avatar] = $peer;
            $chk = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $chk->execute([$email]);
            $existingId = $chk->fetchColumn();

            if ($existingId) {
                $userIdMap[$email] = (int)$existingId;
            } else {
                try {
                    $insUser = $pdo->prepare("
                        INSERT INTO users (full_name, email, password_hash, role, title, avatar)
                        VALUES (?, ?, ?, 'student', ?, ?)
                    ");
                    $insUser->execute([$name, $email, $hash, $title, $avatar]);
                    $userIdMap[$email] = (int)$pdo->lastInsertId();
                } catch (Exception $ex) {}
            }
        }

        // 2. Discover existing course IDs
        $courses = $pdo->query("SELECT id FROM courses WHERE is_deleted = 0 ORDER BY id ASC")->fetchAll(PDO::FETCH_COLUMN);
        $primaryCourseId = !empty($courses[0]) ? (int)$courses[0] : null;

        // 3. Insert baseline rankings
        $standings = [
            [
                'email' => 'elena.rostova@enterprise.io',
                'rank' => 1,
                'points' => 985,
                'grade_pct' => 98.5,
                'badge' => 'Top Architect',
                'notes' => 'Flawless distributed consensus modeling and zero-downtime deployment architecture.',
                'lessons' => 18,
                'tasks' => 4
            ],
            [
                'email' => 'marcus.vance@systems-core.io',
                'rank' => 2,
                'points' => 950,
                'grade_pct' => 95.0,
                'badge' => 'Distinction Honors',
                'notes' => 'Outstanding Raft log replication and P99 latency optimization benchmarks.',
                'lessons' => 16,
                'tasks' => 4
            ],
            [
                'email' => 'sophia.lin@ai-dynamics.org',
                'rank' => 3,
                'points' => 925,
                'grade_pct' => 92.5,
                'badge' => 'Executive Fellow',
                'notes' => 'High-throughput vector search pipeline with deterministic dynamic batching.',
                'lessons' => 15,
                'tasks' => 3
            ],
            [
                'email' => 'dev.patel@security-mesh.net',
                'rank' => 4,
                'points' => 890,
                'grade_pct' => 89.0,
                'badge' => 'High Honors',
                'notes' => 'Robust zero-trust network isolation and automated penetration defense.',
                'lessons' => 14,
                'tasks' => 3
            ],
            [
                'email' => 'sarah.jenkins@distributed-lab.com',
                'rank' => 5,
                'points' => 865,
                'grade_pct' => 86.5,
                'badge' => 'Dean\'s List',
                'notes' => 'Clean state machine replication with deterministic crash-recovery tests.',
                'lessons' => 13,
                'tasks' => 3
            ],
            [
                'email' => 'liam.oconnor@kernel-cloud.io',
                'rank' => 6,
                'points' => 835,
                'grade_pct' => 83.5,
                'badge' => 'Rising Talent',
                'notes' => 'Demonstrated strong mastery of language tokenization and attention mechanisms.',
                'lessons' => 12,
                'tasks' => 2
            ],
            [
                'email' => 'aria.chen@cloud-native.io',
                'rank' => 7,
                'points' => 810,
                'grade_pct' => 81.0,
                'badge' => 'Honor Roll',
                'notes' => 'Consistent performance in distributed key-value storage implementations.',
                'lessons' => 11,
                'tasks' => 2
            ],
            [
                'email' => 'david.kim@ai-scale.tech',
                'rank' => 8,
                'points' => 780,
                'grade_pct' => 78.0,
                'badge' => 'Active Contender',
                'notes' => 'Solid foundation in asynchronous RPC patterns and stream pipelines.',
                'lessons' => 10,
                'tasks' => 2
            ]
        ];

        $insRank = $pdo->prepare("
            INSERT INTO student_rankings (
                user_id, course_id, rank_position, points, grade_pct, 
                badge_text, faculty_notes, lessons_completed, tasks_completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($standings as $s) {
            $uid = $userIdMap[$s['email']] ?? null;
            if ($uid) {
                try {
                    $insRank->execute([
                        $uid,
                        $primaryCourseId,
                        $s['rank'],
                        $s['points'],
                        $s['grade_pct'],
                        $s['badge'],
                        $s['notes'],
                        $s['lessons'],
                        $s['tasks']
                    ]);
                } catch (Exception $ex) {}
            }
        }
    }

    /**
     * Get real-time student ranking leaderboard.
     * Publicly viewable by students and guests.
     *
     * @param int|null $courseId Optional course filter
     * @param array|null $currentUser Optional authenticated user payload
     * @return array
     */
    public static function getLeaderboard(?int $courseId = null, ?array $currentUser = null): array {
        $pdo = Database::getConnection();
        self::initTable($pdo);

        $params = [];
        $whereSql = "";

        if ($courseId !== null && $courseId > 0) {
            $whereSql = "WHERE (sr.course_id = ? OR sr.course_id IS NULL)";
            $params[] = $courseId;
        }

        $sql = "
            SELECT 
                sr.id,
                sr.user_id,
                sr.course_id,
                sr.rank_position AS `rank`,
                sr.points,
                sr.grade_pct,
                sr.badge_text,
                sr.faculty_notes,
                sr.lessons_completed,
                sr.tasks_completed,
                sr.updated_at,
                u.full_name AS student_name,
                u.email AS student_email,
                u.title AS student_title,
                u.avatar AS student_avatar,
                c.title AS course_title
            FROM student_rankings sr
            JOIN users u ON sr.user_id = u.id
            LEFT JOIN courses c ON sr.course_id = c.id
            {$whereSql}
            ORDER BY sr.rank_position ASC, sr.points DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rankings = $stmt->fetchAll();

        // Calculate dynamic rank numbers and format fields
        $currentUserId = (int)($currentUser['id'] ?? 0);
        $formatted = [];
        $rankNum = 1;

        foreach ($rankings as $row) {
            $formatted[] = [
                'id' => (int)$row['id'],
                'user_id' => (int)$row['user_id'],
                'course_id' => !empty($row['course_id']) ? (int)$row['course_id'] : null,
                'rank' => (int)($row['rank'] ?: $rankNum),
                'points' => (int)$row['points'],
                'grade_pct' => (float)$row['grade_pct'],
                'badge_text' => $row['badge_text'] ?: 'Top Performer',
                'faculty_notes' => $row['faculty_notes'] ?: '',
                'lessons_completed' => (int)$row['lessons_completed'],
                'tasks_completed' => (int)$row['tasks_completed'],
                'updated_at' => $row['updated_at'],
                'student_name' => $row['student_name'],
                'student_email' => $row['student_email'],
                'student_title' => $row['student_title'] ?: 'Systems Engineering Fellow',
                'student_avatar' => $row['student_avatar'] ?: '/avatars/3d/memo_13.png',
                'course_title' => $row['course_title'] ?: 'Academy Global Standings',
                'is_current_user' => ($currentUserId > 0 && (int)$row['user_id'] === $currentUserId)
            ];
            $rankNum++;
        }

        // Check if current user is student and missing from rankings; dynamically add them
        if ($currentUserId > 0 && !array_filter($formatted, fn($r) => $r['is_current_user'])) {
            $userStmt = $pdo->prepare("SELECT id, full_name, email, title, avatar FROM users WHERE id = ?");
            $userStmt->execute([$currentUserId]);
            $u = $userStmt->fetch();

            if ($u) {
                // Calculate lessons and tasks completed by this student
                $lesStmt = $pdo->prepare("
                    SELECT COUNT(*) 
                    FROM lesson_progress lp
                    JOIN enrollments e ON lp.enrollment_id = e.id
                    WHERE e.user_id = ? AND lp.is_completed = 1
                ");
                $lesStmt->execute([$currentUserId]);
                $myLessons = (int)$lesStmt->fetchColumn();

                $taskStmt = $pdo->prepare("
                    SELECT COUNT(*) 
                    FROM task_submissions ts
                    JOIN enrollments e ON ts.enrollment_id = e.id
                    WHERE e.user_id = ? AND ts.status = 'passed'
                ");
                $taskStmt->execute([$currentUserId]);
                $myTasks = (int)$taskStmt->fetchColumn();

                $myPoints = ($myLessons * 50) + ($myTasks * 100);
                $myGrade = min(100.0, 70.0 + ($myLessons * 2.5) + ($myTasks * 5.0));

                $selfEntry = [
                    'id' => 999900 + $currentUserId,
                    'user_id' => $currentUserId,
                    'course_id' => $courseId,
                    'rank' => count($formatted) + 1,
                    'points' => $myPoints,
                    'grade_pct' => $myGrade,
                    'badge_text' => $myPoints > 500 ? 'Rising Scholar' : 'Active Contender',
                    'faculty_notes' => 'Continuous progression through core system curriculum.',
                    'lessons_completed' => $myLessons,
                    'tasks_completed' => $myTasks,
                    'updated_at' => date('Y-m-d H:i:s'),
                    'student_name' => $u['full_name'],
                    'student_email' => $u['email'],
                    'student_title' => $u['title'] ?: 'Learner',
                    'student_avatar' => $u['avatar'] ?: '/avatars/3d/memo_13.png',
                    'course_title' => 'Academy Global Standings',
                    'is_current_user' => true
                ];

                $formatted[] = $selfEntry;
            }
        }

        // Final sort by rank then points
        usort($formatted, function($a, $b) {
            if ($a['rank'] === $b['rank']) {
                return $b['points'] <=> $a['points'];
            }
            return $a['rank'] <=> $b['rank'];
        });

        // Re-index consecutive ranks 1..N
        foreach ($formatted as $idx => &$item) {
            $item['rank'] = $idx + 1;
        }

        return [
            'success' => true,
            'course_id' => $courseId,
            'total' => count($formatted),
            'rankings' => $formatted
        ];
    }

    /**
     * Faculty / Admin: Update an existing student's leaderboard ranking and performance metrics.
     *
     * @param int $rankingId
     * @param array $data
     * @param array $adminUser
     * @return array
     */
    public static function updateRanking(int $rankingId, array $data, array $adminUser): array {
        // Enforce faculty or admin role
        $role = strtolower($adminUser['role'] ?? '');
        if ($role !== 'admin' && $role !== 'faculty' && $role !== 'instructor') {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'Faculty or administrative privileges required to update leaderboard standings'
            ];
        }

        $pdo = Database::getConnection();
        self::initTable($pdo);

        // Verify ranking exists
        $chk = $pdo->prepare("SELECT id, user_id FROM student_rankings WHERE id = ?");
        $chk->execute([$rankingId]);
        $existing = $chk->fetch();

        if (!$existing) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Student ranking record not found'];
        }

        $points = isset($data['points']) ? (int)$data['points'] : null;
        $rankPos = isset($data['rank']) ? (int)$data['rank'] : null;
        $gradePct = isset($data['grade_pct']) ? (float)$data['grade_pct'] : null;
        $badgeText = isset($data['badge_text']) ? trim($data['badge_text']) : null;
        $facultyNotes = isset($data['faculty_notes']) ? trim($data['faculty_notes']) : null;
        $lessonsCompleted = isset($data['lessons_completed']) ? (int)$data['lessons_completed'] : null;
        $tasksCompleted = isset($data['tasks_completed']) ? (int)$data['tasks_completed'] : null;
        $courseId = array_key_exists('course_id', $data) ? ($data['course_id'] ? (int)$data['course_id'] : null) : null;

        $fields = [];
        $params = [];

        if ($points !== null) {
            $fields[] = "points = ?";
            $params[] = $points;
        }
        if ($rankPos !== null && $rankPos > 0) {
            $fields[] = "rank_position = ?";
            $params[] = $rankPos;
        }
        if ($gradePct !== null) {
            $fields[] = "grade_pct = ?";
            $params[] = $gradePct;
        }
        if ($badgeText !== null) {
            $fields[] = "badge_text = ?";
            $params[] = $badgeText;
        }
        if ($facultyNotes !== null) {
            $fields[] = "faculty_notes = ?";
            $params[] = $facultyNotes;
        }
        if ($lessonsCompleted !== null) {
            $fields[] = "lessons_completed = ?";
            $params[] = $lessonsCompleted;
        }
        if ($tasksCompleted !== null) {
            $fields[] = "tasks_completed = ?";
            $params[] = $tasksCompleted;
        }
        if (array_key_exists('course_id', $data)) {
            $fields[] = "course_id = ?";
            $params[] = $courseId;
        }

        $fields[] = "updated_by = ?";
        $params[] = (int)$adminUser['id'];

        $fields[] = "updated_at = CURRENT_TIMESTAMP";

        $params[] = $rankingId;
        $sql = "UPDATE student_rankings SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Optionally update student title or name in users table if provided
        $studentTitle = trim($data['student_title'] ?? '');
        $studentName = trim($data['student_name'] ?? '');
        if (!empty($studentTitle) || !empty($studentName)) {
            $userFields = [];
            $userParams = [];
            if (!empty($studentTitle)) {
                $userFields[] = "title = ?";
                $userParams[] = $studentTitle;
            }
            if (!empty($studentName)) {
                $userFields[] = "full_name = ?";
                $userParams[] = $studentName;
            }
            $userParams[] = (int)$existing['user_id'];
            $pdo->prepare("UPDATE users SET " . implode(', ', $userFields) . " WHERE id = ?")->execute($userParams);
        }

        return [
            'success' => true,
            'message' => 'Student ranking successfully updated by faculty',
            'ranking_id' => $rankingId
        ];
    }

    /**
     * Faculty / Admin: Create or add a new student entry to the leaderboard.
     *
     * @param array $data
     * @param array $adminUser
     * @return array
     */
    public static function createRanking(array $data, array $adminUser): array {
        $role = strtolower($adminUser['role'] ?? '');
        if ($role !== 'admin' && $role !== 'faculty' && $role !== 'instructor') {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'Faculty or administrative privileges required to create leaderboard standings'
            ];
        }

        $pdo = Database::getConnection();
        self::initTable($pdo);

        $userId = !empty($data['user_id']) ? (int)$data['user_id'] : null;
        $studentName = trim($data['student_name'] ?? '');
        $studentEmail = trim($data['student_email'] ?? '');
        $studentTitle = trim($data['student_title'] ?? 'Systems Engineering Fellow');

        // If user_id not provided, find or create student user
        if (!$userId) {
            if (empty($studentEmail)) {
                http_response_code(400);
                return ['success' => false, 'error' => 'Student user ID or email is required'];
            }

            $userChk = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $userChk->execute([$studentEmail]);
            $foundId = $userChk->fetchColumn();

            if ($foundId) {
                $userId = (int)$foundId;
            } else {
                $insUser = $pdo->prepare("
                    INSERT INTO users (full_name, email, password_hash, role, title, avatar)
                    VALUES (?, ?, '$2y$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', ?, '/avatars/3d/memo_13.png')
                ");
                $insUser->execute([$studentName ?: 'New Student', $studentEmail, $studentTitle]);
                $userId = (int)$pdo->lastInsertId();
            }
        }

        $courseId = !empty($data['course_id']) ? (int)$data['course_id'] : null;
        $rankPos = !empty($data['rank']) ? (int)$data['rank'] : 1;
        $points = isset($data['points']) ? (int)$data['points'] : 700;
        $gradePct = isset($data['grade_pct']) ? (float)$data['grade_pct'] : 85.0;
        $badgeText = trim($data['badge_text'] ?? 'Top Performer');
        $facultyNotes = trim($data['faculty_notes'] ?? 'Enrolled in academic cohort.');
        $lessonsCompleted = isset($data['lessons_completed']) ? (int)$data['lessons_completed'] : 5;
        $tasksCompleted = isset($data['tasks_completed']) ? (int)$data['tasks_completed'] : 1;

        $ins = $pdo->prepare("
            INSERT INTO student_rankings (
                user_id, course_id, rank_position, points, grade_pct, 
                badge_text, faculty_notes, lessons_completed, tasks_completed, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $userId,
            $courseId,
            $rankPos,
            $points,
            $gradePct,
            $badgeText,
            $facultyNotes,
            $lessonsCompleted,
            $tasksCompleted,
            (int)$adminUser['id']
        ]);

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Student successfully added to academic leaderboard',
            'ranking_id' => (int)$pdo->lastInsertId()
        ];
    }

    /**
     * Faculty / Admin: Delete a student ranking from the leaderboard.
     */
    public static function deleteRanking(int $rankingId, array $adminUser): array {
        $role = strtolower($adminUser['role'] ?? '');
        if ($role !== 'admin' && $role !== 'faculty' && $role !== 'instructor') {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'Faculty or administrative privileges required to delete leaderboard standings'
            ];
        }

        $pdo = Database::getConnection();
        self::initTable($pdo);

        $del = $pdo->prepare("DELETE FROM student_rankings WHERE id = ?");
        $del->execute([$rankingId]);

        return [
            'success' => true,
            'message' => 'Student ranking removed from leaderboard'
        ];
    }
}
