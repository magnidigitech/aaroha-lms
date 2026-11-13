<?php
// Aaroha LMS - Authenticated Lesson Playback Controller
// Enforces access control (course publication, active & unexpired enrollment, role authorization)
// Issues time-limited signed playback tokens for Bunny Stream videos using standard SHA-256.
// Security: Never returns signing keys or API keys to the browser.
// Caching: Emits Cache-Control: no-store to prevent credential caching by intermediaries.

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/BunnyStreamService.php';

class PlaybackController {
    /**
     * Get authorized playback session for a specific lesson
     *
     * @param int $lessonId Target lesson ID
     * @param array $user Authenticated user payload from JWT
     * @return array Response payload
     */
    public static function getPlaybackSession(int $lessonId, array $user): array {
        // Enforce zero-cache headers for all playback token responses
        if (!headers_sent()) {
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            header('Expires: 0');
        }

        $pdo = Database::getConnection();
        $userId = (int)($user['id'] ?? 0);
        $userRole = (string)($user['role'] ?? 'student');

        // 1. Fetch lesson details along with parent module and course metadata
        $stmt = $pdo->prepare("
            SELECT 
                l.id AS lesson_id, 
                l.title AS lesson_title, 
                l.content_type, 
                l.duration, 
                l.media_url, 
                l.is_free_preview,
                l.is_published AS lesson_published,
                l.is_deleted AS lesson_deleted,
                m.id AS module_id, 
                m.title AS module_title,
                m.is_deleted AS module_deleted,
                c.id AS course_id, 
                c.title AS course_title, 
                c.is_published AS course_published,
                c.is_deleted AS course_deleted,
                c.created_by AS course_created_by
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE l.id = ?
            LIMIT 1
        ");
        $stmt->execute([$lessonId]);
        $lesson = $stmt->fetch();

        if (!$lesson) {
            if (!headers_sent()) http_response_code(404);
            return [
                'success' => false,
                'error' => 'Lesson not found',
                'code' => 'LESSON_NOT_FOUND'
            ];
        }

        // Reject new playback requests for deleted lessons or lessons under deleted modules/courses
        if ((int)($lesson['lesson_deleted'] ?? 0) === 1 || 
            (int)($lesson['module_deleted'] ?? 0) === 1 || 
            (int)($lesson['course_deleted'] ?? 0) === 1) {
            if (!headers_sent()) http_response_code(404);
            return [
                'success' => false,
                'error' => 'This lecture has been archived or removed',
                'code' => 'LESSON_DELETED'
            ];
        }

        $courseId = (int)$lesson['course_id'];
        $courseCreatedBy = (int)($lesson['course_created_by'] ?? 0);
        $isFreePreview = (bool)$lesson['is_free_preview'];
        $coursePublished = (bool)($lesson['course_published'] ?? 1);
        $lessonPublished = isset($lesson['lesson_published']) ? (bool)$lesson['lesson_published'] : true;

        // Faculty preview authorization: restricted to authorized faculty of this specific course, or any admin
        $isAuthorizedFaculty = ($userRole === 'admin' || (($userRole === 'faculty' || $userRole === 'instructor') && $courseCreatedBy === $userId));

        // 2. Publication Gate:
        // Unpublished courses and unpublished lessons are strictly restricted to the authorized faculty member who created the course
        if (!$coursePublished || !$lessonPublished) {
            if (!$isAuthorizedFaculty) {
                if (!headers_sent()) http_response_code(403);
                $code = !$coursePublished ? 'COURSE_UNPUBLISHED' : 'LESSON_UNPUBLISHED';
                $msg = !$coursePublished 
                    ? 'This course is currently unpublished. Preview access is restricted to authorized course faculty.'
                    : 'This lesson is currently unpublished. Preview access is restricted to authorized course faculty.';
                return [
                    'success' => false,
                    'error' => $msg,
                    'code' => $code,
                    'course_id' => $courseId,
                    'lesson_id' => $lessonId
                ];
            }
        }

        // 3. Authorization check:
        // - Authorized faculty member for THIS course has full preview/playback access
        // - All other users (students and other faculty not assigned to this course) MUST have an active and unexpired enrollment
        $isAuthorized = false;

        if ($isAuthorizedFaculty) {
            $isAuthorized = true;
        } else {
            // Verify active enrollment strictly in this parent course
            $enrStmt = $pdo->prepare("
                SELECT id, status, expires_at 
                FROM enrollments 
                WHERE user_id = ? AND course_id = ?
                ORDER BY id DESC
                LIMIT 1
            ");
            $enrStmt->execute([$userId, $courseId]);
            $enrollment = $enrStmt->fetch();

            if ($enrollment) {
                $status = (string)$enrollment['status'];
                $expiresAt = $enrollment['expires_at'] ?? null;
                $isExpired = false;

                if (!empty($expiresAt)) {
                    $expTime = strtotime($expiresAt);
                    if ($expTime !== false && $expTime < time()) {
                        $isExpired = true;
                    }
                }

                if ($isExpired || $status === 'expired') {
                    if (!headers_sent()) http_response_code(403);
                    return [
                        'success' => false,
                        'error' => 'Your course enrollment has expired. Please renew your enrollment.',
                        'code' => 'ENROLLMENT_EXPIRED',
                        'course_id' => $courseId,
                        'course_title' => $lesson['course_title']
                    ];
                }

                if ($status === 'dropped') {
                    if (!headers_sent()) http_response_code(403);
                    return [
                        'success' => false,
                        'error' => 'Your enrollment in this course was dropped.',
                        'code' => 'ENROLLMENT_DROPPED',
                        'course_id' => $courseId,
                        'course_title' => $lesson['course_title']
                    ];
                }

                if ($status === 'active') {
                    $isAuthorized = true;
                }
            } elseif ($isFreePreview) {
                // Free preview lessons are authorized for unenrolled users
                $isAuthorized = true;
            }
        }

        if (!$isAuthorized) {
            if (!headers_sent()) http_response_code(403);
            return [
                'success' => false,
                'error' => 'Access denied: You must have an active enrollment in this course to access this lecture playback.',
                'code' => 'ENROLLMENT_REQUIRED',
                'course_id' => $courseId,
                'course_title' => $lesson['course_title']
            ];
        }

        // 4. Extract video identifier and determine video provider
        $rawMediaUrl = (string)($lesson['media_url'] ?? '');
        $isBunny = BunnyStreamService::isBunnyStream($rawMediaUrl);
        $videoId = BunnyStreamService::extractVideoId($rawMediaUrl);

        // Fallback: If media_url is empty but videoId is requested, or defaults
        if (!$videoId && $isBunny) {
            $videoId = BunnyStreamService::getConfig()['library_id'];
        }

        // 5. Generate signed expiring playback credentials if Bunny Stream
        // Token is generated using standard SHA-256 digest of concatenated strings (token_key + videoId + expires)
        if ($isBunny && $videoId) {
            // Expire token in 3600 seconds (1 hour)
            $playbackSession = BunnyStreamService::generatePlaybackSession($videoId, 3600);

            if (!headers_sent()) http_response_code(200);
            return [
                'success' => true,
                'lesson_id' => (int)$lesson['lesson_id'],
                'lesson_title' => $lesson['lesson_title'],
                'course_id' => $courseId,
                'playback' => $playbackSession
            ];
        }

        // 6. Non-Bunny Stream playback (e.g. YouTube, Vimeo, direct MP4)
        if (!headers_sent()) http_response_code(200);
        return [
            'success' => true,
            'lesson_id' => (int)$lesson['lesson_id'],
            'lesson_title' => $lesson['lesson_title'],
            'course_id' => $courseId,
            'playback' => [
                'provider' => 'standard',
                'media_url' => $rawMediaUrl,
                'content_type' => $lesson['content_type'],
                'duration' => $lesson['duration'],
            ]
        ];
    }
}
