<?php
// Aaroha LMS - Content Ownership, Publishing Permissions & Audience Enforcement Controller
// Handles destination routing, audience scoping, approval workflows, version preservation, and decoupled notifications.

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/AuditLogger.php';

class PublishingController {

    /**
     * Helper: Check if actor is an administrator (super_admin, admin, coordinator)
     */
    public static function isAdminRole($role) {
        return in_array($role, ['super_admin', 'admin', 'coordinator']);
    }

    /**
     * Helper: Check if faculty is assigned to a specific batch
     */
    public static function isFacultyAssignedToBatch($facultyId, $batchId) {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM batches b
            LEFT JOIN faculty_batch_assignments fba ON b.id = fba.batch_id
            WHERE (b.lead_faculty_id = ? OR fba.faculty_id = ?) AND b.id = ?
        ");
        $stmt->execute([(int)$facultyId, (int)$facultyId, (int)$batchId]);
        return (int)$stmt->fetchColumn() > 0;
    }

    /**
     * Helper: Check if faculty is assigned to a specific course
     */
    public static function isFacultyAssignedToCourse($facultyId, $courseId) {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM batches b
            LEFT JOIN faculty_batch_assignments fba ON b.id = fba.batch_id
            WHERE (b.lead_faculty_id = ? OR fba.faculty_id = ?) AND b.course_id = ?
        ");
        $stmt->execute([(int)$facultyId, (int)$facultyId, (int)$courseId]);
        return (int)$stmt->fetchColumn() > 0;
    }

