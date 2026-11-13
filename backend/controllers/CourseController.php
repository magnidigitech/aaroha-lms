<?php
// Aaroha LMS - Course & Curriculum Controller
// Handles Course, Module, Lesson, and Task CRUD with relational authorization,
// soft deletion/archiving, prepared statements, and Bunny Stream Video ID validation.

require_once __DIR__ . '/../config/database.php';

class CourseController {

    private static function setHttpStatus(int $code): void {
        if (!headers_sent()) {
            http_response_code($code);
        }
    }

    // -------------------------------------------------------------
    // AUTHORIZATION HELPERS (RELATIONSHIP-DERIVED ACCESS CONTROL)
    // -------------------------------------------------------------

    private static function checkCourseOwnership($pdo, int $courseId, int $userId, string $userRole): array {
        if ($userRole !== 'admin' && $userRole !== 'instructor' && $userRole !== 'faculty') {
            return ['allowed' => false, 'code' => 403, 'error' => 'Faculty or administrative privileges required'];
        }

        $stmt = $pdo->prepare("SELECT * FROM courses WHERE id = ?");
        $stmt->execute([$courseId]);
        $course = $stmt->fetch();

        if (!$course || (int)$course['is_deleted'] === 1) {
            return ['allowed' => false, 'code' => 404, 'error' => 'Program not found or has been removed'];
        }

        // Administrators and Faculty Members have curriculum management authority across programs
        if ($userRole !== 'admin' && $userRole !== 'faculty' && $userRole !== 'instructor' && (int)$course['created_by'] !== $userId) {
            return ['allowed' => false, 'code' => 403, 'error' => 'You are not authorized to manage this course'];
        }

        return ['allowed' => true, 'course' => $course];
    }

