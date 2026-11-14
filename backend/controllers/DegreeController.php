<?php
// Aaroha LMS - Academic Degree Program Controller
// Manages accredited university-equivalent degrees, specialist tracks, and curricula governance.
// Authority: Faculty & Academic Directorate

require_once __DIR__ . '/../config/database.php';

class DegreeController {

    private static function isFaculty($user) {
        $role = $user['role'] ?? '';
        return in_array($role, ['admin', 'faculty', 'instructor'], true);
    }

    private static function formatDegree($row) {
        return [
            'id' => (int)$row['id'],
            'title' => $row['title'],
            'slug' => $row['slug'],
            'degreeType' => $row['degree_type'],
            'duration' => $row['duration'],
            'level' => $row['level'],
            'accreditation' => $row['accreditation'],
            'courseId' => $row['course_id'] ? (int)$row['course_id'] : null,
            'courseSlug' => $row['slug'],
            'faculty' => [
                'name' => $row['faculty_name'] ?: 'Faculty Member',
                'title' => $row['faculty_title'] ?: 'Academic Faculty',
                'avatar' => $row['faculty_avatar'] ?: '/avatars/3d/memo_1.png'
            ],
            'description' => $row['description'],
            'modulesCount' => $row['modules_count'] ?: 'Core Semesters',
            'evaluatedProjectsCount' => $row['evaluated_projects_count'] ?: 'Evaluated Capstones',
            'credentialAwarded' => $row['credential_awarded'] ?: 'Accredited Degree Parchment',
            'skills' => json_decode($row['skills'] ?? '[]', true) ?: [],
            'highlights' => json_decode($row['highlights'] ?? '[]', true) ?: [],
            'is_published' => (bool)$row['is_published'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }

    public static function getDegrees() {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT * FROM degrees WHERE is_deleted = 0 ORDER BY id ASC");
        $rows = $stmt->fetchAll();

        $degrees = array_map([self::class, 'formatDegree'], $rows);

        return [
            'success' => true,
            'degrees' => $degrees
        ];
    }

    public static function createDegree($data, $user) {
        if (!self::isFaculty($user)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Faculty or academic authority required to create degree programs'];
        }

        $title = trim($data['title'] ?? '');
        if (empty($title)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Degree program title is required'];
        }

        $slug = trim($data['slug'] ?? '');
        if (empty($slug)) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title));
        }

        $degreeType = trim($data['degreeType'] ?? ($data['degree_type'] ?? 'Master of Science (M.S. Equivalent)'));
        $duration = trim($data['duration'] ?? '12 Months · 36 ECTS Credits');
        $level = trim($data['level'] ?? 'Graduate / Principal Level');
        $accreditation = trim($data['accreditation'] ?? 'Aaroha Institute of Technology & Systems Directorate');
        $courseId = !empty($data['courseId']) ? (int)$data['courseId'] : (!empty($data['course_id']) ? (int)$data['course_id'] : null);

        $facultyData = $data['faculty'] ?? [];
        $facultyName = trim($data['faculty_name'] ?? ($facultyData['name'] ?? ($user['full_name'] ?? 'Faculty Member')));
        $facultyTitle = trim($data['faculty_title'] ?? ($facultyData['title'] ?? ($user['title'] ?? 'Academic Faculty')));
        $facultyAvatar = trim($data['faculty_avatar'] ?? ($facultyData['avatar'] ?? ($user['avatar'] ?? '/avatars/3d/memo_1.png')));

        $description = trim($data['description'] ?? '');
        $modulesCount = trim($data['modulesCount'] ?? ($data['modules_count'] ?? '3 Semesters'));
        $evaluatedProjectsCount = trim($data['evaluatedProjectsCount'] ?? ($data['evaluated_projects_count'] ?? '3 Capstone Defenses'));
        $credentialAwarded = trim($data['credentialAwarded'] ?? ($data['credential_awarded'] ?? 'Official Master of Science Degree'));