    /**
     * 1. GET AUDIENCE COUNT
     * Calculates the recipient count for a given audience scope before publishing.
     * Enforces permissions: Faculty cannot target all students or all faculty.
     */
    public static function getAudienceCount($audienceType, $audienceId, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $count = 0;
        $scopeLabel = '';

        switch ($audienceType) {
            case 'all_students':
                if (!$isAdmin) {
                    return [
                        'success' => false,
                        'error' => 'Permission denied: Only administrators can broadcast to all students.'
                    ];
                }
                $stmt = $pdo->query("
                    SELECT COUNT(*) 
                    FROM users u
                    LEFT JOIN student_profiles sp ON u.id = sp.user_id
                    WHERE u.role = 'student' AND (sp.account_status = 'active' OR sp.account_status IS NULL)
                ");
                $count = (int)$stmt->fetchColumn();
                $scopeLabel = 'All Enrolled Students';
                break;

            case 'all_faculty':
                if (!in_array($role, ['super_admin', 'admin'])) {
                    return [
                        'success' => false,
                        'error' => 'Permission denied: Only administrators can broadcast to all faculty.'
                    ];
                }
                $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role IN ('faculty', 'instructor')");
                $count = (int)$stmt->fetchColumn();
                $scopeLabel = 'All Faculty Members';
                break;

            case 'course_enrolled':
                $courseId = (int)$audienceId;
                if (!$isAdmin) {
                    if (!self::isFacultyAssignedToCourse($actorId, $courseId)) {
                        return [
                            'success' => false,
                            'error' => 'Permission denied: Faculty can only target assigned courses.'
                        ];
                    }
                }
                $stmt = $pdo->prepare("
                    SELECT COUNT(DISTINCT user_id) 
                    FROM enrollments 
                    WHERE course_id = ? AND status = 'active'
                ");
                $stmt->execute([$courseId]);
                $count = (int)$stmt->fetchColumn();

                $cStmt = $pdo->prepare("SELECT title FROM courses WHERE id = ?");
                $cStmt->execute([$courseId]);
                $cTitle = $cStmt->fetchColumn() ?: 'Course #' . $courseId;
                $scopeLabel = 'Course: ' . $cTitle;
                break;

            case 'batch_enrolled':
                $batchId = (int)$audienceId;
                if (!$isAdmin) {
                    if (!self::isFacultyAssignedToBatch($actorId, $batchId)) {
                        return [
                            'success' => false,
                            'error' => 'Permission denied: Faculty can only target assigned batches.'
                        ];
                    }
                }
                $stmt = $pdo->prepare("
                    SELECT COUNT(DISTINCT user_id) 
                    FROM batch_enrollments 
                    WHERE batch_id = ? AND status = 'active'
                ");
                $stmt->execute([$batchId]);
                $count = (int)$stmt->fetchColumn();

                $bStmt = $pdo->prepare("SELECT title, batch_code FROM batches WHERE id = ?");
                $bStmt->execute([$batchId]);
                $bData = $bStmt->fetch();
                $scopeLabel = 'Batch: ' . ($bData ? $bData['title'] . ' (' . $bData['batch_code'] . ')' : '#' . $batchId);
                break;

            case 'individual':
                $targetUserId = (int)$audienceId;
                $stmt = $pdo->prepare("SELECT id, full_name, email FROM users WHERE id = ?");
                $stmt->execute([$targetUserId]);
                $targetUser = $stmt->fetch();
                if ($targetUser) {
                    $count = 1;
                    $scopeLabel = 'Individual: ' . $targetUser['full_name'] . ' (' . $targetUser['email'] . ')';
                } else {
                    $count = 0;
                    $scopeLabel = 'Individual not found';
                }
                break;

            default:
                return [
                    'success' => false,
                    'error' => 'Invalid audience type: ' . $audienceType
                ];
        }

        return [
            'success' => true,
            'audience_type' => $audienceType,
            'audience_id' => $audienceId,
            'recipient_count' => $count,
            'scope_label' => $scopeLabel
        ];
    }

    /**
     * 2. LEARNING MATERIALS LISTING (ROLE-SCOPED)
     */
    public static function getMaterials($actor, $queryParams = []) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $userId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $params = [];
        $where = [];

        // Destination filter
        if (!empty($queryParams['destination'])) {
            $where[] = "lm.destination = ?";
            $params[] = $queryParams['destination'];
        }

        // Status filter
        if (!empty($queryParams['status'])) {
            $where[] = "lm.status = ?";
            $params[] = $queryParams['status'];
        }

        // Course filter
        if (!empty($queryParams['course_id'])) {
            $where[] = "lm.course_id = ?";
            $params[] = (int)$queryParams['course_id'];
        }

        // Batch filter
        if (!empty($queryParams['batch_id'])) {
            $where[] = "lm.batch_id = ?";
            $params[] = (int)$queryParams['batch_id'];
        }

        // Search term
        if (!empty($queryParams['search'])) {
            $where[] = "(lm.title LIKE ? OR lm.description LIKE ?)";
            $params[] = '%' . $queryParams['search'] . '%';
            $params[] = '%' . $queryParams['search'] . '%';
        }

        // Role-based visibility enforcement
        if ($role === 'student') {
            // Students can ONLY see published items where scheduled_release_at <= now
            $where[] = "lm.status = 'published'";
            $where[] = "lm.approval_status = 'approved'";
            $where[] = "(lm.scheduled_release_at IS NULL OR lm.scheduled_release_at <= CURRENT_TIMESTAMP)";
            
            // Student audience restriction: must belong to enrolled courses or batches or individual
            $where[] = "(
                (lm.audience_type = 'all_students') OR
                (lm.audience_type = 'course_enrolled' AND lm.audience_id IN (SELECT course_id FROM enrollments WHERE user_id = ? AND status = 'active')) OR
                (lm.audience_type = 'batch_enrolled' AND lm.audience_id IN (SELECT batch_id FROM batch_enrollments WHERE user_id = ? AND status = 'active')) OR
                (lm.audience_type = 'individual' AND lm.audience_id = ?)
            )";
            $params[] = $userId;
            $params[] = $userId;
            $params[] = $userId;
        } elseif ($role === 'faculty' || $role === 'instructor') {
            // Faculty can see materials for their assigned courses/batches OR materials they uploaded
            if (!$isAdmin) {
                $where[] = "(
                    lm.uploaded_by = ? OR
                    lm.batch_id IN (
                        SELECT b.id FROM batches b
                        LEFT JOIN faculty_batch_assignments fba ON b.id = fba.batch_id
                        WHERE b.lead_faculty_id = ? OR fba.faculty_id = ?
                    ) OR
                    lm.course_id IN (
                        SELECT b.course_id FROM batches b
                        LEFT JOIN faculty_batch_assignments fba ON b.id = fba.batch_id
                        WHERE b.lead_faculty_id = ? OR fba.faculty_id = ?
                    )
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
            }
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "
            SELECT lm.*, 
                   c.title as course_title, c.slug as course_slug,
                   b.title as batch_title, b.batch_code,
                   u.full_name as author_name, u.role as author_role
            FROM learning_materials lm
            LEFT JOIN courses c ON lm.course_id = c.id
            LEFT JOIN batches b ON lm.batch_id = b.id
            LEFT JOIN users u ON lm.uploaded_by = u.id
            {$whereClause}
            ORDER BY lm.created_at DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $materials = $stmt->fetchAll();

        return [
            'success' => true,
            'count' => count($materials),
            'materials' => $materials
        ];
    }

    /**
     * 3. CREATE LEARNING MATERIAL
     * Enforces explicit destinations, faculty restrictions, audience calculation, and audit logging.
     */
    public static function createMaterial($data, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        if ($role === 'student') {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Students cannot create learning materials.'];
        }

        $title = trim($data['title'] ?? '');
        if (!$title) {
            return ['success' => false, 'error' => 'Material title is required.'];
        }

        $courseId = !empty($data['course_id']) ? (int)$data['course_id'] : null;
        if (!$courseId) {
            return ['success' => false, 'error' => 'Valid course assignment is required.'];
        }

        $batchId = !empty($data['batch_id']) ? (int)$data['batch_id'] : null;
        $materialType = $data['material_type'] ?? 'document';
        $fileUrl = $data['file_url'] ?? null;
        $externalUrl = $data['external_url'] ?? null;
        $description = $data['description'] ?? null;
        $fileSize = $data['file_size'] ?? null;
        $fileType = $data['file_type'] ?? null;
        $moduleId = !empty($data['module_id']) ? (int)$data['module_id'] : null;
        $lessonId = !empty($data['lesson_id']) ? (int)$data['lesson_id'] : null;
        $sessionId = !empty($data['session_id']) ? (int)$data['session_id'] : null;

        // Destination default: private_lms
        $destination = $data['destination'] ?? 'private_lms';
        if (!in_array($destination, ['private_lms', 'public_website', 'both'])) {
            $destination = 'private_lms';
        }

        // Audience type selection
        $audienceType = $data['audience_type'] ?? ($batchId ? 'batch_enrolled' : 'course_enrolled');
        $audienceId = !empty($data['audience_id']) ? (int)$data['audience_id'] : ($batchId ? $batchId : $courseId);

        // Faculty restrictions check
        if (!$isAdmin) {
            // Faculty must be assigned to this course / batch
            if ($batchId && !self::isFacultyAssignedToBatch($actorId, $batchId)) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Faculty can only create materials for their assigned batches.'];
            }
            if (!self::isFacultyAssignedToCourse($actorId, $courseId)) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Faculty can only create materials for their assigned courses.'];
            }
            // Faculty cannot target all students or all faculty
            if (in_array($audienceType, ['all_students', 'all_faculty'])) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Faculty cannot broadcast to all students or all faculty.'];
            }
        }

        // Calculate recipient count
        $audRes = self::getAudienceCount($audienceType, $audienceId, $actor);
        $recipientCount = $audRes['success'] ? (int)$audRes['recipient_count'] : 0;

        // Status & Approval workflow
        $status = $data['status'] ?? 'published';
        $approvalStatus = 'approved';
        $scheduledReleaseAt = !empty($data['scheduled_release_at']) ? $data['scheduled_release_at'] : null;

        if ($status === 'scheduled' && !$scheduledReleaseAt) {
            return ['success' => false, 'error' => 'Scheduled release time is required for scheduled materials.'];
        }

        // Critical Rule: If faculty creates public content, it MUST be queued for admin review!
        if (!$isAdmin && in_array($destination, ['public_website', 'both'])) {
            $status = 'pending_review';
            $approvalStatus = 'pending_review';
        }

