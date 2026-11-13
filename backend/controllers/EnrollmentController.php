<?php
// Aaroha LMS - Enrollment & Progress Controller
require_once __DIR__ . '/../config/database.php';

class EnrollmentController {
    // Student: Enroll into a course
    public static function enroll($courseId, $userId) {
        $pdo = Database::getConnection();

        // Verify course exists and is published
        $stmt = $pdo->prepare("SELECT id FROM courses WHERE id = ? AND is_published = 1 LIMIT 1");
        $stmt->execute([$courseId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Program not found or unavailable for enrollment'];
        }

        // Check if already enrolled
        $chk = $pdo->prepare("SELECT id, status FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1");
        $chk->execute([$userId, $courseId]);
        $existing = $chk->fetch();

        if ($existing) {
            return [
                'success' => true,
                'message' => 'Already enrolled',
                'enrollment_id' => (int)$existing['id']
            ];
        }

        // Insert new enrollment
        $ins = $pdo->prepare("
            INSERT INTO enrollments (user_id, course_id, status, enrolled_at)
            VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
        ");
        $ins->execute([$userId, $courseId]);

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Enrolled successfully',
            'enrollment_id' => (int)$pdo->lastInsertId()
        ];
    }

    // Student: Get my enrolled courses with computed progress
    public static function myEnrollments($userId) {
        $pdo = Database::getConnection();

        $sql = "
            SELECT 
                e.id, e.id AS enrollment_id, e.user_id, e.status, e.status AS enrollment_status, e.enrolled_at, e.completed_at,
                c.id AS course_id, c.title, c.slug, c.description, c.thumbnail_url,
                u.full_name AS instructor_name
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON c.created_by = u.id
            WHERE e.user_id = ? AND e.status = 'active'
            ORDER BY e.enrolled_at DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $enrollments = $stmt->fetchAll();

        foreach ($enrollments as &$item) {
            $courseId = (int)$item['course_id'];
            $enrollmentId = (int)$item['enrollment_id'];

            // Total lessons in course
            $totStmt = $pdo->prepare("
                SELECT COUNT(l.id) 
                FROM lessons l
                JOIN modules m ON l.module_id = m.id
                WHERE m.course_id = ?
            ");
            $totStmt->execute([$courseId]);
            $totalLessons = (int)$totStmt->fetchColumn();

            // Completed lessons
            $compStmt = $pdo->prepare("
                SELECT COUNT(lp.id) 
                FROM lesson_progress lp
                WHERE lp.enrollment_id = ? AND lp.is_completed = 1
            ");
            $compStmt->execute([$enrollmentId]);
            $completedLessons = (int)$compStmt->fetchColumn();

            $percentage = $totalLessons > 0 ? (int)round(($completedLessons / $totalLessons) * 100) : 0;

            $item['total_lessons'] = $totalLessons;
            $item['completed_lessons'] = $completedLessons;
            $item['progress_percentage'] = $percentage;
        }

        return ['success' => true, 'enrollments' => $enrollments];
    }

    // Student: Mark a lesson as completed
    public static function completeLesson($lessonId, $userId) {
        $pdo = Database::getConnection();

        // Find enrollment for this lesson's course
        $stmt = $pdo->prepare("
            SELECT e.id AS enrollment_id
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            JOIN enrollments e ON m.course_id = e.course_id
            WHERE l.id = ? AND e.user_id = ? AND e.status = 'active'
            LIMIT 1
        ");
        $stmt->execute([$lessonId, $userId]);
        $enrollment = $stmt->fetch();

        if (!$enrollment) {
            http_response_code(403);
            return ['success' => false, 'error' => 'You must be actively enrolled in this program to track progress'];
        }

        $enrollmentId = (int)$enrollment['enrollment_id'];

        // Upsert lesson progress (compatible with both MySQL and SQLite)
        $upsert = $pdo->prepare("
            REPLACE INTO lesson_progress (enrollment_id, lesson_id, is_completed, completed_at)
            VALUES (?, ?, 1, CURRENT_TIMESTAMP)
        ");
        $upsert->execute([$enrollmentId, $lessonId]);

        return [
            'success' => true,
            'message' => 'Lecture marked as completed'
        ];
    }
}

