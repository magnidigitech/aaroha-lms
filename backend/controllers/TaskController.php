<?php
// Aaroha LMS - Task Submission & Evaluation Controller
require_once __DIR__ . '/../config/database.php';

class TaskController {
    // Student: Submit deliverable for evaluation
    public static function submitTask($taskId, $userId, $data) {
        $submissionText = trim($data['submission_text'] ?? '');
        $attachmentUrl = trim($data['attachment_url'] ?? '');

        if (empty($submissionText) && empty($attachmentUrl)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Either written solution text or an artifact URL is required'];
        }

        $pdo = Database::getConnection();

        // 1. Find enrollment for the course containing this task
        $stmt = $pdo->prepare("
            SELECT e.id AS enrollment_id
            FROM tasks t
            JOIN modules m ON t.module_id = m.id
            JOIN enrollments e ON m.course_id = e.course_id
            WHERE t.id = ? AND e.user_id = ? AND e.status = 'active'
            LIMIT 1
        ");
        $stmt->execute([$taskId, $userId]);
        $enrollment = $stmt->fetch();

        if (!$enrollment) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Active enrollment required to submit deliverables for this program'];
        }

        $enrollmentId = (int)$enrollment['enrollment_id'];

        // 2. Check if a submission already exists
        $checkStmt = $pdo->prepare("
            SELECT id, status FROM task_submissions 
            WHERE task_id = ? AND enrollment_id = ?
            LIMIT 1
        ");
        $checkStmt->execute([$taskId, $enrollmentId]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            // Update existing submission to 'under_review'
            $upd = $pdo->prepare("
                UPDATE task_submissions 
                SET submission_text = ?, attachment_url = ?, status = 'under_review', submitted_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $upd->execute([$submissionText, $attachmentUrl, $existing['id']]);
            $submissionId = (int)$existing['id'];
        } else {
            // Insert new submission
            $ins = $pdo->prepare("
                INSERT INTO task_submissions (task_id, enrollment_id, submission_text, attachment_url, status, submitted_at)
                VALUES (?, ?, ?, ?, 'under_review', CURRENT_TIMESTAMP)
            ");
            $ins->execute([$taskId, $enrollmentId, $submissionText, $attachmentUrl]);
            $submissionId = (int)$pdo->lastInsertId();
        }

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Deliverable submitted for faculty evaluation',
            'submission_id' => $submissionId
        ];
    }

    // Student: View submission feedback
    public static function getSubmission($taskId, $userId) {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT ts.*, t.title AS task_title, t.max_score, t.passing_score
            FROM task_submissions ts
            JOIN tasks t ON ts.task_id = t.id
            JOIN enrollments e ON ts.enrollment_id = e.id
            WHERE ts.task_id = ? AND e.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$taskId, $userId]);
        $submission = $stmt->fetch();

        return [
            'success' => true,
            'submission' => $submission ?: null
        ];
    }

    // Faculty (Admin): List deliverables awaiting evaluation
    public static function getPendingSubmissions() {
        $pdo = Database::getConnection();

        $sql = "
            SELECT 
                ts.id, ts.task_id, ts.submission_text, ts.attachment_url, ts.status, ts.submitted_at,
                t.title AS task_title, t.max_score, t.passing_score,
                u.id AS student_id, u.full_name AS student_name, u.email AS student_email,
                c.title AS course_title
            FROM task_submissions ts
            JOIN tasks t ON ts.task_id = t.id
            JOIN enrollments e ON ts.enrollment_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN courses c ON e.course_id = c.id
            WHERE ts.status = 'under_review'
            ORDER BY ts.submitted_at ASC
        ";

        $stmt = $pdo->query($sql);
        $pending = $stmt->fetchAll();

        return [
            'success' => true,
            'pending_submissions' => $pending
        ];
    }

    // Faculty (Admin): Grade a deliverable
    public static function gradeSubmission($submissionId, $adminId, $data) {
        $score = isset($data['score']) ? (int)$data['score'] : null;
        $status = $data['status'] ?? 'passed';
        $feedback = trim($data['feedback'] ?? '');

        if (!in_array($status, ['passed', 'resubmit_required', 'failed'])) {
            $status = 'passed';
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            UPDATE task_submissions
            SET score = ?, status = ?, feedback = ?, graded_by = ?, graded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$score, $status, $feedback, $adminId, $submissionId]);

        return [
            'success' => true,
            'message' => 'Faculty evaluation recorded successfully'
        ];
    }
}