        // Decoupled notification handling
        $notifyAudience = !empty($data['notify_audience']) ? 1 : 0;
        $notificationStatus = ($status === 'published' && $notifyAudience === 1) ? 'queued' : 'none';

        $stmt = $pdo->prepare("
            INSERT INTO learning_materials (
                title, description, material_type, file_url, external_url, file_size, file_type,
                course_id, module_id, lesson_id, batch_id, session_id,
                destination, status, approval_status, audience_type, audience_id, recipient_count,
                notify_audience, notification_status, scheduled_release_at, uploaded_by, is_published, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        ");

        $isPublished = ($status === 'published') ? 1 : 0;

        $stmt->execute([
            $title, $description, $materialType, $fileUrl, $externalUrl, $fileSize, $fileType,
            $courseId, $moduleId, $lessonId, $batchId, $sessionId,
            $destination, $status, $approvalStatus, $audienceType, $audienceId, $recipientCount,
            $notifyAudience, $notificationStatus, $scheduledReleaseAt, $actorId, $isPublished
        ]);

        $materialId = (int)$pdo->lastInsertId();

        AuditLogger::log(
            'CREATE_LEARNING_MATERIAL',
            'learning_materials',
            $materialId,
            [
                'title' => $title,
                'destination' => $destination,
                'status' => $status,
                'approval_status' => $approvalStatus,
                'audience_type' => $audienceType,
                'recipient_count' => $recipientCount,
                'notify_audience' => $notifyAudience
            ],
            $actor
        );

        return [
            'success' => true,
            'message' => ($status === 'pending_review') 
                ? 'Material submitted for public website review.' 
                : 'Learning material created successfully.',
            'material_id' => $materialId,
            'status' => $status,
            'approval_status' => $approvalStatus,
            'recipient_count' => $recipientCount,
            'destination' => $destination
        ];
    }

    /**
     * 4. UPDATE LEARNING MATERIAL (VERSION PRESERVATION & REVISION SAFETY)
     * If an approved public item is edited, preserves live version snapshot and marks revised version pending review.
     */
    public static function updateMaterial($id, $data, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $stmt = $pdo->prepare("SELECT * FROM learning_materials WHERE id = ?");
        $stmt->execute([(int)$id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Material not found.'];
        }

        // Ownership or Admin check
        if (!$isAdmin && (int)$existing['uploaded_by'] !== $actorId) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Cannot edit material uploaded by another faculty member.'];
        }

        $title = isset($data['title']) ? trim($data['title']) : $existing['title'];
        $description = isset($data['description']) ? $data['description'] : $existing['description'];
        $fileUrl = isset($data['file_url']) ? $data['file_url'] : $existing['file_url'];
        $externalUrl = isset($data['external_url']) ? $data['external_url'] : $existing['external_url'];
        $destination = isset($data['destination']) ? $data['destination'] : $existing['destination'];
        $audienceType = isset($data['audience_type']) ? $data['audience_type'] : $existing['audience_type'];
        $audienceId = isset($data['audience_id']) ? (int)$data['audience_id'] : $existing['audience_id'];

        $liveVersionData = $existing['live_version_data'];
        $status = $existing['status'];
        $approvalStatus = $existing['approval_status'];

        // Versioning & Permissions Rule:
        // 1) Editing an approved public item must not bypass approval! Keep approved version live until revised version is approved.
        // 2) Faculty setting destination to public_website or both must require review.
        if (!$isAdmin && (in_array($destination, ['public_website', 'both']) || in_array($existing['destination'], ['public_website', 'both']))) {
            if ($existing['approval_status'] === 'approved' && in_array($existing['destination'], ['public_website', 'both'])) {
                // Faculty edit on approved public item: preserve snapshot of existing approved version
                if (empty($liveVersionData)) {
                    $liveVersionData = json_encode([
                        'title' => $existing['title'],
                        'description' => $existing['description'],
                        'file_url' => $existing['file_url'],
                        'external_url' => $existing['external_url'],
                        'material_type' => $existing['material_type'],
                        'destination' => $existing['destination'],
                        'updated_at' => $existing['updated_at']
                    ], JSON_UNESCAPED_SLASHES);
                }
            }
            $approvalStatus = 'pending_review';
        }

        // Decoupled notification handling: Do NOT re-notify on minor edits unless explicitly requested!
        $notifyAudience = !empty($data['notify_audience']) ? 1 : 0;
        $notificationStatus = $existing['notification_status'];
        if ($notifyAudience === 1 && $status === 'published') {
            $notificationStatus = 'queued';
        }

        // Recalculate recipient count
        $audRes = self::getAudienceCount($audienceType, $audienceId, $actor);
        $recipientCount = $audRes['success'] ? (int)$audRes['recipient_count'] : $existing['recipient_count'];

        $updStmt = $pdo->prepare("
            UPDATE learning_materials
            SET title = ?, description = ?, file_url = ?, external_url = ?,
                destination = ?, audience_type = ?, audience_id = ?, recipient_count = ?,
                live_version_data = ?, approval_status = ?, notification_status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");

        $updStmt->execute([
            $title, $description, $fileUrl, $externalUrl,
            $destination, $audienceType, $audienceId, $recipientCount,
            $liveVersionData, $approvalStatus, $notificationStatus,
            (int)$id
        ]);

        AuditLogger::log(
            'UPDATE_LEARNING_MATERIAL',
            'learning_materials',
            $id,
            [
                'title' => $title,
                'destination' => $destination,
                'approval_status' => $approvalStatus,
                'has_preserved_live_version' => !empty($liveVersionData),
                're_notified' => ($notifyAudience === 1)
            ],
            $actor
        );

        return [
            'success' => true,
            'message' => ($approvalStatus === 'pending_review') 
                ? 'Edits saved as draft revision awaiting admin approval. Live version remains visible.' 
                : 'Material updated successfully.',
            'material_id' => (int)$id,
            'approval_status' => $approvalStatus,
            'has_preserved_live_version' => !empty($liveVersionData)
        ];
    }

    /**
     * 5. PUBLISH MATERIAL NOW OR SCHEDULE
     */
    public static function publishMaterial($id, $data, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $stmt = $pdo->prepare("SELECT * FROM learning_materials WHERE id = ?");
        $stmt->execute([(int)$id]);
        $material = $stmt->fetch();

        if (!$material) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Material not found.'];
        }

        if (!$isAdmin && (int)$material['uploaded_by'] !== $actorId) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Cannot publish material uploaded by another faculty.'];
        }

        $scheduleAt = !empty($data['scheduled_release_at']) ? $data['scheduled_release_at'] : null;
        $notifyAudience = !empty($data['notify_audience']) ? 1 : 0;

        $newStatus = 'published';
        $approvalStatus = $material['approval_status'];

        if ($scheduleAt && strtotime($scheduleAt) > time()) {
            $newStatus = 'scheduled';
        }

        // If material destination is public and actor is not admin, cannot publish directly
        if (!$isAdmin && in_array($material['destination'], ['public_website', 'both'])) {
            $newStatus = 'pending_review';
            $approvalStatus = 'pending_review';
        }

        $notifStatus = ($newStatus === 'published' && $notifyAudience === 1) ? 'queued' : 'none';

        $upd = $pdo->prepare("
            UPDATE learning_materials
            SET status = ?, approval_status = ?, scheduled_release_at = ?, 
                is_published = ?, notify_audience = ?, notification_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $isPub = ($newStatus === 'published') ? 1 : 0;
        $upd->execute([$newStatus, $approvalStatus, $scheduleAt, $isPub, $notifyAudience, $notifStatus, (int)$id]);

        AuditLogger::log(
            'PUBLISH_LEARNING_MATERIAL',
            'learning_materials',
            $id,
            ['status' => $newStatus, 'scheduled_release_at' => $scheduleAt, 'notify_audience' => $notifyAudience],
            $actor
        );

        return [
            'success' => true,
            'message' => ($newStatus === 'scheduled') ? 'Material scheduled for release.' : 'Material published successfully.',
            'status' => $newStatus,
            'approval_status' => $approvalStatus,
            'notification_status' => $notifStatus
        ];
    }

    /**
     * 6. UNPUBLISH MATERIAL
     */
    public static function unpublishMaterial($id, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $stmt = $pdo->prepare("SELECT * FROM learning_materials WHERE id = ?");
        $stmt->execute([(int)$id]);
        $material = $stmt->fetch();

        if (!$material) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Material not found.'];
        }

        if (!$isAdmin && (int)$material['uploaded_by'] !== $actorId) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Cannot unpublish material uploaded by another faculty.'];
        }

