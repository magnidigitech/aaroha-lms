<?php
// Aaroha LMS - Course & Curriculum Controller
require_once __DIR__ . '/../config/database.php';

class CourseController {
    // Public: List all published courses with module, lecture, and task counts
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
            LEFT JOIN modules m ON c.id = m.course_id
            LEFT JOIN lessons l ON m.id = l.module_id
            LEFT JOIN tasks t ON m.id = t.module_id
            WHERE c.is_published = 1
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

            // Attach modules with lessons and tasks
            $courseId = (int)$course['id'];
            $modStmt = $pdo->prepare("
                SELECT id, course_id, title, estimated_time, description, sequence_order, created_at 
                FROM modules 
                WHERE course_id = ? 
                ORDER BY sequence_order ASC
            ");
            $modStmt->execute([$courseId]);
            $modules = $modStmt->fetchAll();

            foreach ($modules as &$mod) {
                $moduleId = (int)$mod['id'];
                $lessonStmt = $pdo->prepare("
                    SELECT id, module_id, title, content_type, duration, media_url, sequence_order, is_free_preview, created_at, content_body
                    FROM lessons
                    WHERE module_id = ?
                    ORDER BY sequence_order ASC
                ");
                $lessonStmt->execute([$moduleId]);
                $mod['lessons'] = $lessonStmt->fetchAll();

                $taskStmt = $pdo->prepare("
                    SELECT id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory, created_at
                    FROM tasks
                    WHERE module_id = ?
                    ORDER BY id ASC
                ");
                $taskStmt->execute([$moduleId]);
                $mod['tasks'] = $taskStmt->fetchAll();
            }
            $course['modules'] = $modules;
        }

        return ['success' => true, 'courses' => $courses];
    }

    // Public / Enrolled: Get course syllabus with content gating
    public static function getDetails($idOrSlug, $currentUserId = null) {
        $pdo = Database::getConnection();

        // 1. Fetch course info
        $stmt = $pdo->prepare("
            SELECT c.*, u.full_name AS instructor_name, u.title AS instructor_title, u.avatar AS instructor_avatar
            FROM courses c
            JOIN users u ON c.created_by = u.id
            WHERE (c.id = ? OR c.slug = ?)
            LIMIT 1
        ");
        $stmt->execute([$idOrSlug, $idOrSlug]);
        $course = $stmt->fetch();

        if (!$course) {
            http_response_code(404);
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

        // 2. Check if student is actively enrolled
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

        // 3. Fetch completed lessons if enrolled
        $completedLessonIds = [];
        if ($enrollmentId) {
            $progStmt = $pdo->prepare("
                SELECT lesson_id FROM lesson_progress
                WHERE enrollment_id = ? AND is_completed = 1
            ");
            $progStmt->execute([$enrollmentId]);
            $completedLessonIds = $progStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        // 4. Fetch Modules, Lessons, and Tasks
        $modStmt = $pdo->prepare("
            SELECT id, course_id, title, estimated_time, description, sequence_order, created_at 
            FROM modules 
            WHERE course_id = ? 
            ORDER BY sequence_order ASC
        ");
        $modStmt->execute([$courseId]);
        $modules = $modStmt->fetchAll();

        foreach ($modules as &$mod) {
            $moduleId = (int)$mod['id'];

            // Fetch lessons in module
            $lessonStmt = $pdo->prepare("
                SELECT id, module_id, title, content_type, duration, media_url, sequence_order, is_free_preview, created_at,
                       content_body
                FROM lessons
                WHERE module_id = ?
                ORDER BY sequence_order ASC
            ");
            $lessonStmt->execute([$moduleId]);
            $lessons = $lessonStmt->fetchAll();

            // Content Gating: If not enrolled and not free preview, strip full body
            foreach ($lessons as &$lesson) {
                $isLessonCompleted = in_array((int)$lesson['id'], $completedLessonIds);
                $lesson['is_completed'] = $isLessonCompleted;

                if (!$isEnrolled && !(bool)$lesson['is_free_preview']) {
                    $lesson['content_body'] = null;
                    $lesson['media_url'] = null;
                    $lesson['is_locked'] = true;
                } else {
                    $lesson['is_locked'] = false;
                }
            }
            $mod['lessons'] = $lessons;

            // Fetch tasks in module
            $taskStmt = $pdo->prepare("
                SELECT id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory, created_at
                FROM tasks
                WHERE module_id = ?
                ORDER BY id ASC
            ");
            $taskStmt->execute([$moduleId]);
            $mod['tasks'] = $taskStmt->fetchAll();
        }

        $course['is_enrolled'] = $isEnrolled;
        $course['modules'] = $modules;

        return ['success' => true, 'course' => $course];
    }

    // Admin: Create new course
    public static function createCourse($data, $adminId) {
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
            http_response_code(400);
            return ['success' => false, 'error' => 'Course title is required'];
        }

        $slug = trim($data['slug'] ?? '');
        if (empty($slug)) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title));
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO courses 
            (title, slug, category, level, duration, partner_type, badge_text, description, thumbnail_url, skills, what_you_will_learn, is_published, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        $stmt->execute([
            $title, $slug, $category, $level, $duration, $partnerType, $badgeText, 
            $description, $thumbnailUrl, $skills, $whatYouWillLearn, $isPublished, $adminId
        ]);
        $newId = (int)$pdo->lastInsertId();

        http_response_code(201);
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

    // Admin: Add Module to course
    public static function createModule($courseId, $data) {
        $title = trim($data['title'] ?? '');
        $estimatedTime = trim($data['estimated_time'] ?? '5 hours to complete');
        $description = trim($data['description'] ?? '');

        if (empty($title)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Module title required'];
        }

        $pdo = Database::getConnection();
        
        // Find next sequence order
        $seqStmt = $pdo->prepare("SELECT COALESCE(MAX(sequence_order), 0) + 1 FROM modules WHERE course_id = ?");
        $seqStmt->execute([$courseId]);
        $nextOrder = (int)$seqStmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO modules (course_id, title, estimated_time, description, sequence_order, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$courseId, $title, $estimatedTime, $description, $nextOrder]);

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Module created successfully',
            'module_id' => (int)$pdo->lastInsertId()
        ];
    }

    // Admin: Add Lesson to module
    public static function createLesson($moduleId, $data) {
        $title = trim($data['title'] ?? '');
        $contentType = $data['content_type'] ?? 'article';
        $duration = trim($data['duration'] ?? '20 min');
        $contentBody = $data['content_body'] ?? '';
        $mediaUrl = $data['media_url'] ?? null;
        $isFreePreview = !empty($data['is_free_preview']) ? 1 : 0;

        if (empty($title)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Lesson title required'];
        }

        $pdo = Database::getConnection();

        $seqStmt = $pdo->prepare("SELECT COALESCE(MAX(sequence_order), 0) + 1 FROM lessons WHERE module_id = ?");
        $seqStmt->execute([$moduleId]);
        $nextOrder = (int)$seqStmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO lessons (module_id, title, content_type, duration, content_body, media_url, sequence_order, is_free_preview, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$moduleId, $title, $contentType, $duration, $contentBody, $mediaUrl, $nextOrder, $isFreePreview]);

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Lesson created successfully',
            'lesson_id' => (int)$pdo->lastInsertId()
        ];
    }

    // Admin: Add Task to module
    public static function createTask($moduleId, $data) {
        $title = trim($data['title'] ?? '');
        $instructions = trim($data['instructions'] ?? '');
        $taskType = $data['task_type'] ?? 'text_response';
        $maxScore = (int)($data['max_score'] ?? 100);
        $passingScore = (int)($data['passing_score'] ?? 75);

        if (empty($title) || empty($instructions)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Task title and instructions required'];
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO tasks (module_id, title, instructions, task_type, max_score, passing_score, is_mandatory, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        $stmt->execute([$moduleId, $title, $instructions, $taskType, $maxScore, $passingScore]);

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Task created successfully',
            'task_id' => (int)$pdo->lastInsertId()
        ];
    }
}