        $skills = is_array($data['skills'] ?? null) ? json_encode($data['skills']) : json_encode([]);
        $highlights = is_array($data['highlights'] ?? null) ? json_encode($data['highlights']) : json_encode([]);
        $isPublished = isset($data['is_published']) ? (int)(bool)$data['is_published'] : 1;

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO degrees 
            (title, slug, degree_type, duration, level, accreditation, course_id, faculty_name, faculty_title, faculty_avatar, description, modules_count, evaluated_projects_count, credential_awarded, skills, highlights, is_published, is_deleted, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $title, $slug, $degreeType, $duration, $level, $accreditation,
            $courseId, $facultyName, $facultyTitle, $facultyAvatar,
            $description, $modulesCount, $evaluatedProjectsCount, $credentialAwarded,
            $skills, $highlights, $isPublished, (int)$user['id']
        ]);

        $newId = (int)$pdo->lastInsertId();
        $fetchStmt = $pdo->prepare("SELECT * FROM degrees WHERE id = ?");
        $fetchStmt->execute([$newId]);
        $newDegree = $fetchStmt->fetch();

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Degree program authored successfully',
            'degree' => self::formatDegree($newDegree)
        ];
    }

    public static function updateDegree($id, $data, $user) {
        if (!self::isFaculty($user)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Faculty or academic authority required to update degree programs'];
        }

        $pdo = Database::getConnection();
        $chk = $pdo->prepare("SELECT * FROM degrees WHERE id = ? AND is_deleted = 0");
        $chk->execute([$id]);
        $existing = $chk->fetch();
        if (!$existing) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Degree program not found'];
        }

        $title = isset($data['title']) && trim($data['title']) !== '' ? trim($data['title']) : $existing['title'];
        $slug = isset($data['slug']) && trim($data['slug']) !== '' ? trim($data['slug']) : $existing['slug'];
        $degreeType = isset($data['degreeType']) ? trim($data['degreeType']) : (isset($data['degree_type']) ? trim($data['degree_type']) : $existing['degree_type']);
        $duration = isset($data['duration']) ? trim($data['duration']) : $existing['duration'];
        $level = isset($data['level']) ? trim($data['level']) : $existing['level'];
        $accreditation = isset($data['accreditation']) ? trim($data['accreditation']) : $existing['accreditation'];
        $courseId = array_key_exists('courseId', $data) ? ($data['courseId'] ? (int)$data['courseId'] : null) : (array_key_exists('course_id', $data) ? ($data['course_id'] ? (int)$data['course_id'] : null) : $existing['course_id']);

        $facultyData = $data['faculty'] ?? [];
        $facultyName = array_key_exists('faculty_name', $data) ? trim($data['faculty_name']) : (isset($facultyData['name']) ? trim($facultyData['name']) : $existing['faculty_name']);
        $facultyTitle = array_key_exists('faculty_title', $data) ? trim($data['faculty_title']) : (isset($facultyData['title']) ? trim($facultyData['title']) : $existing['faculty_title']);
        $facultyAvatar = array_key_exists('faculty_avatar', $data) ? trim($data['faculty_avatar']) : (isset($facultyData['avatar']) ? trim($facultyData['avatar']) : $existing['faculty_avatar']);

        $description = isset($data['description']) ? trim($data['description']) : $existing['description'];
        $modulesCount = isset($data['modulesCount']) ? trim($data['modulesCount']) : (isset($data['modules_count']) ? trim($data['modules_count']) : $existing['modules_count']);
        $evaluatedProjectsCount = isset($data['evaluatedProjectsCount']) ? trim($data['evaluatedProjectsCount']) : (isset($data['evaluated_projects_count']) ? trim($data['evaluated_projects_count']) : $existing['evaluated_projects_count']);
        $credentialAwarded = isset($data['credentialAwarded']) ? trim($data['credentialAwarded']) : (isset($data['credential_awarded']) ? trim($data['credential_awarded']) : $existing['credential_awarded']);

        $skills = isset($data['skills']) ? (is_array($data['skills']) ? json_encode($data['skills']) : $data['skills']) : $existing['skills'];
        $highlights = isset($data['highlights']) ? (is_array($data['highlights']) ? json_encode($data['highlights']) : $data['highlights']) : $existing['highlights'];
        $isPublished = isset($data['is_published']) ? (int)(bool)$data['is_published'] : (int)$existing['is_published'];

        $stmt = $pdo->prepare("
            UPDATE degrees SET
                title = ?, slug = ?, degree_type = ?, duration = ?, level = ?, accreditation = ?,
                course_id = ?, faculty_name = ?, faculty_title = ?, faculty_avatar = ?, description = ?,
                modules_count = ?, evaluated_projects_count = ?, credential_awarded = ?, skills = ?, highlights = ?,
                is_published = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND is_deleted = 0
        ");
        $stmt->execute([
            $title, $slug, $degreeType, $duration, $level, $accreditation,
            $courseId, $facultyName, $facultyTitle, $facultyAvatar, $description,
            $modulesCount, $evaluatedProjectsCount, $credentialAwarded, $skills, $highlights,
            $isPublished, $id
        ]);

        $fetchStmt = $pdo->prepare("SELECT * FROM degrees WHERE id = ?");
        $fetchStmt->execute([$id]);
        $updated = $fetchStmt->fetch();

        return [
            'success' => true,
            'message' => 'Degree program updated successfully',
            'degree' => self::formatDegree($updated)
        ];
    }

    public static function deleteDegree($id, $user) {
        if (!self::isFaculty($user)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Faculty or academic authority required to archive degree programs'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE degrees SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$id]);

        return [
            'success' => true,
            'message' => 'Degree program archived successfully'
        ];
    }
}