        $upd = $pdo->prepare("
            UPDATE learning_materials
            SET status = 'draft', is_published = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $upd->execute([(int)$id]);

        AuditLogger::log(
            'UNPUBLISH_LEARNING_MATERIAL',
            'learning_materials',
            $id,
            ['action' => 'unpublish_to_draft'],
            $actor
        );

        return [
            'success' => true,
            'message' => 'Material unpublished and moved to draft.',
            'status' => 'draft'
        ];
    }

    /**
     * 7. DELETE MATERIAL
     */
    public static function deleteMaterial($id, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $stmt = $pdo->prepare("SELECT * FROM learning_materials WHERE id = ?");
        $stmt->execute([(int)$id]);
        $material = $stmt->fetch();

        if (!$material) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Material not found.'];
        }

        if (!$isAdmin && (int)$material['uploaded_by'] !== $actorId) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Cannot delete material uploaded by another faculty.'];
        }

        $del = $pdo->prepare("DELETE FROM learning_materials WHERE id = ?");
        $del->execute([(int)$id]);

        AuditLogger::log(
            'DELETE_LEARNING_MATERIAL',
            'learning_materials',
            $id,
            ['title' => $material['title']],
            $actor
        );

        return [
            'success' => true,
            'message' => 'Material deleted successfully.'
        ];
    }

    /**
     * 8. ANNOUNCEMENTS LISTING (ROLE-SCOPED)
     */
    public static function getAnnouncements($actor, $queryParams = []) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $userId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $params = [];
        $where = [];

        if (!empty($queryParams['destination'])) {
            $where[] = "a.destination = ?";
            $params[] = $queryParams['destination'];
        }

        if (!empty($queryParams['status'])) {
            $where[] = "a.status = ?";
            $params[] = $queryParams['status'];
        }

        if ($role === 'student') {
            $where[] = "a.status = 'published'";
            $where[] = "(
                (a.target_type = 'all_students') OR
                (a.target_type = 'course' AND a.target_id IN (SELECT course_id FROM enrollments WHERE user_id = ? AND status = 'active')) OR
                (a.target_type = 'batch' AND a.target_id IN (SELECT batch_id FROM batch_enrollments WHERE user_id = ? AND status = 'active')) OR
                (a.target_type = 'individual' AND a.target_id = ?)
            )";
            $params[] = $userId;
            $params[] = $userId;
            $params[] = $userId;
        } elseif ($role === 'faculty' || $role === 'instructor') {
            if (!$isAdmin) {
                $where[] = "(
                    a.author_id = ? OR
                    a.target_type IN ('all_faculty', 'all_students') OR
                    (a.target_type = 'batch' AND a.target_id IN (
                        SELECT b.id FROM batches b
                        LEFT JOIN faculty_batch_assignments fba ON b.id = fba.batch_id
                        WHERE b.lead_faculty_id = ? OR fba.faculty_id = ?
                    )) OR
                    (a.target_type = 'course' AND a.target_id IN (
                        SELECT b.course_id FROM batches b
                        LEFT JOIN faculty_batch_assignments fba ON b.id = fba.batch_id
                        WHERE b.lead_faculty_id = ? OR fba.faculty_id = ?
                    ))
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
            }
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $pdo->prepare("
            SELECT a.*, u.full_name as author_name, u.role as author_role, u.avatar as author_avatar
            FROM announcements a
            JOIN users u ON a.author_id = u.id
            {$whereClause}
            ORDER BY a.created_at DESC
        ");
        $stmt->execute($params);
        $announcements = $stmt->fetchAll();

        return [
            'success' => true,
            'count' => count($announcements),
            'announcements' => $announcements
        ];
    }

    /**
     * 9. CREATE ANNOUNCEMENT (WITH AUDIENCE VALIDATION & DECOUPLED NOTIFICATIONS)
     */
    public static function createAnnouncement($data, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        if ($role === 'student') {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Students cannot broadcast announcements.'];
        }

        $title = trim($data['title'] ?? '');
        $content = trim($data['content'] ?? '');
        if (!$title || !$content) {
            return ['success' => false, 'error' => 'Title and content are required.'];
        }

        $targetType = $data['target_type'] ?? 'all_students';
        $targetId = !empty($data['target_id']) ? (int)$data['target_id'] : null;
        $priority = $data['priority'] ?? 'normal';
        $sendEmail = !empty($data['send_email']) ? 1 : 0;
        $notifyAudience = !empty($data['notify_audience']) ? 1 : ($sendEmail ? 1 : 0);
        $destination = $data['destination'] ?? 'private_lms';

        // Faculty restrictions check
        if (!$isAdmin) {
            if (in_array($targetType, ['all_students', 'all_faculty'])) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Faculty cannot broadcast organization-wide announcements.'];
            }
            if ($targetType === 'batch' && !self::isFacultyAssignedToBatch($actorId, $targetId)) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Faculty can only target assigned batches.'];
            }
            if ($targetType === 'course' && !self::isFacultyAssignedToCourse($actorId, $targetId)) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Faculty can only target assigned courses.'];
            }
            if (in_array($destination, ['public_website', 'both'])) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Faculty cannot publish public announcements without administrator authorization.'];
            }
        }

        // Calculate recipient count
        $audMap = [
            'all_students' => 'all_students',
            'faculty' => 'all_faculty',
            'course' => 'course_enrolled',
            'batch' => 'batch_enrolled',
            'individual' => 'individual'
        ];
        $audType = $audMap[$targetType] ?? 'batch_enrolled';
        $audRes = self::getAudienceCount($audType, $targetId, $actor);
        $recipientCount = $audRes['success'] ? (int)$audRes['recipient_count'] : 0;

        $status = $data['status'] ?? 'published';
        $scheduledAt = !empty($data['scheduled_at']) ? $data['scheduled_at'] : null;

        if ($status === 'scheduled' && !$scheduledAt) {
            return ['success' => false, 'error' => 'Scheduled time is required for scheduled announcements.'];
        }

        $notificationStatus = ($status === 'published' && $notifyAudience === 1) ? 'queued' : 'none';

        $stmt = $pdo->prepare("
            INSERT INTO announcements (
                title, content, target_type, target_id, author_id, priority, destination,
                approval_status, scheduled_at, send_email, notify_audience, notification_status,
                recipient_count, status, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                'approved', ?, ?, ?, ?,
                ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        ");

        $stmt->execute([
            $title, $content, $targetType, $targetId, $actorId, $priority, $destination,
            $scheduledAt, $sendEmail, $notifyAudience, $notificationStatus,
            $recipientCount, $status
        ]);

        $annId = (int)$pdo->lastInsertId();

        AuditLogger::log(
            'CREATE_ANNOUNCEMENT',
            'announcements',
            $annId,
            [
                'title' => $title,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'recipient_count' => $recipientCount,
                'notify_audience' => $notifyAudience
            ],
            $actor
        );

        return [
            'success' => true,
            'message' => 'Announcement created and queued for audience.',
            'announcement_id' => $annId,
            'recipient_count' => $recipientCount,
            'notification_status' => $notificationStatus
        ];
    }

    /**
     * 10. PUBLIC SUBMISSIONS (ARTICLES, SHOWCASES, RESOURCES)
     */
    public static function getPublicShowcases($actor, $queryParams = []) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'guest';
        $userId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $params = [];
        $where = [];

        if (!empty($queryParams['content_type'])) {
            $where[] = "pwc.content_type = ?";
            $params[] = $queryParams['content_type'];
        }

        // Visibility rules
        if (!$isAdmin) {
            if ($role === 'faculty' || $role === 'instructor' || $role === 'student') {
                // Author can see their own submissions in any status; plus all approved and published
                $where[] = "(pwc.author_id = ? OR (pwc.status = 'published' AND pwc.approval_status = 'approved'))";
                $params[] = $userId;
            } else {
                // Public / Guest
                $where[] = "pwc.status = 'published'";
                $where[] = "pwc.approval_status = 'approved'";
            }
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $pdo->prepare("
            SELECT pwc.*, u.full_name as author_name, u.role as author_role, u.avatar as author_avatar,
                   rev.full_name as reviewer_name
            FROM public_website_content pwc
            JOIN users u ON pwc.author_id = u.id
            LEFT JOIN users rev ON pwc.reviewed_by = rev.id
            {$whereClause}
            ORDER BY pwc.created_at DESC
        ");
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        return [
            'success' => true,
            'count' => count($items),
            'items' => $items
        ];
    }

    /**
     * 11. FACULTY SUBMITS ARTICLE / SHOWCASE FOR ADMIN REVIEW
     */
    public static function createPublicSubmission($data, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);

        $title = trim($data['title'] ?? '');
        $contentType = $data['content_type'] ?? 'article';
        $summary = $data['summary'] ?? '';
        $body = $data['body'] ?? '';
        $mediaUrl = $data['media_url'] ?? null;
        $externalUrl = $data['external_url'] ?? null;
        $consentGiven = !empty($data['consent_given']) ? 1 : 0;

        if (!$title) {
            return ['success' => false, 'error' => 'Title is required.'];
        }

        // Slug generation
        $baseSlug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
        $slug = $baseSlug ?: 'submission-' . time();
        $chk = $pdo->prepare("SELECT COUNT(*) FROM public_website_content WHERE slug = ?");
        $chk->execute([$slug]);
        if ((int)$chk->fetchColumn() > 0) {
            $slug .= '-' . time();
        }

        // Always defaults to pending_review for faculty submissions
        $isAdmin = self::isAdminRole($role);
        $status = $isAdmin ? ($data['status'] ?? 'published') : 'pending_review';
        $approvalStatus = $isAdmin ? 'approved' : 'pending_review';
        $reviewedBy = $isAdmin ? $actorId : null;
        $reviewedAt = $isAdmin ? date('Y-m-d H:i:s') : null;
        $publishedAt = ($status === 'published') ? date('Y-m-d H:i:s') : null;

        $stmt = $pdo->prepare("
            INSERT INTO public_website_content (
                title, slug, content_type, summary, body, author_id, destination,
                status, approval_status, reviewed_by, reviewed_at, consent_given,
                media_url, external_url, is_featured, published_at, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, 'public_website',
                ?, ?, ?, ?, ?,
                ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        ");

        $stmt->execute([
            $title, $slug, $contentType, $summary, $body, $actorId,
            $status, $approvalStatus, $reviewedBy, $reviewedAt, $consentGiven,
            $mediaUrl, $externalUrl, $publishedAt
        ]);

        $subId = (int)$pdo->lastInsertId();

        AuditLogger::log(
            'SUBMIT_PUBLIC_CONTENT',
            'public_website_content',
            $subId,
            [
                'title' => $title,
                'slug' => $slug,
                'content_type' => $contentType,
                'status' => $status,
                'approval_status' => $approvalStatus
            ],
            $actor
        );

        return [
            'success' => true,
            'message' => ($status === 'pending_review') 
                ? 'Content submitted for administrative review before public publishing.' 
                : 'Public content published directly.',
            'id' => $subId,
            'slug' => $slug,
            'status' => $status,
            'approval_status' => $approvalStatus
        ];
    }

    /**
     * 12. ADMIN REVIEWS PUBLIC SUBMISSIONS (APPROVE, REQUEST CHANGES, REJECT)
     * Handles version promotion: If an approved item had an unapproved revision, approving promotes it and clears live_version_data.
     */
    public static function adminReviewPublicContent($contentType, $id, $action, $reviewNotes, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';
        $actorId = (int)($actor['id'] ?? 0);

        if (!self::isAdminRole($role)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Only administrators can review public content.'];
        }

        if (!in_array($action, ['approve', 'request_changes', 'reject'])) {
            return ['success' => false, 'error' => 'Invalid review action. Allowed: approve, request_changes, reject.'];
        }

        $now = date('Y-m-d H:i:s');

        if ($contentType === 'learning_material') {
            $stmt = $pdo->prepare("SELECT * FROM learning_materials WHERE id = ?");
            $stmt->execute([(int)$id]);
            $item = $stmt->fetch();
            if (!$item) return ['success' => false, 'error' => 'Material not found.'];

            if ($action === 'approve') {
                $upd = $pdo->prepare("
                    UPDATE learning_materials 
                    SET approval_status = 'approved', status = 'published', is_published = 1,
                        approved_by = ?, approved_at = ?, review_notes = ?, live_version_data = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $upd->execute([$actorId, $now, $reviewNotes, (int)$id]);
            } elseif ($action === 'request_changes') {
                $upd = $pdo->prepare("
                    UPDATE learning_materials 
                    SET approval_status = 'changes_requested', review_notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $upd->execute([$reviewNotes, (int)$id]);
            } else {
                $upd = $pdo->prepare("
                    UPDATE learning_materials 
                    SET approval_status = 'rejected', status = 'archived', review_notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $upd->execute([$reviewNotes, (int)$id]);
            }
        } else {
            // public_website_content
            $stmt = $pdo->prepare("SELECT * FROM public_website_content WHERE id = ?");
            $stmt->execute([(int)$id]);
            $item = $stmt->fetch();
            if (!$item) return ['success' => false, 'error' => 'Content submission not found.'];

            if ($action === 'approve') {
                $upd = $pdo->prepare("
                    UPDATE public_website_content 
                    SET approval_status = 'approved', status = 'published',
                        reviewed_by = ?, reviewed_at = ?, published_at = ?, review_notes = ?, live_version_data = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $upd->execute([$actorId, $now, $now, $reviewNotes, (int)$id]);
            } elseif ($action === 'request_changes') {
                $upd = $pdo->prepare("
                    UPDATE public_website_content 
                    SET approval_status = 'changes_requested', review_notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $upd->execute([$reviewNotes, (int)$id]);
            } else {
                $upd = $pdo->prepare("
                    UPDATE public_website_content 
                    SET approval_status = 'rejected', status = 'archived', review_notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $upd->execute([$reviewNotes, (int)$id]);
            }
        }

        AuditLogger::log(
            'REVIEW_PUBLIC_CONTENT',
            $contentType,
            $id,
            ['action' => $action, 'notes' => $reviewNotes],
            $actor
        );

        return [
            'success' => true,
            'message' => 'Review completed: ' . ucfirst(str_replace('_', ' ', $action)) . '.',
            'action' => $action,
            'item_id' => (int)$id
        ];
    }

    /**
     * 13. PUBLIC WEBSITE CONTENT (UNRESTRICTED ACCESS, STRIPPED PRIVATE LMS DATA)
     * Never exposes meeting links, private student rosters, grades, attendance, or internal notes.
     */
    public static function getPublicWebsiteContent($type = 'all', $slug = null) {
        $pdo = Database::getConnection();

        // 13.1 Single Content Item by Slug
        if ($slug) {
            $stmt = $pdo->prepare("
                SELECT pwc.id, pwc.title, pwc.slug, pwc.content_type, pwc.summary, pwc.body,
                       pwc.media_url, pwc.external_url, pwc.published_at, pwc.live_version_data,
                       u.full_name as author_name, u.title as author_title, u.avatar as author_avatar
                FROM public_website_content pwc
                JOIN users u ON pwc.author_id = u.id
                WHERE pwc.slug = ? AND pwc.status = 'published' AND pwc.approval_status = 'approved'
                LIMIT 1
            ");
            $stmt->execute([$slug]);
            $item = $stmt->fetch();

            if (!$item) {
                http_response_code(404);
                return ['success' => false, 'error' => 'Content not found or not published publicly.'];
            }

            // If a live version data snapshot exists, serve the approved snapshot!
            if (!empty($item['live_version_data'])) {
                $snap = json_decode($item['live_version_data'], true);
                if ($snap) {
                    $item['title'] = $snap['title'] ?? $item['title'];
                    $item['summary'] = $snap['summary'] ?? $item['summary'];
                    $item['body'] = $snap['body'] ?? $item['body'];
                }
            }
            unset($item['live_version_data']);

            return [
                'success' => true,
                'content' => $item
            ];
        }

        // 13.2 Courses Descriptions & Syllabus Summaries (Public only, private links stripped)
        $publicCourses = [];
        if ($type === 'all' || $type === 'courses') {
            $cStmt = $pdo->query("
                SELECT c.id, c.title, c.slug, c.description, c.thumbnail_url, c.duration,
                       c.level, c.prerequisites, c.what_you_will_learn, c.created_at
                FROM courses c
                WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
                ORDER BY c.id ASC
            ");
            $rawCourses = $cStmt->fetchAll();

            foreach ($rawCourses as $rc) {
                $cid = (int)$rc['id'];

                // Public syllabus overview (module titles and lesson titles only, NO meeting links or recordings)
                $modStmt = $pdo->prepare("
                    SELECT m.title as module_title, m.sequence_order,
                           (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND (l.is_deleted = 0 OR l.is_deleted IS NULL)) as lessons_count
                    FROM modules m
                    WHERE m.course_id = ?
                    ORDER BY m.sequence_order ASC
                ");
                $modStmt->execute([$cid]);
                $syllabus = $modStmt->fetchAll();

                // Upcoming public batch dates (no private meeting links or student counts)
                $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));
                $batchStmt = $pdo->prepare("
                    SELECT b.batch_code, b.title as batch_title, b.start_date, b.end_date, b.delivery_mode
                    FROM batches b
                    WHERE b.course_id = ? AND b.status = 'active' AND b.start_date >= ?
                    ORDER BY b.start_date ASC
                ");
                $batchStmt->execute([$cid, $thirtyDaysAgo]);
                $upcomingBatches = $batchStmt->fetchAll();

                $publicCourses[] = [
                    'id' => $cid,
                    'title' => $rc['title'],
                    'slug' => $rc['slug'],
                    'description' => $rc['description'],
                    'thumbnail_url' => $rc['thumbnail_url'],
                    'duration' => $rc['duration'],
                    'level' => $rc['level'],
                    'prerequisites' => $rc['prerequisites'],
                    'what_you_will_learn' => $rc['what_you_will_learn'],
                    'syllabus_overview' => $syllabus,
                    'upcoming_batches' => $upcomingBatches
                ];
            }
        }

        // 13.3 Public Showcases, Articles & Free Resources
        $articles = [];
        $showcases = [];
        $resources = [];

        if ($type === 'all' || in_array($type, ['articles', 'showcases', 'resources'])) {
            $pwcStmt = $pdo->query("
                SELECT pwc.id, pwc.title, pwc.slug, pwc.content_type, pwc.summary, pwc.media_url, 
                       pwc.external_url, pwc.published_at, pwc.is_featured,
                       u.full_name as author_name, u.title as author_title, u.avatar as author_avatar
                FROM public_website_content pwc
                JOIN users u ON pwc.author_id = u.id
                WHERE pwc.status = 'published' AND pwc.approval_status = 'approved'
                ORDER BY pwc.is_featured DESC, pwc.published_at DESC
            ");
            $allContent = $pwcStmt->fetchAll();

            foreach ($allContent as $item) {
                if ($item['content_type'] === 'article') $articles[] = $item;
                elseif ($item['content_type'] === 'project_showcase') $showcases[] = $item;
                elseif ($item['content_type'] === 'resource') $resources[] = $item;
            }
        }

        // 13.4 Public Faculty Bios (No phone numbers, salaries, or internal notes)
        $publicFaculty = [];
        if ($type === 'all' || $type === 'faculty') {
            $facStmt = $pdo->query("
                SELECT u.id, u.full_name, u.title, u.avatar, fp.bio, fp.expertise, fp.qualifications
                FROM users u
                LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
                WHERE u.role IN ('faculty', 'instructor')
                ORDER BY u.full_name ASC
            ");
            $publicFaculty = $facStmt->fetchAll();
        }

        return [
            'success' => true,
            'courses' => $publicCourses,
            'articles' => $articles,
            'project_showcases' => $showcases,
            'free_resources' => $resources,
            'faculty_bios' => $publicFaculty
        ];
    }

    /**
     * 14. ADMIN PUBLISHING QUEUES
     * Returns:
     * - Pending review items (Faculty submissions & public materials)
     * - Scheduled items
     * - Items requiring correction
     * - Notification delivery status
     */
    public static function getAdminPublishingQueues($actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'student';

        if (!self::isAdminRole($role)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Permission denied: Only administrators can inspect publishing queues.'];
        }

        // 14.1 Public content awaiting approval
        $pendingPwc = $pdo->query("
            SELECT pwc.*, u.full_name as author_name, u.role as author_role
            FROM public_website_content pwc
            JOIN users u ON pwc.author_id = u.id
            WHERE pwc.approval_status = 'pending_review'
            ORDER BY pwc.created_at ASC
        ")->fetchAll();

        $pendingMaterials = $pdo->query("
            SELECT lm.*, c.title as course_title, u.full_name as author_name
            FROM learning_materials lm
            LEFT JOIN courses c ON lm.course_id = c.id
            LEFT JOIN users u ON lm.uploaded_by = u.id
            WHERE lm.approval_status = 'pending_review'
            ORDER BY lm.created_at ASC
        ")->fetchAll();

        // 14.2 Scheduled publications
        $schedMaterials = $pdo->query("
            SELECT lm.*, c.title as course_title, u.full_name as author_name
            FROM learning_materials lm
            LEFT JOIN courses c ON lm.course_id = c.id
            LEFT JOIN users u ON lm.uploaded_by = u.id
            WHERE lm.status = 'scheduled'
            ORDER BY lm.scheduled_release_at ASC
        ")->fetchAll();

        $schedAnnouncements = $pdo->query("
            SELECT a.*, u.full_name as author_name
            FROM announcements a
            JOIN users u ON a.author_id = u.id
            WHERE a.status = 'scheduled'
            ORDER BY a.scheduled_at ASC
        ")->fetchAll();

        // 14.3 Content requiring correction (changes requested or rejected)
        $correctionItems = $pdo->query("
            SELECT pwc.id, pwc.title, pwc.content_type, pwc.approval_status, pwc.review_notes, pwc.updated_at,
                   u.full_name as author_name
            FROM public_website_content pwc
            JOIN users u ON pwc.author_id = u.id
            WHERE pwc.approval_status IN ('changes_requested', 'rejected')
            ORDER BY pwc.updated_at DESC
        ")->fetchAll();

        // 14.4 Delivery failures / tracking
        $deliveryFailures = $pdo->query("
            SELECT id, title, 'announcement' as entity_type, notification_status, recipient_count, created_at
            FROM announcements
            WHERE notification_status = 'failed'
            UNION ALL
            SELECT id, title, 'material' as entity_type, notification_status, recipient_count, created_at
            FROM learning_materials
            WHERE notification_status = 'failed'
        ")->fetchAll();

        return [
            'success' => true,
            'summary' => [
                'pending_approval_count' => count($pendingPwc) + count($pendingMaterials),
                'scheduled_count' => count($schedMaterials) + count($schedAnnouncements),
                'requiring_correction_count' => count($correctionItems),
                'delivery_failures_count' => count($deliveryFailures)
            ],
            'pending_review' => [
                'public_website_content' => $pendingPwc,
                'learning_materials' => $pendingMaterials
            ],
            'scheduled' => [
                'materials' => $schedMaterials,
                'announcements' => $schedAnnouncements
            ],
            'requiring_correction' => $correctionItems,
            'delivery_failures' => $deliveryFailures
        ];
    }

    /**
     * 15. SECURE MATERIAL DOWNLOAD / FILE ACCESS
     * Server-side audience access enforcement for files and direct links.
     */
    public static function secureDownloadMaterial($materialId, $actor) {
        $pdo = Database::getConnection();
        $role = $actor['role'] ?? 'guest';
        $userId = (int)($actor['id'] ?? 0);
        $isAdmin = self::isAdminRole($role);

        $stmt = $pdo->prepare("SELECT * FROM learning_materials WHERE id = ?");
        $stmt->execute([(int)$materialId]);
        $mat = $stmt->fetch();

        if (!$mat) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Material not found.'];
        }

        // If public and approved, allow public download
        if (in_array($mat['destination'], ['public_website', 'both']) && $mat['approval_status'] === 'approved') {
            return [
                'success' => true,
                'title' => $mat['title'],
                'file_url' => $mat['file_url'],
                'external_url' => $mat['external_url'],
                'material_type' => $mat['material_type']
            ];
        }

        // For private LMS content, user MUST be authenticated
        if (!$userId || $role === 'guest') {
            http_response_code(401);
            return ['success' => false, 'error' => 'Authentication required to access private LMS content.'];
        }

        // Admin has universal access
        if ($isAdmin) {
            return [
                'success' => true,
                'title' => $mat['title'],
                'file_url' => $mat['file_url'],
                'external_url' => $mat['external_url'],
                'material_type' => $mat['material_type']
            ];
        }

        // Faculty access check: must be uploader or assigned to course/batch
        if ($role === 'faculty' || $role === 'instructor') {
            if ((int)$mat['uploaded_by'] === $userId ||
                ($mat['batch_id'] && self::isFacultyAssignedToBatch($userId, $mat['batch_id'])) ||
                ($mat['course_id'] && self::isFacultyAssignedToCourse($userId, $mat['course_id']))) {
                return [
                    'success' => true,
                    'title' => $mat['title'],
                    'file_url' => $mat['file_url'],
                    'external_url' => $mat['external_url'],
                    'material_type' => $mat['material_type']
                ];
            }
            http_response_code(403);
            return ['success' => false, 'error' => 'Forbidden: You are not assigned to this course or batch.'];
        }

        // Student access check: must match audience scope and be published
        if ($role === 'student') {
            if ($mat['status'] !== 'published' || $mat['approval_status'] !== 'approved') {
                http_response_code(403);
                return ['success' => false, 'error' => 'Forbidden: This material is not published.'];
            }
            if ($mat['scheduled_release_at'] && strtotime($mat['scheduled_release_at']) > time()) {
                http_response_code(403);
                return ['success' => false, 'error' => 'Forbidden: This material has not yet reached its scheduled release time.'];
            }

            $isAuthorized = false;
            if ($mat['audience_type'] === 'all_students') {
                $isAuthorized = true;
            } elseif ($mat['audience_type'] === 'course_enrolled') {
                $chk = $pdo->prepare("SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'");
                $chk->execute([$userId, (int)$mat['audience_id']]);
                $isAuthorized = (int)$chk->fetchColumn() > 0;
            } elseif ($mat['audience_type'] === 'batch_enrolled') {
                $chk = $pdo->prepare("SELECT COUNT(*) FROM batch_enrollments WHERE user_id = ? AND batch_id = ? AND status = 'active'");
                $chk->execute([$userId, (int)$mat['audience_id']]);
                $isAuthorized = (int)$chk->fetchColumn() > 0;
            } elseif ($mat['audience_type'] === 'individual') {
                $isAuthorized = ((int)$mat['audience_id'] === $userId);
            }

            if ($isAuthorized) {
                return [
                    'success' => true,
                    'title' => $mat['title'],
                    'file_url' => $mat['file_url'],
                    'external_url' => $mat['external_url'],
                    'material_type' => $mat['material_type']
                ];
            }

            http_response_code(403);
            return ['success' => false, 'error' => 'Forbidden: You do not have enrollment access to this material.'];
        }

        http_response_code(403);
        return ['success' => false, 'error' => 'Access denied.'];
    }
}