    private static function checkModuleOwnership($pdo, int $moduleId, int $userId, string $userRole): array {
        if ($userRole !== 'admin' && $userRole !== 'instructor' && $userRole !== 'faculty') {
            return ['allowed' => false, 'code' => 403, 'error' => 'Faculty or administrative privileges required'];
        }

        $stmt = $pdo->prepare("
            SELECT m.*, m.is_deleted AS module_deleted,
                   c.created_by AS course_created_by, c.is_deleted AS course_deleted
            FROM modules m
            JOIN courses c ON m.course_id = c.id
            WHERE m.id = ?
        ");
        $stmt->execute([$moduleId]);
        $row = $stmt->fetch();

        if (!$row || (int)$row['module_deleted'] === 1 || (int)$row['course_deleted'] === 1) {
            return ['allowed' => false, 'code' => 404, 'error' => 'Module not found or has been removed'];
        }

        // Administrators and Faculty Members have full access across all programs
        if ($userRole !== 'admin' && $userRole !== 'faculty' && $userRole !== 'instructor' && (int)$row['course_created_by'] !== $userId) {
            return ['allowed' => false, 'code' => 403, 'error' => 'You are not authorized to manage this module'];
        }

        return ['allowed' => true, 'module' => $row];
    }

    private static function checkLessonOwnership($pdo, int $lessonId, int $userId, string $userRole): array {
        if ($userRole !== 'admin' && $userRole !== 'instructor' && $userRole !== 'faculty') {
            return ['allowed' => false, 'code' => 403, 'error' => 'Faculty or administrative privileges required'];
        }

        $stmt = $pdo->prepare("
            SELECT l.*, l.is_deleted AS lesson_deleted,
                   m.course_id, m.is_deleted AS module_deleted,
                   c.created_by AS course_created_by, c.is_deleted AS course_deleted
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE l.id = ?
        ");
        $stmt->execute([$lessonId]);
        $row = $stmt->fetch();

        if (!$row || (int)$row['lesson_deleted'] === 1 || (int)$row['module_deleted'] === 1 || (int)$row['course_deleted'] === 1) {
            return ['allowed' => false, 'code' => 404, 'error' => 'Lecture not found or has been removed'];
        }

        // Administrators and Faculty Members have full access across all programs
        if ($userRole !== 'admin' && $userRole !== 'faculty' && $userRole !== 'instructor' && (int)$row['course_created_by'] !== $userId) {
            return ['allowed' => false, 'code' => 403, 'error' => 'You are not authorized to manage this lecture'];
        }

        return ['allowed' => true, 'lesson' => $row];
    }

    private static function checkTaskOwnership($pdo, int $taskId, int $userId, string $userRole): array {
        if ($userRole !== 'admin' && $userRole !== 'instructor' && $userRole !== 'faculty') {
            return ['allowed' => false, 'code' => 403, 'error' => 'Faculty or administrative privileges required'];
        }

        $stmt = $pdo->prepare("
            SELECT t.*, t.is_deleted AS task_deleted,
                   m.course_id, m.is_deleted AS module_deleted,
                   c.created_by AS course_created_by, c.is_deleted AS course_deleted
            FROM tasks t
            JOIN modules m ON t.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE t.id = ?
        ");
        $stmt->execute([$taskId]);
        $row = $stmt->fetch();

        if (!$row || (int)$row['task_deleted'] === 1 || (int)$row['module_deleted'] === 1 || (int)$row['course_deleted'] === 1) {
            return ['allowed' => false, 'code' => 404, 'error' => 'Assignment not found or has been removed'];
        }

        // Administrators and Faculty Members have full access across all programs
        if ($userRole !== 'admin' && $userRole !== 'faculty' && $userRole !== 'instructor' && (int)$row['course_created_by'] !== $userId) {
            return ['allowed' => false, 'code' => 403, 'error' => 'You are not authorized to manage this assignment'];
        }

        return ['allowed' => true, 'task' => $row];
    }

    // -------------------------------------------------------------
    // VIDEO REFERENCE & BUNNY STREAM VALIDATION
    // -------------------------------------------------------------

    private static function validateVideoReference(string $contentType, ?string &$videoProvider, ?string &$mediaUrl): ?string {
        if ($contentType !== 'video') {
            $videoProvider = null;
            return null;
        }

        $mediaUrl = trim((string)$mediaUrl);
        if ($mediaUrl === '') {
            return 'Video reference or URL is required for video lectures';
        }

        // Default provider detection if not explicitly set
        if (empty($videoProvider)) {
            if (preg_match('/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/', $mediaUrl)) {
                $videoProvider = 'bunny_stream';
            } elseif (stripos($mediaUrl, 'youtu') !== false) {
                $videoProvider = 'youtube';
            } elseif (stripos($mediaUrl, 'vimeo') !== false) {
                $videoProvider = 'vimeo';
            } else {
                $videoProvider = 'direct';
            }
        }

        if ($videoProvider === 'bunny_stream') {
            if (preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $mediaUrl, $m)) {
                $mediaUrl = strtolower($m[0]);
                // Confirm video existence server-side against configured Bunny library without logging credentials
                if (class_exists('BunnyStreamService')) {
                    $config = BunnyStreamService::getConfig();
                    if (!empty($config['api_key'])) {
                        $details = BunnyStreamService::fetchVideoDetails($mediaUrl);
                        if (!$details || empty($details['guid'])) {
                            return 'Video not found in configured Bunny Stream library (' . htmlspecialchars($config['library_id']) . '). Please verify the Video ID.';
                        }
                    }
                }
            } else {
                return 'Invalid Bunny Video ID format. Expected a 36-character UUID format (e.g. 0de41d3a-4d1d-498b-b731-bcc31a59ffc2).';
            }
        }

        return null;
    }

    // -------------------------------------------------------------
    // PUBLIC / CATALOG LISTINGS
    // -------------------------------------------------------------

    public static function listPublished() {
        $pdo = Database::getConnection();

        $sql = "
            SELECT 
                c.id, c.title, c.slug, c.category, c.level, c.duration, c.partner_type,
                c.rating, c.reviews_count, c.badge_text, c.description, c.thumbnail_url,
                c.skills, c.what_you_will_learn, c.is_published, c.created_at,
                u.full_name AS instructor_name, u.title AS instructor_title, u.avatar AS instructor_avatar,
                COUNT(DISTINCT m.id) AS module_count,
                COUNT(DISTINCT l.id) AS lesson_count,
                COUNT(DISTINCT t.id) AS task_count
            FROM courses c
            JOIN users u ON c.created_by = u.id
            LEFT JOIN modules m ON (c.id = m.course_id AND m.is_deleted = 0)
            LEFT JOIN lessons l ON (m.id = l.module_id AND l.is_deleted = 0)
            LEFT JOIN tasks t ON (m.id = t.module_id AND t.is_deleted = 0)
            WHERE c.is_published = 1 AND c.is_deleted = 0
            GROUP BY c.id
            ORDER BY c.created_at DESC
        ";

        $stmt = $pdo->query($sql);
        $courses = $stmt->fetchAll();

        foreach ($courses as &$course) {
            $course['skills'] = json_decode($course['skills'] ?? '[]', true) ?: [];
            $course['what_you_will_learn'] = json_decode($course['what_you_will_learn'] ?? '[]', true) ?: [];
            $course['instructor'] = [
                'name' => $course['instructor_name'],
                'title' => $course['instructor_title'] ?? 'Faculty Member',
                'avatar' => $course['instructor_avatar'] ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
            ];

            $courseId = (int)$course['id'];
            $modStmt = $pdo->prepare("
                SELECT id, course_id, title, estimated_time, description, sequence_order, created_at 
                FROM modules 
                WHERE course_id = ? AND is_deleted = 0
                ORDER BY sequence_order ASC
            ");
            $modStmt->execute([$courseId]);
            $modules = $modStmt->fetchAll();

            foreach ($modules as &$mod) {
                $moduleId = (int)$mod['id'];
                $lessonStmt = $pdo->prepare("
                    SELECT id, module_id, title, content_type, video_provider, duration, media_url, sequence_order, is_free_preview, is_published, created_at, content_body
                    FROM lessons
                    WHERE module_id = ? AND is_deleted = 0
                    ORDER BY sequence_order ASC
                ");
                $lessonStmt->execute([$moduleId]);
                $mod['lessons'] = $lessonStmt->fetchAll();

                $taskStmt = $pdo->prepare("
                    SELECT id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory, created_at
                    FROM tasks
                    WHERE module_id = ? AND is_deleted = 0
                    ORDER BY id ASC
                ");
                $taskStmt->execute([$moduleId]);
                $mod['tasks'] = $taskStmt->fetchAll();
            }
            $course['modules'] = $modules;
        }

        return ['success' => true, 'courses' => $courses];
    }

    public static function getDetails($idOrSlug, $currentUserId = null) {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT c.*, u.full_name AS instructor_name, u.title AS instructor_title, u.avatar AS instructor_avatar
            FROM courses c
            JOIN users u ON c.created_by = u.id
            WHERE (c.id = ? OR c.slug = ?) AND c.is_deleted = 0
            LIMIT 1
        ");
        $stmt->execute([$idOrSlug, $idOrSlug]);
        $course = $stmt->fetch();

        if (!$course) {
            self::setHttpStatus(404);
            return ['success' => false, 'error' => 'Program not found'];
        }

        $courseId = (int)$course['id'];
        $course['skills'] = json_decode($course['skills'] ?? '[]', true) ?: [];
        $course['what_you_will_learn'] = json_decode($course['what_you_will_learn'] ?? '[]', true) ?: [];
        $course['instructor'] = [
            'name' => $course['instructor_name'],
            'title' => $course['instructor_title'] ?? 'Faculty Member',
            'department' => 'Aaroha Institute of Technology',
            'avatar' => $course['instructor_avatar'] ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            'bio' => 'Experienced systems educator and architect delivering enterprise-grade engineering programs.',
            'rating' => 4.94,
            'students' => '25,000+'
        ];

        $isEnrolled = false;
        $enrollmentId = null;
        if ($currentUserId) {
            $enrollStmt = $pdo->prepare("
                SELECT id, status FROM enrollments 
                WHERE user_id = ? AND course_id = ? AND status = 'active'
                LIMIT 1
            ");
            $enrollStmt->execute([$currentUserId, $courseId]);
            $enrollment = $enrollStmt->fetch();
            if ($enrollment) {
                $isEnrolled = true;
                $enrollmentId = (int)$enrollment['id'];
            }
        }

        $completedLessonIds = [];
        if ($enrollmentId) {
            $progStmt = $pdo->prepare("
                SELECT lesson_id FROM lesson_progress 
                WHERE enrollment_id = ? AND is_completed = 1
            ");
            $progStmt->execute([$enrollmentId]);
            $completedLessonIds = $progStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        $modStmt = $pdo->prepare("
            SELECT id, course_id, title, estimated_time, description, sequence_order 
            FROM modules 
            WHERE course_id = ? AND is_deleted = 0
            ORDER BY sequence_order ASC
        ");
        $modStmt->execute([$courseId]);
        $modules = $modStmt->fetchAll();

        foreach ($modules as &$mod) {
            $moduleId = (int)$mod['id'];
            $lesStmt = $pdo->prepare("
                SELECT id, module_id, title, content_type, video_provider, duration, media_url, sequence_order, is_free_preview, is_published, content_body
                FROM lessons 
                WHERE module_id = ? AND is_deleted = 0
                ORDER BY sequence_order ASC
            ");
            $lesStmt->execute([$moduleId]);
            $lessons = $lesStmt->fetchAll();

            foreach ($lessons as &$l) {
                $l['is_completed'] = in_array((int)$l['id'], $completedLessonIds);
                if (!$isEnrolled && empty($l['is_free_preview'])) {
                    $l['content_body'] = null;
                }
            }
            $mod['lessons'] = $lessons;

            $taskStmt = $pdo->prepare("
                SELECT id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory 
                FROM tasks 
                WHERE module_id = ? AND is_deleted = 0
                ORDER BY id ASC
            ");
            $taskStmt->execute([$moduleId]);
            $mod['tasks'] = $taskStmt->fetchAll();
        }

        $course['modules'] = $modules;
        $course['is_enrolled'] = $isEnrolled;

        return ['success' => true, 'course' => $course];
    }

    // -------------------------------------------------------------
    // COURSE CRUD (FACULTY / ADMIN)
    // -------------------------------------------------------------

    public static function createCourse($data, $adminId, $userRole = 'admin') {
        if ($userRole !== 'admin' && $userRole !== 'instructor' && $userRole !== 'faculty') {
            self::setHttpStatus(403);
            return ['success' => false, 'error' => 'Faculty or administrative privileges required'];
        }

        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $thumbnailUrl = trim($data['thumbnail_url'] ?? 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80');
        $category = trim($data['category'] ?? 'Cloud Architecture');
        $level = trim($data['level'] ?? 'Advanced Level');
        $duration = trim($data['duration'] ?? '8 Weeks');
        $partnerType = trim($data['partner_type'] ?? 'Specialization');
        $badgeText = trim($data['badge_text'] ?? 'New');
        $skills = is_array($data['skills'] ?? null) ? json_encode($data['skills']) : json_encode(['Cloud Architecture', 'Distributed Systems']);
        $whatYouWillLearn = is_array($data['what_you_will_learn'] ?? null) ? json_encode($data['what_you_will_learn']) : json_encode(['Master core principles and architectures', 'Complete evaluated deliverable projects']);
        $isPublished = isset($data['is_published']) ? (int)(bool)$data['is_published'] : 1;

        if (empty($title)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Course title is required'];
        }

        $slug = trim($data['slug'] ?? '');
        if (empty($slug)) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title));
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO courses 
            (title, slug, category, level, duration, partner_type, badge_text, description, thumbnail_url, skills, what_you_will_learn, is_published, is_deleted, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $title, $slug, $category, $level, $duration, $partnerType, $badgeText, 
            $description, $thumbnailUrl, $skills, $whatYouWillLearn, $isPublished, $adminId
        ]);
        $newId = (int)$pdo->lastInsertId();

        self::setHttpStatus(201);
        return [
            'success' => true,
            'message' => 'Course created successfully',
            'course_id' => $newId,
            'course' => [
                'id' => $newId,
                'title' => $title,
                'slug' => $slug,
                'category' => $category,
                'level' => $level,
                'duration' => $duration,
                'partner_type' => $partnerType,
                'rating' => 4.90,
                'reviews_count' => 'New',
                'badge_text' => $badgeText,
                'description' => $description,
                'thumbnail_url' => $thumbnailUrl,
                'skills' => json_decode($skills, true) ?: [],
                'what_you_will_learn' => json_decode($whatYouWillLearn, true) ?: [],
                'is_published' => $isPublished,
                'created_by' => $adminId,
                'modules' => []
            ]
        ];
    }

    public static function updateCourse(int $courseId, $data, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkCourseOwnership($pdo, $courseId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        $existing = $auth['course'];
        $title = isset($data['title']) && trim($data['title']) !== '' ? trim($data['title']) : $existing['title'];
        if (empty($title)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Course title is required'];
        }

        $slug = isset($data['slug']) && trim($data['slug']) !== '' ? trim($data['slug']) : $existing['slug'];
        if (empty($slug)) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title));
        }

        $category = isset($data['category']) && trim($data['category']) !== '' ? trim($data['category']) : $existing['category'];
        $level = isset($data['level']) && trim($data['level']) !== '' ? trim($data['level']) : $existing['level'];
        $duration = isset($data['duration']) && trim($data['duration']) !== '' ? trim($data['duration']) : $existing['duration'];
        $partnerType = isset($data['partner_type']) && trim($data['partner_type']) !== '' ? trim($data['partner_type']) : $existing['partner_type'];
        $badgeText = array_key_exists('badge_text', $data) ? trim((string)$data['badge_text']) : $existing['badge_text'];
        $description = isset($data['description']) && trim($data['description']) !== '' ? trim($data['description']) : $existing['description'];
        $thumbnailUrl = isset($data['thumbnail_url']) && trim($data['thumbnail_url']) !== '' ? trim($data['thumbnail_url']) : $existing['thumbnail_url'];
        $skills = isset($data['skills']) ? (is_array($data['skills']) ? json_encode($data['skills']) : (is_string($data['skills']) ? $data['skills'] : json_encode([]))) : $existing['skills'];
        $whatYouWillLearn = isset($data['what_you_will_learn']) ? (is_array($data['what_you_will_learn']) ? json_encode($data['what_you_will_learn']) : (is_string($data['what_you_will_learn']) ? $data['what_you_will_learn'] : json_encode([]))) : $existing['what_you_will_learn'];
        $isPublished = isset($data['is_published']) ? (int)(bool)$data['is_published'] : (int)$existing['is_published'];

        $stmt = $pdo->prepare("
            UPDATE courses SET
                title = ?, slug = ?, category = ?, level = ?, duration = ?, partner_type = ?,
                badge_text = ?, description = ?, thumbnail_url = ?, skills = ?, what_you_will_learn = ?,
                is_published = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND is_deleted = 0
        ");
        $stmt->execute([
            $title, $slug, $category, $level, $duration, $partnerType,
            $badgeText, $description, $thumbnailUrl, $skills, $whatYouWillLearn,
            $isPublished, $courseId
        ]);

        return [
            'success' => true,
            'message' => 'Course updated successfully',
            'course' => [
                'id' => $courseId,
                'title' => $title,
                'slug' => $slug,
                'category' => $category,
                'level' => $level,
                'duration' => $duration,
                'partner_type' => $partnerType,
                'badge_text' => $badgeText,
                'description' => $description,
                'thumbnail_url' => $thumbnailUrl,
                'skills' => json_decode($skills, true) ?: [],
                'what_you_will_learn' => json_decode($whatYouWillLearn, true) ?: [],
                'is_published' => $isPublished
            ]
        ];
    }

    public static function deleteCourse(int $courseId, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkCourseOwnership($pdo, $courseId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        try {
            // Soft-delete course row only (no cascading deletes); relational joins in PlaybackController,
            // listPublished, and getDetails automatically exclude descendant modules, lessons, and tasks.
            $stmt = $pdo->prepare("UPDATE courses SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$courseId]);

            // Synchronize soft-deletion to fallback SQLite database if file exists
            self::syncDeleteToSqlite($courseId);

            return [
                'success' => true,
                'message' => 'Course successfully archived. Historical enrollments and student records have been preserved.',
                'course_id' => $courseId
            ];
        } catch (\Throwable $e) {
            self::setHttpStatus(500);
            return ['success' => false, 'error' => 'Database operation failed: ' . $e->getMessage()];
        }
    }

    private static function syncDeleteToSqlite(int $courseId): void {
        try {
            if (!extension_loaded('pdo_sqlite') || !class_exists('PDO') || !in_array('sqlite', PDO::getAvailableDrivers())) {
                return;
            }
            $sqliteCandidates = [
                __DIR__ . '/../config/lms.sqlite',
                __DIR__ . '/../../database/lms.sqlite',
                dirname(__DIR__, 2) . '/database/lms.sqlite',
                __DIR__ . '/lms.sqlite',
            ];
            foreach ($sqliteCandidates as $cand) {
                if (file_exists($cand) && is_writable($cand)) {
                    try {
                        $sqlitePdo = new PDO("sqlite:{$cand}", null, null, [
                            PDO::ATTR_ERRMODE => PDO::ERRMODE_SILENT,
                        ]);
                        $stmt = $sqlitePdo->prepare("UPDATE courses SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
                        $stmt->execute([$courseId]);
                    } catch (\Throwable $sqle) {}
                }
            }
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------
    // MODULE CRUD (FACULTY / ADMIN)
    // -------------------------------------------------------------

    public static function createModule(int $courseId, $data, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkCourseOwnership($pdo, $courseId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        $title = trim($data['title'] ?? '');
        $estimatedTime = trim($data['estimated_time'] ?? '5 hours to complete');
        $description = trim($data['description'] ?? '');

        if (empty($title)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Module title required'];
        }

        $seqStmt = $pdo->prepare("SELECT COALESCE(MAX(sequence_order), 0) + 1 FROM modules WHERE course_id = ?");
        $seqStmt->execute([$courseId]);
        $nextOrder = (int)$seqStmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO modules (course_id, title, estimated_time, description, sequence_order, is_deleted, created_at)
            VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$courseId, $title, $estimatedTime, $description, $nextOrder]);
        $newId = (int)$pdo->lastInsertId();

        self::setHttpStatus(201);
        return [
            'success' => true,
            'message' => 'Module created successfully',
            'module_id' => $newId,
            'module' => [
                'id' => $newId,
                'course_id' => $courseId,
                'title' => $title,
                'estimated_time' => $estimatedTime,
                'description' => $description,
                'sequence_order' => $nextOrder,
                'lessons' => [],
                'tasks' => []
            ]
        ];
    }

    public static function updateModule(int $moduleId, $data, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkModuleOwnership($pdo, $moduleId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        $existing = $auth['module'];
        $title = isset($data['title']) && trim($data['title']) !== '' ? trim($data['title']) : $existing['title'];
        if (empty($title)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Module title required'];
        }

        $estimatedTime = isset($data['estimated_time']) ? trim($data['estimated_time']) : $existing['estimated_time'];
        $description = isset($data['description']) ? trim($data['description']) : $existing['description'];

        $stmt = $pdo->prepare("
            UPDATE modules SET title = ?, estimated_time = ?, description = ?
            WHERE id = ? AND is_deleted = 0
        ");
        $stmt->execute([$title, $estimatedTime, $description, $moduleId]);

        return [
            'success' => true,
            'message' => 'Module updated successfully',
            'module' => [
                'id' => $moduleId,
                'course_id' => (int)$auth['module']['course_id'],
                'title' => $title,
                'estimated_time' => $estimatedTime,
                'description' => $description
            ]
        ];
    }

    public static function deleteModule(int $moduleId, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkModuleOwnership($pdo, $moduleId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        try {
            // Soft-delete module row only (no cascading deletes); relational joins in PlaybackController
            // and getDetails automatically exclude descendant lessons and tasks without modifying child rows.
            $stmt = $pdo->prepare("UPDATE modules SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$moduleId]);

            return [
                'success' => true,
                'message' => 'Module successfully archived.',
                'module_id' => $moduleId
            ];
        } catch (\Throwable $e) {
            self::setHttpStatus(500);
            return ['success' => false, 'error' => 'Database operation failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------
    // LESSON / LECTURE CRUD (FACULTY / ADMIN)
    // -------------------------------------------------------------

    public static function createLesson(int $moduleId, $data, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkModuleOwnership($pdo, $moduleId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        $title = trim($data['title'] ?? '');
        $contentType = $data['content_type'] ?? 'article';
        $duration = trim($data['duration'] ?? '20 min');
        $contentBody = $data['content_body'] ?? '';
        $mediaUrl = $data['media_url'] ?? null;
        $videoProvider = $data['video_provider'] ?? null;
        $isFreePreview = !empty($data['is_free_preview']) ? 1 : 0;
        $isPublished = isset($data['is_published']) ? (int)(bool)$data['is_published'] : 1;

        if (empty($title)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Lesson title required'];
        }

        $valErr = self::validateVideoReference($contentType, $videoProvider, $mediaUrl);
        if ($valErr) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => $valErr];
        }

        $seqStmt = $pdo->prepare("SELECT COALESCE(MAX(sequence_order), 0) + 1 FROM lessons WHERE module_id = ?");
        $seqStmt->execute([$moduleId]);
        $nextOrder = (int)$seqStmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO lessons 
            (module_id, title, content_type, video_provider, duration, content_body, media_url, sequence_order, is_free_preview, is_published, is_deleted, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $moduleId, $title, $contentType, $videoProvider, $duration, 
            $contentBody, $mediaUrl, $nextOrder, $isFreePreview, $isPublished
        ]);
        $newId = (int)$pdo->lastInsertId();

        self::setHttpStatus(201);
        return [
            'success' => true,
            'message' => 'Lesson created successfully',
            'lesson_id' => $newId,
            'lesson' => [
                'id' => $newId,
                'module_id' => $moduleId,
                'title' => $title,
                'content_type' => $contentType,
                'video_provider' => $videoProvider,
                'duration' => $duration,
                'content_body' => $contentBody,
                'media_url' => $mediaUrl,
                'sequence_order' => $nextOrder,
                'is_free_preview' => (bool)$isFreePreview,
                'is_published' => (bool)$isPublished
            ]
        ];
    }

    public static function updateLesson(int $lessonId, $data, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkLessonOwnership($pdo, $lessonId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        $existing = $auth['lesson'];
        $title = isset($data['title']) && trim($data['title']) !== '' ? trim($data['title']) : $existing['title'];
        if (empty($title)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Lecture title is required'];
        }

        $contentType = $data['content_type'] ?? $existing['content_type'];
        $duration = isset($data['duration']) && trim($data['duration']) !== '' ? trim($data['duration']) : $existing['duration'];
        $contentBody = array_key_exists('content_body', $data) ? $data['content_body'] : $existing['content_body'];
        $mediaUrl = array_key_exists('media_url', $data) ? $data['media_url'] : $existing['media_url'];
        $videoProvider = array_key_exists('video_provider', $data) ? $data['video_provider'] : $existing['video_provider'];
        $isFreePreview = isset($data['is_free_preview']) ? (int)(bool)$data['is_free_preview'] : (int)$existing['is_free_preview'];
        $isPublished = isset($data['is_published']) ? (int)(bool)$data['is_published'] : (int)$existing['is_published'];

        $valErr = self::validateVideoReference($contentType, $videoProvider, $mediaUrl);
        if ($valErr) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => $valErr];
        }

        $stmt = $pdo->prepare("
            UPDATE lessons SET
                title = ?, content_type = ?, video_provider = ?, duration = ?,
                content_body = ?, media_url = ?, is_free_preview = ?, is_published = ?
            WHERE id = ? AND is_deleted = 0
        ");
        $stmt->execute([
            $title, $contentType, $videoProvider, $duration,
            $contentBody, $mediaUrl, $isFreePreview, $isPublished,
            $lessonId
        ]);

        return [
            'success' => true,
            'message' => 'Lecture updated successfully',
            'lesson' => [
                'id' => $lessonId,
                'module_id' => (int)$auth['lesson']['module_id'],
                'title' => $title,
                'content_type' => $contentType,
                'video_provider' => $videoProvider,
                'duration' => $duration,
                'content_body' => $contentBody,
                'media_url' => $mediaUrl,
                'is_free_preview' => (bool)$isFreePreview,
                'is_published' => (bool)$isPublished
            ]
        ];
    }

    public static function deleteLesson(int $lessonId, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkLessonOwnership($pdo, $lessonId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        // Soft delete lecture: preserves student historical progress and completion records.
        // Underlying Bunny Stream video file is intentionally not deleted.
        $stmt = $pdo->prepare("UPDATE lessons SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$lessonId]);

        return [
            'success' => true,
            'message' => 'Lecture archived successfully. Student historical completion records have been preserved.',
            'lesson_id' => $lessonId
        ];
    }

    // -------------------------------------------------------------
    // TASK / ASSIGNMENT CRUD (FACULTY / ADMIN)
    // -------------------------------------------------------------

    public static function createTask(int $moduleId, $data, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkModuleOwnership($pdo, $moduleId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        $title = trim($data['title'] ?? '');
        $instructions = trim($data['instructions'] ?? '');
        $taskType = $data['task_type'] ?? 'text_response';
        $maxScore = (int)($data['max_score'] ?? 100);
        $passingScore = (int)($data['passing_score'] ?? 75);

        if (empty($title) || empty($instructions)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Task title and instructions required'];
        }

        $stmt = $pdo->prepare("
            INSERT INTO tasks (module_id, title, instructions, task_type, max_score, passing_score, is_mandatory, is_deleted, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$moduleId, $title, $instructions, $taskType, $maxScore, $passingScore]);
        $newId = (int)$pdo->lastInsertId();

        self::setHttpStatus(201);
        return [
            'success' => true,
            'message' => 'Task created successfully',
            'task_id' => $newId,
            'task' => [
                'id' => $newId,
                'module_id' => $moduleId,
                'title' => $title,
                'instructions' => $instructions,
                'task_type' => $taskType,
                'max_score' => $maxScore,
                'passing_score' => $passingScore,
                'is_mandatory' => true
            ]
        ];
    }

    public static function updateTask(int $taskId, $data, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkTaskOwnership($pdo, $taskId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        $existing = $auth['task'];
        $title = isset($data['title']) && trim($data['title']) !== '' ? trim($data['title']) : $existing['title'];
        $instructions = isset($data['instructions']) && trim($data['instructions']) !== '' ? trim($data['instructions']) : $existing['instructions'];
        $taskType = $data['task_type'] ?? $existing['task_type'];
        $maxScore = isset($data['max_score']) ? (int)$data['max_score'] : (int)$existing['max_score'];
        $passingScore = isset($data['passing_score']) ? (int)$data['passing_score'] : (int)$existing['passing_score'];

        if (empty($title) || empty($instructions)) {
            self::setHttpStatus(400);
            return ['success' => false, 'error' => 'Assignment title and instructions required'];
        }

        $stmt = $pdo->prepare("
            UPDATE tasks SET
                title = ?, instructions = ?, task_type = ?, max_score = ?, passing_score = ?
            WHERE id = ? AND is_deleted = 0
        ");
        $stmt->execute([$title, $instructions, $taskType, $maxScore, $passingScore, $taskId]);

        return [
            'success' => true,
            'message' => 'Assignment updated successfully',
            'task' => [
                'id' => $taskId,
                'module_id' => (int)$auth['task']['module_id'],
                'title' => $title,
                'instructions' => $instructions,
                'task_type' => $taskType,
                'max_score' => $maxScore,
                'passing_score' => $passingScore,
                'is_mandatory' => true
            ]
        ];
    }

    public static function deleteTask(int $taskId, int $userId, string $userRole) {
        $pdo = Database::getConnection();
        $auth = self::checkTaskOwnership($pdo, $taskId, $userId, $userRole);
        if (!$auth['allowed']) {
            self::setHttpStatus($auth['code']);
            return ['success' => false, 'error' => $auth['error']];
        }

        // Soft delete task: preserves existing student submissions, evaluation scores, and faculty feedback
        $stmt = $pdo->prepare("UPDATE tasks SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$taskId]);

        return [
            'success' => true,
            'message' => 'Assignment archived successfully. Existing student submissions and evaluation grades have been preserved.',
            'task_id' => $taskId
        ];
    }
}
