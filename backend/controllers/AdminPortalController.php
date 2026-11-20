<?php
// Aaroha LMS - Enterprise Admin Portal Controller
// Production-grade implementation for Hostinger LAMP / PHP 8.x
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/AuditLogger.php';

class AdminPortalController {

    public static function getPublicLmsUrl() {
        $envConfig = [];
        $candidates = [
            __DIR__ . '/../config/env.php',
            dirname(__DIR__, 2) . '/env.php'
        ];
        foreach ($candidates as $cand) {
            if (file_exists($cand)) {
                $envConfig = require $cand;
                break;
            }
        }
        if (!empty($envConfig['PUBLIC_LMS_URL'])) {
            return rtrim($envConfig['PUBLIC_LMS_URL'], '/');
        }
        if (!empty($envConfig['APP_URL'])) {
            return rtrim($envConfig['APP_URL'], '/');
        }
        $pdo = Database::getConnection();
        try {
            $settingStmt = $pdo->query("SELECT setting_value FROM system_settings WHERE setting_key = 'public_lms_url' OR setting_key = 'app_url' LIMIT 1");
            $val = $settingStmt ? $settingStmt->fetchColumn() : null;
            if (!empty($val)) {
                return rtrim($val, '/');
            }
        } catch (Exception $e) {}
        return 'https://lms.aaroha-inc.com';
    }

    // -------------------------------------------------------------
    // 1. DASHBOARD OVERVIEW & METRICS
    // -------------------------------------------------------------
    public static function getDashboardStats($user) {
        $pdo = Database::getConnection();

        // Active Students count
        $activeStudents = (int)$pdo->query("SELECT COUNT(*) FROM student_profiles WHERE account_status = 'active'")->fetchColumn();
        
        // Active Faculty count
        $activeFaculty = (int)$pdo->query("SELECT COUNT(*) FROM faculty_profiles WHERE account_status = 'active'")->fetchColumn();

        // Batches counts
        $activeBatches = (int)$pdo->query("SELECT COUNT(*) FROM batches WHERE status = 'active' AND is_deleted = 0")->fetchColumn();
        $upcomingBatches = (int)$pdo->query("SELECT COUNT(*) FROM batches WHERE status = 'upcoming' AND is_deleted = 0")->fetchColumn();

        // Today's classes count
        $today = date('Y-m-d');
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM class_sessions WHERE date(start_time) = ? AND status != 'cancelled'");
        $stmt->execute([$today]);
        $todayClasses = (int)$stmt->fetchColumn();

        // Pending Invitations
        $pendingInvitations = (int)$pdo->query("SELECT COUNT(*) FROM student_profiles WHERE account_status = 'invited'")->fetchColumn();

        // Assignments awaiting review
        $pendingSubmissions = (int)$pdo->query("SELECT COUNT(*) FROM task_submissions WHERE status = 'under_review'")->fetchColumn();

        // Overdue follow-ups count
        $pendingFollowups = (int)$pdo->query("SELECT COUNT(*) FROM student_followups WHERE status IN ('open', 'in_progress')")->fetchColumn();

        // Today's classes list preview
        $stmt = $pdo->prepare("
            SELECT cs.id, cs.topic, cs.start_time, cs.end_time, cs.session_type, cs.status, cs.meeting_link,
                   b.batch_code, b.title as batch_title, u.full_name as faculty_name
            FROM class_sessions cs
            JOIN batches b ON cs.batch_id = b.id
            JOIN users u ON cs.faculty_id = u.id
            WHERE date(cs.start_time) = ? AND cs.status != 'cancelled'
            ORDER BY cs.start_time ASC
            LIMIT 5
        ");
        $stmt->execute([$today]);
        $todaySchedule = $stmt->fetchAll();

        return [
            'success' => true,
            'stats' => [
                'active_students' => $activeStudents,
                'active_faculty' => $activeFaculty,
                'active_batches' => $activeBatches,
                'upcoming_batches' => $upcomingBatches,
                'today_classes' => $todayClasses,
                'pending_invitations' => $pendingInvitations,
                'assignments_awaiting_review' => $pendingSubmissions,
                'students_requiring_followup' => $pendingFollowups
            ],
            'today_classes_preview' => $todaySchedule
        ];
    }

    // -------------------------------------------------------------
    // 2. STUDENTS MANAGEMENT & ONBOARDING WORKFLOW
    // -------------------------------------------------------------
    public static function getStudents($queryParams = []) {
        $pdo = Database::getConnection();

        $search = trim($queryParams['search'] ?? '');
        $status = trim($queryParams['status'] ?? '');
        $view = trim($queryParams['view'] ?? 'active'); // 'active' | 'archived' | 'all'
        $courseId = !empty($queryParams['course_id']) ? (int)$queryParams['course_id'] : null;
        $batchId = !empty($queryParams['batch_id']) ? (int)$queryParams['batch_id'] : null;

        $sql = "
            SELECT u.id as id, u.id as user_id, u.full_name, u.email, u.avatar, u.status as user_status, u.is_archived,
                    sp.id as profile_id, sp.student_id_code, sp.mobile, sp.education, sp.experience_years,
                    sp.admission_date, sp.account_status, sp.admission_status, sp.enrollment_status,
                    sp.coordinator_id, sp.internal_notes, sp.created_at, sp.archived_at, sp.archival_reason,
                    sp.archived_enrolment_resolution, sp.withdrawn_at, sp.withdrawal_reason,
                    c.id as course_id, c.title as course_title,
                    b.id as batch_id, b.batch_code, b.title as batch_title,
                    coord.full_name as coordinator_name
            FROM users u
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN enrollments e ON u.id = e.user_id AND e.status = 'active'
            LEFT JOIN courses c ON e.course_id = c.id
            LEFT JOIN batch_enrollments be ON e.id = be.enrollment_id AND be.status = 'active'
            LEFT JOIN batches b ON be.batch_id = b.id
            LEFT JOIN users coord ON sp.coordinator_id = coord.id
            WHERE (u.role = 'student' OR u.authorized_roles_json LIKE '%\"student\"%' OR sp.id IS NOT NULL)
        ";

        $params = [];

        // Archival / Lifecycle view filter
        if ($view === 'archived') {
            $sql .= " AND (sp.account_status = 'archived' OR u.is_archived = 1) AND u.deleted_at IS NULL";
        } elseif ($view === 'all') {
            $sql .= " AND u.deleted_at IS NULL";
        } else {
            // Default active operational view: exclude archived and soft-deleted
            $sql .= " AND (sp.account_status != 'archived' OR sp.account_status IS NULL) AND (u.is_archived = 0 OR u.is_archived IS NULL) AND u.deleted_at IS NULL";
        }

        if ($search !== '') {
            $sql .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR sp.student_id_code LIKE ? OR sp.mobile LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($status !== '' && $status !== 'all') {
            $sql .= " AND sp.account_status = ?";
            $params[] = $status;
        }

        if ($courseId) {
            $sql .= " AND c.id = ?";
            $params[] = $courseId;
        }

        if ($batchId) {
            $sql .= " AND b.id = ?";
            $params[] = $batchId;
        }

        $sql .= " ORDER BY sp.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $students = $stmt->fetchAll();

        return [
            'success' => true,
            'count' => count($students),
            'students' => $students
        ];
    }

    public static function createStudent($data, $actor) {
        $pdo = Database::getConnection();

        $fullName = trim($data['full_name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $mobile = trim($data['mobile'] ?? '');
        $normalizedMobile = preg_replace('/[^0-9]/', '', $mobile);
        $courseId = !empty($data['course_id']) ? (int)$data['course_id'] : null;
        $batchId = !empty($data['batch_id']) ? (int)$data['batch_id'] : null;
        $education = trim($data['education'] ?? '');
        $experience = trim($data['experience_years'] ?? '');
        $coordinatorId = !empty($data['coordinator_id']) ? (int)$data['coordinator_id'] : $actor['id'];
        $internalNotes = trim($data['internal_notes'] ?? '');

        if (!$fullName || !$email) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Full name and email are mandatory.'];
        }

        // Check if user already exists (Account Reuse Pattern)
        $checkUser = $pdo->prepare("SELECT id, full_name, role FROM users WHERE email = ? LIMIT 1");
        $checkUser->execute([$email]);
        $existingUser = $checkUser->fetch();

        if ($existingUser) {
            $userId = (int)$existingUser['id'];

            // Check if student profile exists
            $spCheck = $pdo->prepare("SELECT student_id_code FROM student_profiles WHERE user_id = ? LIMIT 1");
            $spCheck->execute([$userId]);
            $spRow = $spCheck->fetch();
            $studentCode = $spRow ? $spRow['student_id_code'] : 'STU-REUSED';

            // If course enrollment requested, verify not already enrolled in this exact course
            if ($courseId) {
                $dupEnr = $pdo->prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active' LIMIT 1");
                $dupEnr->execute([$userId, $courseId]);
                if ($dupEnr->fetch()) {
                    http_response_code(409);
                    return ['success' => false, 'error' => 'Student is already actively enrolled in this course. Duplicate active enrollments in the same course are prohibited.'];
                }

                // Add new course enrollment preserving existing account
                try {
                    $insEnr = $pdo->prepare("INSERT INTO enrollments (user_id, course_id, batch_id, status, enrolled_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)");
                    $insEnr->execute([$userId, $courseId, $batchId]);
                    $enrId = (int)$pdo->lastInsertId();
                } catch (PDOException $enrEx) {
                    if (strpos($enrEx->getMessage(), 'batch_id') !== false) {
                        try {
                            $pdo->exec("ALTER TABLE enrollments ADD COLUMN batch_id INT UNSIGNED NULL");
                        } catch (Exception $altEx) {}
                        $insEnr = $pdo->prepare("INSERT INTO enrollments (user_id, course_id, batch_id, status, enrolled_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)");
                        $insEnr->execute([$userId, $courseId, $batchId]);
                        $enrId = (int)$pdo->lastInsertId();
                    } else {
                        throw $enrEx;
                    }
                }

                if ($batchId) {
                    $insBe = $pdo->prepare("INSERT INTO batch_enrollments (enrollment_id, user_id, batch_id, status, enrolled_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)");
                    $insBe->execute([$enrId, $userId, $batchId]);
                }

                // Create fee plan for the new enrollment
                $cStmt = $pdo->prepare("SELECT fee_amount FROM courses WHERE id = ? LIMIT 1");
                $cStmt->execute([$courseId]);
                $cFee = $cStmt->fetch();
                $feeAmount = $cFee ? (float)$cFee['fee_amount'] : 65000.00;
                $feePlanStmt = $pdo->prepare("INSERT INTO fee_plans (enrollment_id, user_id, course_id, total_fee, discount_amount, net_fee, currency, status, created_at) VALUES (?, ?, ?, ?, 0.00, ?, 'INR', 'paid', CURRENT_TIMESTAMP)");
                $feePlanStmt->execute([$enrId, $userId, $courseId, $feeAmount, $feeAmount]);
            }

            AuditLogger::log('REUSE_STUDENT_ENROLLMENT', 'student', $userId, ['course_id' => $courseId, 'batch_id' => $batchId], $actor);
            return [
                'success' => true,
                'is_existing_account' => true,
                'message' => "Existing account for " . $existingUser['full_name'] . " reused. Enrolled in additional course without credentials duplication.",
                'student_id' => $userId,
                'student_code' => $studentCode,
                'invitation_url' => null,
                'email_delivery' => 'Account already active - no new invitation needed'
            ];
        }

        if ($normalizedMobile) {
            $checkMobile = $pdo->prepare("SELECT id FROM student_profiles WHERE normalized_mobile = ?");
            $checkMobile->execute([$normalizedMobile]);
            if ($checkMobile->fetch()) {
                http_response_code(409);
                return ['success' => false, 'error' => 'A student with this normalized phone number already exists.'];
            }
        }

        // Generate unique Student Code: STU-2026-XXXX
        $randSuffix = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $studentCode = 'STU-2026-' . $randSuffix;
        $defaultPasswordHash = '!INVITED_UNSET_CREDENTIALS!';
        $rawInvitationToken = bin2hex(random_bytes(32));
        $hashedInvitationToken = hash('sha256', $rawInvitationToken);
        $invitationExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $pdo->beginTransaction();
        try {
            // 1. Create User
            $stmt = $pdo->prepare("
                INSERT INTO users (full_name, email, password_hash, role, title, created_at)
                VALUES (?, ?, ?, 'student', 'Student Fellow', CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$fullName, $email, $defaultPasswordHash]);
            $userId = (int)$pdo->lastInsertId();

            // 2. Create Student Profile (stores only cryptographic hash of token)
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO student_profiles (
                        user_id, student_id_code, mobile, normalized_mobile, education, experience_years,
                        admission_date, coordinator_id, account_status, admission_status, enrollment_status,
                        payment_status, internal_notes, invitation_token, invitation_expires_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'invited', 'admitted', 'enrolled', 'offline_handled', ?, ?, ?, CURRENT_TIMESTAMP)
                ");
                $stmt->execute([
                    $userId,
                    $studentCode,
                    $mobile,
                    $normalizedMobile,
                    $education,
                    $experience,
                    date('Y-m-d'),
                    $coordinatorId,
                    $internalNotes,
                    $hashedInvitationToken,
                    $invitationExpires
                ]);
            } catch (PDOException $spEx) {
                // If payment_status was restricted ENUM or column missing, relax to VARCHAR(50)
                try {
                    $pdo->exec("ALTER TABLE student_profiles MODIFY COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid'");
                } catch (Exception $altEx) {}
                $stmt = $pdo->prepare("
                    INSERT INTO student_profiles (
                        user_id, student_id_code, mobile, normalized_mobile, education, experience_years,
                        admission_date, coordinator_id, account_status, admission_status, enrollment_status,
                        payment_status, internal_notes, invitation_token, invitation_expires_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'invited', 'admitted', 'enrolled', 'unpaid', ?, ?, ?, CURRENT_TIMESTAMP)
                ");
                $stmt->execute([
                    $userId,
                    $studentCode,
                    $mobile,
                    $normalizedMobile,
                    $education,
                    $experience,
                    date('Y-m-d'),
                    $coordinatorId,
                    $internalNotes,
                    $hashedInvitationToken,
                    $invitationExpires
                ]);
            }

            // 3. Enrol in Course & Batch if provided
            $enrollmentId = null;
            if ($courseId) {
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO enrollments (user_id, course_id, batch_id, status, enrolled_at)
                        VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
                    ");
                    $stmt->execute([$userId, $courseId, $batchId]);
                    $enrollmentId = (int)$pdo->lastInsertId();
                } catch (PDOException $enrEx) {
                    if (strpos($enrEx->getMessage(), 'batch_id') !== false) {
                        try {
                            $pdo->exec("ALTER TABLE enrollments ADD COLUMN batch_id INT UNSIGNED NULL");
                        } catch (Exception $altEx) {}
                        $stmt = $pdo->prepare("
                            INSERT INTO enrollments (user_id, course_id, batch_id, status, enrolled_at)
                            VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
                        ");
                        $stmt->execute([$userId, $courseId, $batchId]);
                        $enrollmentId = (int)$pdo->lastInsertId();
                    } else {
                        throw $enrEx;
                    }
                }

                if ($batchId) {
                    $stmt = $pdo->prepare("
                        INSERT INTO batch_enrollments (enrollment_id, user_id, batch_id, status, enrolled_at)
                        VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
                    ");
                    $stmt->execute([$enrollmentId, $userId, $batchId]);
                }
            }

            // 4. Initialize Placement Profile
            $stmt = $pdo->prepare("
                INSERT INTO placement_profiles (user_id, target_roles, skills, readiness_score, placement_status)
                VALUES (?, ?, ?, 0, 'training')
            ");
            $stmt->execute([$userId, 'Cloud & Systems Fellow', $education]);

            $pdo->commit();

            AuditLogger::log('CREATE_STUDENT', 'student', $userId, [
                'student_code' => $studentCode,
                'email' => $email,
                'course_id' => $courseId,
                'batch_id' => $batchId,
                'expires_at' => $invitationExpires
            ], $actor);

            $invitationUrl = self::getPublicLmsUrl() . "/activate?token={$rawInvitationToken}";

            return [
                'success' => true,
                'message' => "Student {$fullName} onboarded successfully with ID {$studentCode}.",
                'student_id' => $userId,
                'student_code' => $studentCode,
                'account_status' => 'invited',
                'invitation_status' => 'Link Generated',
                'invitation_url' => $invitationUrl,
                'setup_url' => $invitationUrl,
                'expires_at' => $invitationExpires,
                'delivery_method' => 'manual_share',
                'email_sent' => false,
                'email_notice' => 'Email server is unconfigured. Share this private setup link directly via WhatsApp.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error during student onboarding: ' . $e->getMessage()];
        }
    }

    public static function getStudentDetail($userId) {
        $pdo = Database::getConnection();

        // 1. Basic user & profile
        $stmt = $pdo->prepare("
            SELECT u.id, u.full_name, u.email, u.role, u.title, u.avatar, u.created_at,
                   sp.student_id_code, sp.mobile, sp.education, sp.experience_years, sp.admission_date,
                   sp.coordinator_id, sp.account_status, sp.admission_status, sp.enrollment_status, sp.payment_status,
                   sp.documents_json, sp.internal_notes, sp.invitation_token, sp.invitation_expires_at, sp.invitation_accepted_at,
                   coord.full_name as coordinator_name, coord.email as coordinator_email
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN users coord ON sp.coordinator_id = coord.id
            WHERE u.id = ?
        ");
        $stmt->execute([(int)$userId]);
        $profile = $stmt->fetch();

        if (!$profile) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Student record not found'];
        }

        // 2. Enrollments & Batches
        $stmt = $pdo->prepare("
            SELECT e.id as enrollment_id, e.status as enrollment_status, e.enrolled_at, e.completed_at,
                   e.access_start_at, e.expires_at, e.access_duration_applied, e.access_status,
                   c.id as course_id, c.title as course_title, c.category, c.level, c.duration,
                   b.id as batch_id, b.batch_code, b.title as batch_title, b.delivery_mode, b.start_date, b.end_date,
                   be.status as batch_enrollment_status, be.transfer_from_batch_id, be.transfer_reason
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN batch_enrollments be ON e.id = be.enrollment_id
            LEFT JOIN batches b ON be.batch_id = b.id
            WHERE e.user_id = ?
        ");
        $stmt->execute([(int)$userId]);
        $enrollments = $stmt->fetchAll();

        foreach ($enrollments as &$enr) {
            $extStmt = $pdo->prepare("
                SELECT eae.*, u.full_name as extended_by_name
                FROM enrollment_access_extensions eae
                LEFT JOIN users u ON eae.extended_by = u.id
                WHERE eae.enrollment_id = ?
                ORDER BY eae.created_at DESC
            ");
            $extStmt->execute([(int)$enr['enrollment_id']]);
            $enr['extensions'] = $extStmt->fetchAll();
        }
        unset($enr);

        // 3. Attendance Records
        $stmt = $pdo->prepare("
            SELECT ar.id, ar.status, ar.marked_at, ar.correction_reason,
                   cs.topic, cs.start_time, cs.session_type,
                   b.batch_code
            FROM attendance_records ar
            JOIN class_sessions cs ON ar.session_id = cs.id
            JOIN batches b ON cs.batch_id = b.id
            WHERE ar.user_id = ?
            ORDER BY cs.start_time DESC
        ");
        $stmt->execute([(int)$userId]);
        $attendance = $stmt->fetchAll();

        // 4. Assessment Submissions
        $stmt = $pdo->prepare("
            SELECT ts.id, ts.status, ts.score, ts.feedback, ts.submitted_at, ts.graded_at,
                   t.title as task_title, t.max_score, t.passing_score,
                   c.title as course_title
            FROM task_submissions ts
            JOIN tasks t ON ts.task_id = t.id
            JOIN modules m ON t.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            JOIN enrollments e ON ts.enrollment_id = e.id
            WHERE e.user_id = ?
            ORDER BY ts.submitted_at DESC
        ");
        $stmt->execute([(int)$userId]);
        $assessments = $stmt->fetchAll();

        // 5. Placement Profile (fees and payments handled offline outside portal scope)
        $stmt = $pdo->prepare("SELECT * FROM placement_profiles WHERE user_id = ?");
        $stmt->execute([(int)$userId]);
        $placement = $stmt->fetch() ?: null;

        // 7. Activity / Audit history
        $stmt = $pdo->prepare("
            SELECT action, details_json, created_at, user_email
            FROM audit_logs
            WHERE (entity_type = 'student' AND entity_id = ?) OR (user_id = ?)
            ORDER BY created_at DESC
            LIMIT 20
        ");
        $stmt->execute([(string)$userId, (int)$userId]);
        $activity = $stmt->fetchAll();

        return [
            'success' => true,
            'student' => $profile,
            'enrollments' => $enrollments,
            'attendance' => $attendance,
            'assessments' => $assessments,
            'placement' => $placement,
            'activity' => $activity
        ];
    }

    public static function transferStudentBatch($studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $targetBatchId = (int)($data['target_batch_id'] ?? 0);
        $reason = trim($data['reason'] ?? 'Requested by coordinator');

        if (!$targetBatchId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Target batch ID is required.'];
        }

        // Check target batch capacity
        $stmt = $pdo->prepare("
            SELECT b.id, b.capacity, b.batch_code, b.status,
                   COUNT(be.id) as current_enrolled
            FROM batches b
            LEFT JOIN batch_enrollments be ON b.id = be.batch_id AND be.status = 'active'
            WHERE b.id = ?
            GROUP BY b.id
        ");
        $stmt->execute([$targetBatchId]);
        $targetBatch = $stmt->fetch();

        if (!$targetBatch) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Target batch not found.'];
        }

        if ($targetBatch['current_enrolled'] >= $targetBatch['capacity']) {
            http_response_code(400);
            return ['success' => false, 'error' => "Target batch {$targetBatch['batch_code']} has reached maximum capacity ({$targetBatch['capacity']} seats)."];
        }

        // Find active enrollment
        $stmt = $pdo->prepare("
            SELECT be.id as batch_enrollment_id, be.batch_id as old_batch_id, be.enrollment_id
            FROM batch_enrollments be
            WHERE be.user_id = ? AND be.status = 'active'
        ");
        $stmt->execute([(int)$studentId]);
        $currentBatchEnrollment = $stmt->fetch();

        if (!$currentBatchEnrollment) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Student has no active batch enrollment to transfer from.'];
        }

        $pdo->beginTransaction();
        try {
            // Mark old enrollment transferred
            $stmt = $pdo->prepare("
                UPDATE batch_enrollments
                SET status = 'transferred', transfer_reason = ?, transferred_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([$reason, $currentBatchEnrollment['batch_enrollment_id']]);

            // Insert new batch enrollment
            $stmt = $pdo->prepare("
                INSERT INTO batch_enrollments (enrollment_id, user_id, batch_id, status, transfer_from_batch_id, transfer_reason, enrolled_at)
                VALUES (?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([
                $currentBatchEnrollment['enrollment_id'],
                $studentId,
                $targetBatchId,
                $currentBatchEnrollment['old_batch_id'],
                $reason
            ]);

            // Update parent enrollments batch_id pointer
            $stmt = $pdo->prepare("UPDATE enrollments SET batch_id = ? WHERE id = ?");
            $stmt->execute([$targetBatchId, $currentBatchEnrollment['enrollment_id']]);

            $pdo->commit();

            AuditLogger::log('TRANSFER_BATCH', 'student', $studentId, [
                'from_batch_id' => $currentBatchEnrollment['old_batch_id'],
                'to_batch_id' => $targetBatchId,
                'reason' => $reason
            ], $actor);

            return [
                'success' => true,
                'message' => "Student transferred successfully to batch {$targetBatch['batch_code']}."
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Transfer failed: ' . $e->getMessage()];
        }
    }

    public static function toggleStudentStatus($studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $targetStatus = trim($data['status'] ?? 'deactivated'); // 'active' | 'deactivated' | 'suspended'
        $reason = trim($data['reason'] ?? '');

        $stmt = $pdo->prepare("UPDATE student_profiles SET account_status = ? WHERE user_id = ?");
        $stmt->execute([$targetStatus, (int)$studentId]);

        AuditLogger::log('TOGGLE_STUDENT_STATUS', 'student', $studentId, [
            'status' => $targetStatus,
            'reason' => $reason
        ], $actor);

        return [
            'success' => true,
            'message' => "Student account status updated to {$targetStatus}."
        ];
    }

    public static function updateStudentProfile($studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;

        $fullName = trim($data['full_name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $mobile = trim($data['mobile'] ?? '');
        $education = trim($data['education'] ?? '');
        $experience = trim($data['experience_years'] ?? '');
        $notes = trim($data['internal_notes'] ?? '');
        $coordId = !empty($data['coordinator_id']) ? (int)$data['coordinator_id'] : null;

        if (!$fullName || !$email) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Full name and email are required.'];
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $studentId]);
        if ($stmt->fetch()) {
            http_response_code(409);
            return ['success' => false, 'error' => "Email {$email} is already in use by another user."];
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$fullName, $email, $studentId]);

            $stmtSp = $pdo->prepare("
                UPDATE student_profiles
                SET mobile = ?, education = ?, experience_years = ?, internal_notes = ?, coordinator_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ");
            $stmtSp->execute([$mobile, $education, $experience, $notes, $coordId, $studentId]);

            $pdo->commit();
            AuditLogger::log('UPDATE_STUDENT_PROFILE', 'student', $studentId, [
                'full_name' => $fullName,
                'email' => $email
            ], $actor);

            return ['success' => true, 'message' => "Student profile for {$fullName} updated successfully."];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to update student: ' . $e->getMessage()];
        }
    }

    public static function calculateAccessExpiry(string $startDate, int $value, string $unit): string {
        $dt = new DateTime($startDate);
        $unit = strtolower($unit);
        if ($unit === 'days' || $unit === 'day') {
            $dt->modify("+$value days");
            $dt->setTime(23, 59, 59);
            return $dt->format('Y-m-d H:i:s');
        }
        if ($unit === 'years' || $unit === 'year') {
            $year = (int)$dt->format('Y') + $value;
            $month = (int)$dt->format('m');
            $day = (int)$dt->format('d');
            $isLeap = ($year % 4 === 0 && $year % 100 !== 0) || ($year % 400 === 0);
            if ($month === 2 && $day === 29 && !$isLeap) {
                $day = 28;
            }
            $dt->setDate($year, $month, $day);
            $dt->setTime(23, 59, 59);
            return $dt->format('Y-m-d H:i:s');
        }
        $year = (int)$dt->format('Y');
        $month = (int)$dt->format('n');
        $day = (int)$dt->format('j');

        $totalMonths = ($month - 1) + $value;
        $targetYear = $year + intdiv($totalMonths, 12);
        $targetMonth = ($totalMonths % 12) + 1;
        $maxDays = cal_days_in_month(CAL_GREGORIAN, $targetMonth, $targetYear);
        $targetDay = min($day, $maxDays);

        $dt->setDate($targetYear, $targetMonth, $targetDay);
        $dt->setTime(23, 59, 59);
        return $dt->format('Y-m-d H:i:s');
    }

    public static function enrollStudentCourse($studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;
        $courseId = (int)($data['course_id'] ?? 0);
        $batchId = !empty($data['batch_id']) ? (int)$data['batch_id'] : null;

        if (!$courseId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Course ID is required.'];
        }

        $spStmt = $pdo->prepare("SELECT account_status FROM student_profiles WHERE user_id = ?");
        $spStmt->execute([$studentId]);
        $spRow = $spStmt->fetch();
        $accStatus = $spRow['account_status'] ?? 'active';

        $cStmt = $pdo->prepare("SELECT access_duration_type, access_duration_value, access_duration_unit FROM courses WHERE id = ?");
        $cStmt->execute([$courseId]);
        $cRow = $cStmt->fetch();
        $durVal = !empty($cRow['access_duration_value']) ? (int)$cRow['access_duration_value'] : 6;
        $durUnit = !empty($cRow['access_duration_unit']) ? strtolower($cRow['access_duration_unit']) : 'months';
        $durLabel = $durVal . ' ' . ucfirst($durUnit);

        $nowStr = date('Y-m-d H:i:s');
        if ($accStatus === 'active') {
            $accessStart = $nowStr;
            $accessExpiry = self::calculateAccessExpiry($nowStr, $durVal, $durUnit);
            $enrAccessStatus = 'active';
        } else {
            $accessStart = null;
            $accessExpiry = null;
            $enrAccessStatus = 'pending_activation';
        }

        $pdo->beginTransaction();
        try {
            $check = $pdo->prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1");
            $check->execute([$studentId, $courseId]);
            $existing = $check->fetch();

            if ($existing) {
                $enrollmentId = (int)$existing['id'];
                $pdo->prepare("
                    UPDATE enrollments
                    SET status = 'active', batch_id = COALESCE(?, batch_id),
                        access_start_at = ?, expires_at = ?, access_duration_applied = ?,
                        access_status = ?, withdrawal_reason = NULL, withdrawn_at = NULL
                    WHERE id = ?
                ")->execute([$batchId, $accessStart, $accessExpiry, $durLabel, $enrAccessStatus, $enrollmentId]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO enrollments (
                        user_id, course_id, batch_id, status, enrolled_at,
                        access_start_at, expires_at, access_duration_applied, access_status
                    ) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, ?, ?, ?, ?)
                ");
                $stmt->execute([$studentId, $courseId, $batchId, $accessStart, $accessExpiry, $durLabel, $enrAccessStatus]);
                $enrollmentId = (int)$pdo->lastInsertId();
            }

            if ($batchId) {
                $pdo->prepare("UPDATE batch_enrollments SET status = 'transferred' WHERE enrollment_id = ? AND status = 'active'")
                    ->execute([$enrollmentId]);

                $stmtBe = $pdo->prepare("
                    INSERT INTO batch_enrollments (enrollment_id, user_id, batch_id, status, enrolled_at)
                    VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
                ");
                $stmtBe->execute([$enrollmentId, $studentId, $batchId]);
            }

            $pdo->prepare("UPDATE student_profiles SET enrollment_status = 'enrolled' WHERE user_id = ?")->execute([$studentId]);

            $pdo->commit();
            AuditLogger::log('ENROLL_STUDENT', 'student', $studentId, ['course_id' => $courseId, 'batch_id' => $batchId], $actor);
            return ['success' => true, 'message' => 'Student successfully enrolled.'];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Enrolment failed: ' . $e->getMessage()];
        }
    }

    public static function withdrawStudentEnrollment($studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;
        $reason = trim($data['withdrawal_reason'] ?? $data['reason'] ?? 'Voluntary student withdrawal');
        $enrollmentId = !empty($data['enrollment_id']) ? (int)$data['enrollment_id'] : null;

        $pdo->beginTransaction();
        try {
            if ($enrollmentId) {
                $stmt = $pdo->prepare("UPDATE enrollments SET status = 'withdrawn' WHERE id = ? AND user_id = ?");
                $stmt->execute([$enrollmentId, $studentId]);
                $stmtBe = $pdo->prepare("
                    UPDATE batch_enrollments
                    SET status = 'withdrawn', withdrawal_reason = ?, withdrawn_at = CURRENT_TIMESTAMP
                    WHERE enrollment_id = ?
                ");
                $stmtBe->execute([$reason, $enrollmentId]);
            } else {
                $stmt = $pdo->prepare("UPDATE enrollments SET status = 'withdrawn' WHERE user_id = ? AND status = 'active'");
                $stmt->execute([$studentId]);
                $stmtBe = $pdo->prepare("
                    UPDATE batch_enrollments
                    SET status = 'withdrawn', withdrawal_reason = ?, withdrawn_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND status = 'active'
                ");
                $stmtBe->execute([$reason, $studentId]);
            }

            $stmtSp = $pdo->prepare("
                UPDATE student_profiles
                SET enrollment_status = 'withdrawn', withdrawn_at = CURRENT_TIMESTAMP, withdrawal_reason = ?
                WHERE user_id = ?
            ");
            $stmtSp->execute([$reason, $studentId]);

            $pdo->commit();
            AuditLogger::log('WITHDRAW_STUDENT_ENROLLMENT', 'student', $studentId, ['reason' => $reason], $actor);
            return [
                'success' => true,
                'message' => 'Student withdrawn from enrolment. Account and historical records preserved.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Withdrawal failed: ' . $e->getMessage()];
        }
    }

    public static function deactivateStudentAccount($studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;
        $reason = trim($data['reason'] ?? $data['deactivation_reason'] ?? 'Administrative account deactivation');

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE student_profiles SET account_status = 'deactivated' WHERE user_id = ?")->execute([$studentId]);
            try {
                $pdo->prepare("
                    UPDATE users
                    SET status = 'deactivated', deactivated_at = CURRENT_TIMESTAMP, deactivation_reason = ?
                    WHERE id = ?
                ")->execute([$reason, $studentId]);
            } catch (Exception $eUserCol) {
                $pdo->prepare("UPDATE users SET status = 'deactivated' WHERE id = ?")->execute([$studentId]);
            }

            $pdo->commit();
            AuditLogger::log('DEACTIVATE_STUDENT', 'student', $studentId, ['reason' => $reason], $actor);
            return [
                'success' => true,
                'message' => 'Student account deactivated. Active sessions terminated and login blocked. Records preserved.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Deactivation failed: ' . $e->getMessage()];
        }
    }

    public static function reactivateStudentAccount($studentId, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE student_profiles SET account_status = 'active' WHERE user_id = ?")->execute([$studentId]);
            try {
                $pdo->prepare("UPDATE users SET status = 'active', deactivated_at = NULL, deactivation_reason = NULL, is_archived = 0 WHERE id = ?")->execute([$studentId]);
            } catch (Exception $eUserCol) {
                $pdo->prepare("UPDATE users SET status = 'active', is_archived = 0 WHERE id = ?")->execute([$studentId]);
            }

            $pdo->commit();
            AuditLogger::log('REACTIVATE_STUDENT', 'student', $studentId, [], $actor);
            return ['success' => true, 'message' => 'Student account successfully reactivated. Login access restored.'];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Reactivation failed: ' . $e->getMessage()];
        }
    }

    public static function archiveStudent($studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;
        $reason = trim($data['reason'] ?? $data['archival_reason'] ?? 'Course completion or administrative archival');
        $resolution = trim($data['enrolment_resolution'] ?? 'retain_history'); // 'retain_history' | 'withdraw_active'

        $pdo->beginTransaction();
        try {
            if ($resolution === 'withdraw_active') {
                $pdo->prepare("UPDATE enrollments SET status = 'withdrawn' WHERE user_id = ? AND status = 'active'")->execute([$studentId]);
                $pdo->prepare("
                    UPDATE batch_enrollments
                    SET status = 'withdrawn', withdrawal_reason = 'Archived student account', withdrawn_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND status = 'active'
                ")->execute([$studentId]);
            }

            $stmtSp = $pdo->prepare("
                UPDATE student_profiles
                SET account_status = 'archived', archived_at = CURRENT_TIMESTAMP, archival_reason = ?, archived_enrolment_resolution = ?
                WHERE user_id = ?
            ");
            $stmtSp->execute([$reason, $resolution, $studentId]);

            $stmtU = $pdo->prepare("
                UPDATE users
                SET is_archived = 1, status = 'archived', archived_at = CURRENT_TIMESTAMP, archival_reason = ?
                WHERE id = ?
            ");
            $stmtU->execute([$reason, $studentId]);

            $pdo->commit();
            AuditLogger::log('ARCHIVE_STUDENT', 'student', $studentId, [
                'reason' => $reason,
                'enrolment_resolution' => $resolution
            ], $actor);

            return [
                'success' => true,
                'message' => 'Student archived successfully. Removed from operational lists and login blocked. Academic history preserved.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Archival failed: ' . $e->getMessage()];
        }
    }

    public static function restoreStudent($studentId, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE student_profiles SET account_status = 'deactivated', archived_at = NULL WHERE user_id = ?")->execute([$studentId]);
            $pdo->prepare("UPDATE users SET is_archived = 0, status = 'deactivated', archived_at = NULL WHERE id = ?")->execute([$studentId]);

            $pdo->commit();
            AuditLogger::log('RESTORE_STUDENT', 'student', $studentId, [], $actor);
            return [
                'success' => true,
                'message' => 'Student restored to inactive roster. Account is restored as deactivated; explicit reactivation is required.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Restore failed: ' . $e->getMessage()];
        }
    }

    public static function checkStudentDeletionEligibility($studentId) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;

        $userStmt = $pdo->prepare("SELECT id, full_name, email, role, authorized_roles_json FROM users WHERE id = ?");
        $userStmt->execute([$studentId]);
        $u = $userStmt->fetch();

        $roles = [];
        if ($u && !empty($u['authorized_roles_json'])) {
            $roles = json_decode($u['authorized_roles_json'], true) ?: [];
        }
        if ($u && empty($roles)) {
            $roles = [$u['role']];
        }
        $isMultiRole = $u ? (count($roles) > 1 || $u['role'] !== 'student') : false;

        $attCount = 0;
        try {
            $attCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance_records WHERE user_id = {$studentId}")->fetchColumn();
        } catch (Exception $e) {}

        $subCount = 0;
        try {
            $subCount = (int)$pdo->query("SELECT COUNT(*) FROM task_submissions ts JOIN enrollments e ON ts.enrollment_id = e.id WHERE e.user_id = {$studentId}")->fetchColumn();
        } catch (Exception $e) {}

        $payCount = 0;
        try {
            $payCount = (int)$pdo->query("SELECT COUNT(*) FROM payments p JOIN fee_plans fp ON p.fee_plan_id = fp.id WHERE fp.user_id = {$studentId}")->fetchColumn();
        } catch (Exception $e) {}

        $certCount = 0;
        try {
            $certCount = (int)$pdo->query("SELECT COUNT(*) FROM certificates WHERE user_id = {$studentId}")->fetchColumn();
        } catch (Exception $e) {}

        $dependencies = [];
        if ($attCount > 0) $dependencies[] = "{$attCount} class attendance record(s)";
        if ($subCount > 0) $dependencies[] = "{$subCount} assignment/task submission(s)";
        if ($payCount > 0) $dependencies[] = "{$payCount} payment financial transaction(s)";
        if ($certCount > 0) $dependencies[] = "{$certCount} accredited digital certificate(s)";

        $isEligible = count($dependencies) === 0;

        return [
            'success' => true,
            'eligible' => $isEligible,
            'can_delete' => $isEligible,
            'can_delete_permanently' => $isEligible,
            'is_multi_role' => $isMultiRole,
            'roles' => $roles,
            'stats' => [
                'attendance_count' => $attCount,
                'submissions_count' => $subCount,
                'payments_count' => $payCount,
                'certificates_count' => $certCount,
            ],
            'attendance_count' => $attCount,
            'submissions_count' => $subCount,
            'payments_count' => $payCount,
            'certificates_count' => $certCount,
            'dependencies' => $dependencies,
            'reason' => $isEligible
                ? 'Student has no retained academic or financial records and can be safely deleted.'
                : 'Permanent deletion is prohibited to protect academic and financial audit integrity. Retained records: ' . implode(', ', $dependencies) . '.',
            'recommendation' => $isEligible ? null : 'Use Archive Student or Deactivate Account instead to safely revoke portal access while preserving accredited history.'
        ];
    }

    public static function deleteStudent($studentId, $actor) {
        $pdo = Database::getConnection();
        $studentId = (int)$studentId;

        $eligibility = self::checkStudentDeletionEligibility($studentId);
        if (!$eligibility['eligible']) {
            http_response_code(400);
            return [
                'success' => false,
                'error' => $eligibility['reason'],
                'recommendation' => $eligibility['recommendation'],
                'eligibility' => $eligibility
            ];
        }

        $pdo->beginTransaction();
        try {
            $userStmt = $pdo->prepare("SELECT id, role, authorized_roles_json FROM users WHERE id = ?");
            $userStmt->execute([$studentId]);
            $u = $userStmt->fetch();

            if (!$u) {
                $pdo->rollBack();
                http_response_code(404);
                return ['success' => false, 'error' => 'Student user not found.'];
            }

            $roles = [];
            if (!empty($u['authorized_roles_json'])) {
                $roles = json_decode($u['authorized_roles_json'], true) ?: [];
            }
            if (empty($roles)) {
                $roles = [$u['role']];
            }

            try { $pdo->prepare("DELETE FROM fee_plans WHERE user_id = ?")->execute([$studentId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM placement_profiles WHERE user_id = ?")->execute([$studentId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM student_followups WHERE user_id = ?")->execute([$studentId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")->execute([$studentId]); } catch (Exception $e) {}
            $pdo->prepare("DELETE FROM student_profiles WHERE user_id = ?")->execute([$studentId]);
            $pdo->prepare("DELETE FROM batch_enrollments WHERE user_id = ?")->execute([$studentId]);
            $pdo->prepare("DELETE FROM enrollments WHERE user_id = ?")->execute([$studentId]);

            $remainingRoles = array_values(array_filter($roles, function($r) {
                return $r !== 'student';
            }));

            $multiRoleRetained = false;
            $newRole = null;

            if (count($remainingRoles) > 0) {
                $multiRoleRetained = true;
                $newRole = $remainingRoles[0];
                $stmtUpd = $pdo->prepare("
                    UPDATE users
                    SET role = ?, authorized_roles_json = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $stmtUpd->execute([$newRole, json_encode($remainingRoles), $studentId]);
            } else {
                try {
                    $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$studentId]);
                } catch (Exception $e) {
                    $pdo->prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted' WHERE id = ?")->execute([$studentId]);
                }
            }

            $pdo->commit();
            AuditLogger::log('DELETE_STUDENT', 'student', $studentId, [
                'multi_role_retained' => $multiRoleRetained,
                'remaining_roles' => $remainingRoles
            ], $actor);

            return [
                'success' => true,
                'multi_role_retained' => $multiRoleRetained,
                'remaining_role' => $newRole,
                'message' => $multiRoleRetained
                    ? "Student profile removed. User account retained with remaining role: {$newRole}."
                    : 'Student record permanently deleted.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error during deletion: ' . $e->getMessage()];
        }
    }


    // -------------------------------------------------------------
    // 3. FACULTY MANAGEMENT & ASSIGNMENTS
    // -------------------------------------------------------------
    public static function getFaculty($queryParams = []) {
        $pdo = Database::getConnection();

        $view = trim($queryParams['view'] ?? 'active'); // 'active' | 'archived' | 'all'
        $search = trim($queryParams['search'] ?? '');

        $sql = "
            SELECT u.id as id, u.id as user_id, u.full_name, u.email, u.title, u.avatar, u.status as user_status, u.is_archived,
                   fp.id as profile_id, 
                   COALESCE(fp.faculty_id_code, CONCAT('FAC-', LPAD(u.id, 4, '0'))) as faculty_id_code, 
                   fp.mobile, fp.expertise, fp.bio, fp.qualifications,
                   fp.courses_taught_json, fp.availability_json, fp.account_status, fp.internal_notes,
                   fp.archived_at, fp.archival_reason, fp.reassignment_notes,
                   (
                       SELECT COUNT(DISTINCT fba.batch_id) 
                       FROM faculty_batch_assignments fba 
                       WHERE fba.faculty_id = u.id
                   ) as assigned_batches_count,
                   (
                       SELECT COUNT(*) 
                       FROM class_sessions cs 
                       WHERE cs.faculty_id = u.id AND cs.status = 'scheduled' AND cs.start_time >= CURRENT_TIMESTAMP
                   ) as upcoming_sessions_count
            FROM users u
            LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
            WHERE (u.role IN ('faculty', 'instructor') OR u.authorized_roles_json LIKE '%"faculty"%' OR (fp.id IS NOT NULL AND u.role NOT IN ('super_admin', 'admin', 'coordinator', 'placement_officer', 'student')))
        ";

        $params = [];

        if ($view === 'archived') {
            $sql .= " AND (fp.account_status = 'archived' OR u.is_archived = 1) AND u.deleted_at IS NULL";
        } elseif ($view === 'all') {
            $sql .= " AND u.deleted_at IS NULL";
        } else {
            $sql .= " AND (fp.account_status != 'archived' OR fp.account_status IS NULL) AND (u.is_archived = 0 OR u.is_archived IS NULL) AND u.deleted_at IS NULL";
        }

        if ($search !== '') {
            $sql .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR fp.expertise LIKE ? OR fp.faculty_id_code LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        $sql .= " ORDER BY u.id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $facultyList = $stmt->fetchAll();

        return [
            'success' => true,
            'faculty' => $facultyList
        ];
    }

    public static function createFaculty($data, $actor) {
        $pdo = Database::getConnection();

        $fullName = trim($data['full_name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $mobile = trim($data['mobile'] ?? '');
        $expertise = trim($data['expertise'] ?? '');
        $title = trim($data['title'] ?? 'Senior Technical Faculty');
        $availability = is_array($data['availability'] ?? null) ? json_encode($data['availability']) : json_encode(['Mon-Fri Evening']);
        $coursesTaught = is_array($data['courses_taught'] ?? null) ? json_encode($data['courses_taught']) : json_encode([]);
        $assignedBatchIds = is_array($data['batch_ids'] ?? null) ? $data['batch_ids'] : (is_array($data['assigned_batch_ids'] ?? null) ? $data['assigned_batch_ids'] : []);

        if (!$fullName || !$email) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Faculty name and email are mandatory.'];
        }

        // Check if user already exists (Account Reuse Pattern for Faculty)
        $check = $pdo->prepare("SELECT id, full_name FROM users WHERE email = ? LIMIT 1");
        $check->execute([$email]);
        $existingFac = $check->fetch();

        if ($existingFac) {
            $facId = (int)$existingFac['id'];
            if (!empty($assignedBatchIds)) {
                $stmtAssign = $pdo->prepare("INSERT IGNORE INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, 'Primary Faculty')");
                foreach ($assignedBatchIds as $bId) {
                    $stmtAssign->execute([$facId, (int)$bId]);
                }
            }
            AuditLogger::log('REUSE_FACULTY_ASSIGNMENT', 'faculty', $facId, ['batch_ids' => $assignedBatchIds], $actor);
            return [
                'success' => true,
                'is_existing_account' => true,
                'message' => "Existing faculty account for " . $existingFac['full_name'] . " reused. Teaching cohort assignments updated.",
                'faculty_id' => $facId
            ];
        }

        $codeSuffix = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $facultyCode = 'FAC-2026-' . $codeSuffix;
        $defaultPasswordHash = '!INVITED_UNSET_CREDENTIALS!';
        $rawInvitationToken = bin2hex(random_bytes(32));
        $hashedInvitationToken = hash('sha256', $rawInvitationToken);
        $invitationExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO users (full_name, email, password_hash, role, title, created_at)
                VALUES (?, ?, ?, 'faculty', ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$fullName, $email, $defaultPasswordHash, $title]);
            $userId = (int)$pdo->lastInsertId();

            $stmt = $pdo->prepare("
                INSERT INTO faculty_profiles (
                    user_id, faculty_id_code, mobile, expertise, courses_taught_json,
                    availability_json, account_status, internal_notes, invitation_token, invitation_expires_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'invited', ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$userId, $facultyCode, $mobile, $expertise, $coursesTaught, $availability, $data['internal_notes'] ?? '', $hashedInvitationToken, $invitationExpires]);

            // Assign batches
            if (!empty($assignedBatchIds)) {
                $stmtAssign = $pdo->prepare("
                    INSERT IGNORE INTO faculty_batch_assignments (faculty_id, batch_id, role)
                    VALUES (?, ?, 'Primary Faculty')
                ");
                foreach ($assignedBatchIds as $bId) {
                    $stmtAssign->execute([$userId, (int)$bId]);
                }
            }

            $pdo->commit();

            AuditLogger::log('CREATE_FACULTY', 'faculty', $userId, [
                'code' => $facultyCode,
                'email' => $email,
                'expires_at' => $invitationExpires
            ], $actor);

            $invitationUrl = self::getPublicLmsUrl() . "/activate?token={$rawInvitationToken}";

            return [
                'success' => true,
                'message' => "Faculty {$fullName} onboarded with code {$facultyCode}.",
                'faculty_id' => $userId,
                'faculty_code' => $facultyCode,
                'account_status' => 'invited',
                'invitation_status' => 'Link Generated',
                'invitation_url' => $invitationUrl,
                'setup_url' => $invitationUrl,
                'expires_at' => $invitationExpires,
                'delivery_method' => 'manual_share',
                'email_sent' => false,
                'email_notice' => 'Email server is unconfigured. Share this private setup link directly via WhatsApp.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error creating faculty: ' . $e->getMessage()];
        }
    }

    public static function getFacultyDetail($facultyId) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $stmt = $pdo->prepare("
            SELECT u.id as user_id, u.full_name, u.email, u.title, u.avatar, u.role, u.status as user_status, u.is_archived,
                   fp.id as profile_id, fp.faculty_id_code, fp.mobile, fp.expertise, fp.bio, fp.qualifications,
                   fp.courses_taught_json, fp.availability_json, fp.account_status, fp.internal_notes, fp.created_at,
                   fp.archived_at, fp.archival_reason, fp.reassignment_notes
            FROM users u
            LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$facultyId]);
        $faculty = $stmt->fetch();

        if (!$faculty) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Faculty member not found.'];
        }

        $batches = $pdo->prepare("
            SELECT b.id, b.batch_code, b.title, b.start_date, b.end_date, b.status, c.title as course_title,
                   fba.role as assignment_role
            FROM faculty_batch_assignments fba
            JOIN batches b ON fba.batch_id = b.id
            JOIN courses c ON b.course_id = c.id
            WHERE fba.faculty_id = ?
            UNION
            SELECT b.id, b.batch_code, b.title, b.start_date, b.end_date, b.status, c.title as course_title,
                   'Lead Faculty' as assignment_role
            FROM batches b
            JOIN courses c ON b.course_id = c.id
            WHERE b.lead_faculty_id = ?
        ");
        $batches->execute([$facultyId, $facultyId]);
        $assignedBatches = $batches->fetchAll();

        $upc = $pdo->prepare("
            SELECT cs.id, cs.topic, cs.start_time, cs.end_time, cs.meeting_link, cs.status,
                   b.batch_code, b.title as batch_title
            FROM class_sessions cs
            JOIN batches b ON cs.batch_id = b.id
            WHERE cs.faculty_id = ? AND cs.start_time >= CURRENT_TIMESTAMP AND cs.status != 'cancelled'
            ORDER BY cs.start_time ASC
        ");
        $upc->execute([$facultyId]);
        $upcomingSessions = $upc->fetchAll();

        $pastClassesCount = (int)$pdo->query("SELECT COUNT(*) FROM class_sessions WHERE faculty_id = {$facultyId} AND start_time < CURRENT_TIMESTAMP")->fetchColumn();
        $attendanceMarkedCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance_records WHERE marked_by = {$facultyId}")->fetchColumn();
        $submissionsGradedCount = (int)$pdo->query("SELECT COUNT(*) FROM task_submissions WHERE graded_by = {$facultyId}")->fetchColumn();

        return [
            'success' => true,
            'faculty' => $faculty,
            'assigned_batches' => $assignedBatches,
            'upcoming_sessions' => $upcomingSessions,
            'stats' => [
                'past_classes_taught' => $pastClassesCount,
                'attendance_marks' => $attendanceMarkedCount,
                'submissions_graded' => $submissionsGradedCount
            ]
        ];
    }

    public static function updateFacultyProfile($facultyId, $data, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $fullName = trim($data['full_name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $title = trim($data['title'] ?? '');
        $expertise = trim($data['expertise'] ?? '');
        $bio = trim($data['bio'] ?? '');
        $qualifications = trim($data['qualifications'] ?? '');
        $mobile = trim($data['mobile'] ?? '');
        $notes = trim($data['internal_notes'] ?? '');

        if (!$fullName || !$email) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Full name and email are required.'];
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $check->execute([$email, $facultyId]);
        if ($check->fetch()) {
            http_response_code(409);
            return ['success' => false, 'error' => "Email {$email} is already taken."];
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE users SET full_name = ?, email = ?, title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                ->execute([$fullName, $email, $title, $facultyId]);

            $pdo->prepare("
                UPDATE faculty_profiles
                SET expertise = ?, bio = ?, qualifications = ?, mobile = ?, internal_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ")->execute([$expertise, $bio, $qualifications, $mobile, $notes, $facultyId]);

            $pdo->commit();
            AuditLogger::log('UPDATE_FACULTY_PROFILE', 'faculty', $facultyId, ['full_name' => $fullName], $actor);
            return ['success' => true, 'message' => "Faculty profile for {$fullName} updated successfully."];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Update failed: ' . $e->getMessage()];
        }
    }

    public static function getFacultyWorkload($facultyId) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $batches = $pdo->prepare("
            SELECT DISTINCT b.id, b.batch_code, b.title, b.status
            FROM batches b
            LEFT JOIN faculty_batch_assignments fba ON b.id = fba.batch_id
            WHERE (b.lead_faculty_id = ? OR fba.faculty_id = ?) AND b.is_deleted = 0
        ");
        $batches->execute([$facultyId, $facultyId]);
        $assignedBatches = $batches->fetchAll();

        $upc = $pdo->prepare("
            SELECT cs.id, cs.batch_id, cs.topic, cs.start_time, cs.end_time, b.batch_code
            FROM class_sessions cs
            JOIN batches b ON cs.batch_id = b.id
            WHERE cs.faculty_id = ? AND cs.start_time >= CURRENT_TIMESTAMP AND cs.status != 'cancelled'
            ORDER BY cs.start_time ASC
        ");
        $upc->execute([$facultyId]);
        $upcomingSessions = $upc->fetchAll();

        $subs = $pdo->prepare("
            SELECT u.id, u.full_name, u.email, u.title
            FROM users u
            JOIN faculty_profiles fp ON u.id = fp.user_id
            WHERE u.id != ? AND fp.account_status = 'active' AND (u.is_archived = 0 OR u.is_archived IS NULL)
            ORDER BY u.full_name ASC
        ");
        $subs->execute([$facultyId]);
        $substitutes = $subs->fetchAll();

        return [
            'success' => true,
            'faculty_id' => $facultyId,
            'assigned_batches' => $assignedBatches,
            'upcoming_sessions' => $upcomingSessions,
            'upcoming_count' => count($upcomingSessions),
            'available_substitutes' => $substitutes
        ];
    }

    public static function getFacultyAssignments($facultyId) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $stmt = $pdo->prepare("
            SELECT fba.id, fba.batch_id, fba.role, b.batch_code, b.title as batch_title, b.status as batch_status,
                   c.title as course_title, (CASE WHEN b.lead_faculty_id = ? THEN 1 ELSE 0 END) as is_lead
            FROM faculty_batch_assignments fba
            JOIN batches b ON fba.batch_id = b.id
            JOIN courses c ON b.course_id = c.id
            WHERE fba.faculty_id = ?
        ");
        $stmt->execute([$facultyId, $facultyId]);
        return ['success' => true, 'assignments' => $stmt->fetchAll()];
    }

    public static function assignFacultyBatch($facultyId, $data, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;
        $batchId = (int)($data['batch_id'] ?? 0);
        $role = trim($data['role'] ?? 'Primary Faculty');
        $isLead = !empty($data['is_lead']);

        if (!$batchId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Batch ID is required.'];
        }

        $pdo->beginTransaction();
        try {
            $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
            if ($isSqlite) {
                $stmt = $pdo->prepare("INSERT OR REPLACE INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, ?)");
            } else {
                $stmt = $pdo->prepare("INSERT INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)");
            }
            $stmt->execute([$facultyId, $batchId, $role]);

            if ($isLead) {
                $pdo->prepare("UPDATE batches SET lead_faculty_id = ? WHERE id = ?")->execute([$facultyId, $batchId]);
            }

            $pdo->commit();
            AuditLogger::log('ASSIGN_FACULTY_BATCH', 'faculty', $facultyId, ['batch_id' => $batchId, 'role' => $role], $actor);
            return ['success' => true, 'message' => 'Cohort teaching assignment created.'];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Assignment failed: ' . $e->getMessage()];
        }
    }

    public static function removeFacultyAssignment($facultyId, $batchId, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;
        $batchId = (int)$batchId;

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM faculty_batch_assignments WHERE faculty_id = ? AND batch_id = ?")
                ->execute([$facultyId, $batchId]);

            $pdo->prepare("UPDATE batches SET lead_faculty_id = NULL WHERE id = ? AND lead_faculty_id = ?")
                ->execute([$batchId, $facultyId]);

            $pdo->commit();
            AuditLogger::log('REMOVE_FACULTY_ASSIGNMENT', 'faculty', $facultyId, ['batch_id' => $batchId], $actor);
            return [
                'success' => true,
                'message' => 'Teaching assignment removed. Historical classes and student attribution are preserved.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to remove assignment: ' . $e->getMessage()];
        }
    }

    public static function updateFacultyAssignment($facultyId, $assignmentId, $data, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;
        $assignmentId = (int)$assignmentId;
        $role = trim($data['role'] ?? 'Primary Faculty');

        $stmt = $pdo->prepare("UPDATE faculty_batch_assignments SET role = ? WHERE (id = ? OR (faculty_id = ? AND batch_id = ?))");
        $stmt->execute([$role, $assignmentId, $facultyId, $assignmentId]);
        AuditLogger::log('UPDATE_FACULTY_ASSIGNMENT', 'faculty_batch_assignment', $assignmentId, ['role' => $role], $actor);
        return ['success' => true, 'message' => 'Faculty assignment role updated.'];
    }

    public static function deactivateFacultyAccount($facultyId, $data, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;
        $option = trim($data['reassignment_option'] ?? 'unassign');
        $substituteId = !empty($data['substitute_faculty_id']) ? (int)$data['substitute_faculty_id'] : null;
        $reason = trim($data['reason'] ?? 'Instructional leave / faculty deactivation');

        $pdo->beginTransaction();
        try {
            if ($option === 'reassign' && $substituteId) {
                $stmtCs = $pdo->prepare("
                    UPDATE class_sessions
                    SET faculty_id = ?
                    WHERE faculty_id = ? AND start_time >= CURRENT_TIMESTAMP AND status != 'cancelled'
                ");
                $stmtCs->execute([$substituteId, $facultyId]);

                $stmtB = $pdo->prepare("UPDATE batches SET lead_faculty_id = ? WHERE lead_faculty_id = ?");
                $stmtB->execute([$substituteId, $facultyId]);
            } else {
                $stmtCs = $pdo->prepare("
                    UPDATE class_sessions
                    SET faculty_id = NULL
                    WHERE faculty_id = ? AND start_time >= CURRENT_TIMESTAMP AND status != 'cancelled'
                ");
                $stmtCs->execute([$facultyId]);

                $stmtB = $pdo->prepare("UPDATE batches SET lead_faculty_id = NULL WHERE lead_faculty_id = ?");
                $stmtB->execute([$facultyId]);
            }

            $pdo->prepare("
                UPDATE faculty_profiles
                SET account_status = 'deactivated', reassignment_notes = ?
                WHERE user_id = ?
            ")->execute(["Workload option: {$option}. Reason: {$reason}", $facultyId]);

            try {
                $pdo->prepare("
                    UPDATE users
                    SET status = 'deactivated', deactivated_at = CURRENT_TIMESTAMP, deactivation_reason = ?
                    WHERE id = ?
                ")->execute([$reason, $facultyId]);
            } catch (Exception $eUserCol) {
                $pdo->prepare("UPDATE users SET status = 'deactivated' WHERE id = ?")->execute([$facultyId]);
            }

            $pdo->commit();
            AuditLogger::log('DEACTIVATE_FACULTY', 'faculty', $facultyId, [
                'reassignment_option' => $option,
                'substitute_id' => $substituteId,
                'reason' => $reason
            ], $actor);

            return [
                'success' => true,
                'message' => 'Faculty deactivated. Future workload resolved and portal login terminated. Past classes and attribution strictly preserved.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Faculty deactivation failed: ' . $e->getMessage()];
        }
    }

    public static function reactivateFacultyAccount($facultyId, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE faculty_profiles SET account_status = 'active' WHERE user_id = ?")->execute([$facultyId]);
            try {
                $pdo->prepare("UPDATE users SET status = 'active', deactivated_at = NULL, deactivation_reason = NULL, is_archived = 0 WHERE id = ?")->execute([$facultyId]);
            } catch (Exception $eUserCol) {
                $pdo->prepare("UPDATE users SET status = 'active', is_archived = 0 WHERE id = ?")->execute([$facultyId]);
            }

            $pdo->commit();
            AuditLogger::log('REACTIVATE_FACULTY', 'faculty', $facultyId, [], $actor);
            return ['success' => true, 'message' => 'Faculty account reactivated successfully. Login access restored.'];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Reactivation failed: ' . $e->getMessage()];
        }
    }

    public static function archiveFaculty($facultyId, $data, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;
        $option = trim($data['reassignment_option'] ?? 'unassign');
        $substituteId = !empty($data['substitute_faculty_id']) ? (int)$data['substitute_faculty_id'] : null;
        $reason = trim($data['reason'] ?? 'Faculty contract completed / archived');

        $pdo->beginTransaction();
        try {
            if ($option === 'reassign' && $substituteId) {
                $pdo->prepare("UPDATE class_sessions SET faculty_id = ? WHERE faculty_id = ? AND start_time >= CURRENT_TIMESTAMP AND status != 'cancelled'")
                    ->execute([$substituteId, $facultyId]);
                $pdo->prepare("UPDATE batches SET lead_faculty_id = ? WHERE lead_faculty_id = ?")
                    ->execute([$substituteId, $facultyId]);
            } else {
                $pdo->prepare("UPDATE class_sessions SET faculty_id = NULL WHERE faculty_id = ? AND start_time >= CURRENT_TIMESTAMP AND status != 'cancelled'")
                    ->execute([$facultyId]);
                $pdo->prepare("UPDATE batches SET lead_faculty_id = NULL WHERE lead_faculty_id = ?")
                    ->execute([$facultyId]);
            }

            $pdo->prepare("
                UPDATE faculty_profiles
                SET account_status = 'archived', archived_at = CURRENT_TIMESTAMP, archival_reason = ?
                WHERE user_id = ?
            ")->execute([$reason, $facultyId]);

            $pdo->prepare("
                UPDATE users
                SET is_archived = 1, status = 'archived', archived_at = CURRENT_TIMESTAMP, archival_reason = ?
                WHERE id = ?
            ")->execute([$reason, $facultyId]);

            $pdo->commit();
            AuditLogger::log('ARCHIVE_FACULTY', 'faculty', $facultyId, ['reason' => $reason], $actor);
            return [
                'success' => true,
                'message' => 'Faculty archived. Removed from operational lists and login blocked. Past classes and attribution preserved.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Archival failed: ' . $e->getMessage()];
        }
    }

    public static function restoreFaculty($facultyId, $actor) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE faculty_profiles SET account_status = 'deactivated', archived_at = NULL WHERE user_id = ?")->execute([$facultyId]);
            $pdo->prepare("UPDATE users SET is_archived = 0, status = 'deactivated', archived_at = NULL WHERE id = ?")->execute([$facultyId]);

            $pdo->commit();
            AuditLogger::log('RESTORE_FACULTY', 'faculty', $facultyId, [], $actor);
            return [
                'success' => true,
                'message' => 'Faculty restored to inactive roster. Account is restored as deactivated; explicit reactivation is required.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Restore failed: ' . $e->getMessage()];
        }
    }

    public static function checkFacultyDeletionEligibility($facultyId) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $userStmt = $pdo->prepare("SELECT id, full_name, email, role, authorized_roles_json FROM users WHERE id = ?");
        $userStmt->execute([$facultyId]);
        $u = $userStmt->fetch();

        $roles = [];
        if ($u && !empty($u['authorized_roles_json'])) {
            $roles = json_decode($u['authorized_roles_json'], true) ?: [];
        }
        if ($u && empty($roles)) {
            $roles = [$u['role']];
        }
        $isMultiRole = $u ? (count($roles) > 1 || !in_array($u['role'], ['faculty', 'instructor'])) : false;

        $assignedBatches = 0;
        try {
            $assignedBatches = (int)$pdo->query("SELECT COUNT(*) FROM faculty_batch_assignments WHERE faculty_id = {$facultyId}")->fetchColumn();
        } catch (Exception $e) {}

        $completedSessCount = 0;
        try {
            $completedSessCount = (int)$pdo->query("SELECT COUNT(*) FROM class_sessions WHERE faculty_id = {$facultyId} AND status = 'completed'")->fetchColumn();
        } catch (Exception $e) {}

        $upcomingSessCount = 0;
        try {
            $upcomingSessCount = (int)$pdo->query("SELECT COUNT(*) FROM class_sessions WHERE faculty_id = {$facultyId} AND (status != 'completed' OR status IS NULL)")->fetchColumn();
        } catch (Exception $e) {}

        $attCount = 0;
        try {
            $attCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance_records WHERE marked_by = {$facultyId}")->fetchColumn();
        } catch (Exception $e) {}

        $gradeCount = 0;
        try {
            $gradeCount = (int)$pdo->query("SELECT COUNT(*) FROM task_submissions WHERE graded_by = {$facultyId}")->fetchColumn();
        } catch (Exception $e) {}

        $certCount = 0;
        try {
            $certCount = (int)$pdo->query("SELECT COUNT(*) FROM certificates WHERE issuer_id = {$facultyId}")->fetchColumn();
        } catch (Exception $e) {}

        // Critical historical dependencies: immutable student audit records
        $dependencies = [];
        if ($attCount > 0) $dependencies[] = "{$attCount} attendance audit record(s) marked";
        if ($gradeCount > 0) $dependencies[] = "{$gradeCount} student assignment grading evaluation(s)";
        if ($certCount > 0) $dependencies[] = "{$certCount} accredited digital certificate(s) signed";
        if ($completedSessCount > 0) $dependencies[] = "{$completedSessCount} completed historical class session(s)";

        $isEligible = count($dependencies) === 0;

        $warnings = [];
        if ($assignedBatches > 0) {
            $warnings[] = "Assigned to {$assignedBatches} cohort batch(es) (will be automatically unassigned upon deletion)";
        }
        if ($upcomingSessCount > 0) {
            $warnings[] = "{$upcomingSessCount} upcoming scheduled session(s) (will be unassigned or cancelled upon deletion)";
        }

        return [
            'success' => true,
            'eligible' => $isEligible,
            'can_delete' => $isEligible,
            'can_delete_permanently' => $isEligible,
            'is_multi_role' => $isMultiRole,
            'roles' => $roles,
            'assigned_batches' => $assignedBatches,
            'stats' => [
                'assigned_batches' => $assignedBatches,
                'past_classes' => $completedSessCount,
                'upcoming_sessions' => $upcomingSessCount,
                'attendance_sessions' => $attCount,
                'graded_submissions' => $gradeCount,
                'certificates_count' => $certCount,
            ],
            'sessions_count' => $completedSessCount + $upcomingSessCount,
            'attendance_count' => $attCount,
            'grading_count' => $gradeCount,
            'certificates_count' => $certCount,
            'dependencies' => $dependencies,
            'warnings' => $warnings,
            'reason' => $isEligible
                ? ($assignedBatches > 0
                    ? "Faculty is assigned to {$assignedBatches} batch(es). Permanent deletion will automatically unassign them and remove the faculty record."
                    : 'Faculty has zero instructional history and may be safely deleted.')
                : 'Permanent deletion is protected to preserve instructional audit trails and student grading attribution. Retained records: ' . implode(', ', $dependencies) . '.',
            'recommendation' => $isEligible ? null : 'Use Archive Faculty or Deactivate Account instead, or use Administrator Force Delete to unassign past teaching records.'
        ];
    }

    public static function deleteFaculty($facultyId, $actor, $force = false) {
        $pdo = Database::getConnection();
        $facultyId = (int)$facultyId;

        $eligibility = self::checkFacultyDeletionEligibility($facultyId);
        if (!$eligibility['eligible'] && !$force) {
            http_response_code(400);
            return [
                'success' => false,
                'error' => $eligibility['reason'],
                'recommendation' => $eligibility['recommendation'],
                'eligibility' => $eligibility
            ];
        }

        $pdo->beginTransaction();
        try {
            $userStmt = $pdo->prepare("SELECT id, role, authorized_roles_json FROM users WHERE id = ?");
            $userStmt->execute([$facultyId]);
            $u = $userStmt->fetch();

            if (!$u) {
                $pdo->rollBack();
                try { $pdo->prepare("DELETE FROM faculty_profiles WHERE user_id = ?")->execute([$facultyId]); } catch (Exception $e) {}
                try { $pdo->prepare("DELETE FROM faculty_batch_assignments WHERE faculty_id = ?")->execute([$facultyId]); } catch (Exception $e) {}
                return ['success' => true, 'message' => 'Faculty member record was already purged.'];
            }

            $roles = [];
            if (!empty($u['authorized_roles_json'])) {
                $roles = json_decode($u['authorized_roles_json'], true) ?: [];
            }
            if (empty($roles)) {
                $roles = [$u['role']];
            }

            // 1. Unassign from all batches & clear lead_faculty_id
            $pdo->prepare("DELETE FROM faculty_batch_assignments WHERE faculty_id = ?")->execute([$facultyId]);
            $pdo->prepare("UPDATE batches SET lead_faculty_id = NULL WHERE lead_faculty_id = ?")->execute([$facultyId]);

            // 2. Clean up class sessions
            $pdo->prepare("DELETE FROM class_sessions WHERE faculty_id = ? AND (status != 'completed' OR status IS NULL)")->execute([$facultyId]);
            $pdo->prepare("UPDATE class_sessions SET faculty_id = NULL WHERE faculty_id = ?")->execute([$facultyId]);

            // 3. Clear audit attribution for historical records if force deleted
            try { $pdo->prepare("UPDATE attendance_records SET marked_by = NULL WHERE marked_by = ?")->execute([$facultyId]); } catch (Exception $e) {}
            try { $pdo->prepare("UPDATE task_submissions SET graded_by = NULL WHERE graded_by = ?")->execute([$facultyId]); } catch (Exception $e) {}
            try { $pdo->prepare("UPDATE certificates SET issuer_id = NULL WHERE issuer_id = ?")->execute([$facultyId]); } catch (Exception $e) {}
            try { $pdo->prepare("UPDATE course_evaluations SET faculty_id = NULL WHERE faculty_id = ?")->execute([$facultyId]); } catch (Exception $e) {}

            // 4. Delete faculty profile & password resets
            $pdo->prepare("DELETE FROM faculty_profiles WHERE user_id = ?")->execute([$facultyId]);
            try { $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")->execute([$facultyId]); } catch (Exception $e) {}

            $remainingRoles = array_values(array_filter($roles, function($r) {
                return !in_array($r, ['faculty', 'instructor']);
            }));

            $multiRoleRetained = false;
            $newRole = null;

            if (count($remainingRoles) > 0) {
                $multiRoleRetained = true;
                $newRole = $remainingRoles[0];
                $stmtUpd = $pdo->prepare("
                    UPDATE users
                    SET role = ?, authorized_roles_json = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $stmtUpd->execute([$newRole, json_encode($remainingRoles), $facultyId]);
            } else {
                try {
                    $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$facultyId]);
                } catch (Exception $e) {
                    $pdo->prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted' WHERE id = ?")->execute([$facultyId]);
                }
            }

            $pdo->commit();
            AuditLogger::log('DELETE_FACULTY', 'faculty', $facultyId, [
                'multi_role_retained' => $multiRoleRetained,
                'remaining_roles' => $remainingRoles,
                'forced' => (bool)$force
            ], $actor);

            return [
                'success' => true,
                'multi_role_retained' => $multiRoleRetained,
                'remaining_role' => $newRole,
                'message' => $multiRoleRetained
                    ? "Faculty profile removed. User account retained with remaining role: {$newRole}."
                    : 'Faculty record permanently deleted.'
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Deletion failed: ' . $e->getMessage()];
        }
    }


    // -------------------------------------------------------------
    // 4. BATCHES MANAGEMENT
    // -------------------------------------------------------------
    public static function getBatches($queryParams = []) {
        $pdo = Database::getConnection();

        $view = trim($queryParams['view'] ?? 'active'); // 'active' | 'archived' | 'all'
        $search = trim($queryParams['search'] ?? '');
        $status = trim($queryParams['status'] ?? '');

        $sql = "
            SELECT b.id, b.course_id, b.batch_code, b.title, b.start_date, b.end_date,
                   b.capacity, b.delivery_mode, b.timezone, b.status, b.created_at, b.archived_at,
                   c.title as course_title, c.category as course_category,
                   coord.full_name as coordinator_name,
                   fac.full_name as lead_faculty_name,
                   (
                       SELECT COUNT(be.id) 
                       FROM batch_enrollments be 
                       WHERE be.batch_id = b.id AND be.status = 'active'
                   ) as enrolled_count
            FROM batches b
            LEFT JOIN courses c ON b.course_id = c.id
            LEFT JOIN users coord ON b.coordinator_id = coord.id
            LEFT JOIN users fac ON b.lead_faculty_id = fac.id
            WHERE 1=1
        ";
        $params = [];

        if ($view === 'archived') {
            $sql .= " AND (b.status = 'archived' OR b.is_archived = 1) AND (b.is_deleted = 0 OR b.is_deleted IS NULL)";
        } elseif ($view === 'all') {
            $sql .= " AND (b.is_deleted = 0 OR b.is_deleted IS NULL)";
        } else {
            $sql .= " AND (b.is_deleted = 0 OR b.is_deleted IS NULL) AND (b.is_archived = 0 OR b.is_archived IS NULL) AND (b.status != 'archived' OR b.status IS NULL)";
        }

        if ($search !== '') {
            $sql .= " AND (b.batch_code LIKE ? OR b.title LIKE ? OR c.title LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($status !== '' && $status !== 'all') {
            $sql .= " AND b.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY b.start_date DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $batches = $stmt->fetchAll();

        return [
            'success' => true,
            'batches' => $batches
        ];
    }

    public static function createBatch($data, $actor) {
        $pdo = Database::getConnection();

        $courseId = (int)($data['course_id'] ?? 0);
        $batchCode = strtoupper(trim($data['batch_code'] ?? ''));
        $title = trim($data['title'] ?? '');
        $startDate = trim($data['start_date'] ?? '');
        $endDate = trim($data['end_date'] ?? '');
        $capacity = (int)($data['capacity'] ?? 30);
        $deliveryMode = trim($data['delivery_mode'] ?? 'Online Live');
        $timezone = trim($data['timezone'] ?? 'Asia/Kolkata');
        $coordinatorId = !empty($data['coordinator_id']) ? (int)$data['coordinator_id'] : $actor['id'];
        $leadFacultyId = !empty($data['lead_faculty_id']) ? (int)$data['lead_faculty_id'] : null;

        if (!$courseId || !$batchCode || !$title || !$startDate || !$endDate) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Course, Batch Code, Title, Start Date and End Date are mandatory.'];
        }

        // Validate course existence
        $cCheck = $pdo->prepare("SELECT id FROM courses WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)");
        $cCheck->execute([$courseId]);
        if (!$cCheck->fetch()) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Selected parent course does not exist or has been removed.', 'field' => 'course_id'];
        }

        // Validate capacity
        if ($capacity <= 0 || $capacity > 1000) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Batch capacity must be a positive integer between 1 and 1000.', 'field' => 'capacity'];
        }

        // Validate lead faculty if provided
        if ($leadFacultyId) {
            $fCheck = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $fCheck->execute([$leadFacultyId]);
            if (!$fCheck->fetch()) {
                http_response_code(400);
                return ['success' => false, 'error' => 'Selected lead faculty member does not exist.', 'field' => 'lead_faculty_id'];
            }
        }

        // Validate date ranges
        if (strtotime($endDate) <= strtotime($startDate)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Batch End Date must be after Start Date.'];
        }

        // Check unique batch code
        $check = $pdo->prepare("SELECT id FROM batches WHERE batch_code = ?");
        $check->execute([$batchCode]);
        if ($check->fetch()) {
            http_response_code(409);
            return ['success' => false, 'error' => "Batch code {$batchCode} is already in use."];
        }

        $stmt = $pdo->prepare("
            INSERT INTO batches (
                course_id, batch_code, title, start_date, end_date, capacity,
                delivery_mode, timezone, coordinator_id, lead_faculty_id, status, is_deleted, is_archived, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', 0, 0, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $courseId, $batchCode, $title, $startDate, $endDate, $capacity,
            $deliveryMode, $timezone, $coordinatorId, $leadFacultyId
        ]);
        $batchId = (int)$pdo->lastInsertId();

        if ($leadFacultyId) {
            $stmtFba = $pdo->prepare("
                INSERT IGNORE INTO faculty_batch_assignments (faculty_id, batch_id, role)
                VALUES (?, ?, 'Lead Faculty')
            ");
            $stmtFba->execute([$leadFacultyId, $batchId]);
        }

        AuditLogger::log('CREATE_BATCH', 'batch', $batchId, [
            'batch_code' => $batchCode,
            'course_id' => $courseId,
            'capacity' => $capacity
        ], $actor);

        return [
            'success' => true,
            'message' => "Batch {$batchCode} created successfully.",
            'batch_id' => $batchId
        ];
    }

    public static function updateBatch($batchId, $data, $actor) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;

        $title = trim($data['title'] ?? '');
        $batchCode = strtoupper(trim($data['batch_code'] ?? ''));
        $startDate = trim($data['start_date'] ?? '');
        $endDate = trim($data['end_date'] ?? '');
        $capacity = (int)($data['capacity'] ?? 30);
        $deliveryMode = trim($data['delivery_mode'] ?? 'Online Live');
        $timezone = trim($data['timezone'] ?? 'Asia/Kolkata');
        $status = trim($data['status'] ?? 'active');
        $leadFacultyId = !empty($data['lead_faculty_id']) ? (int)$data['lead_faculty_id'] : null;

        if (!$title || !$batchCode || !$startDate || !$endDate) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Batch title, code, start and end dates are required.'];
        }

        $check = $pdo->prepare("SELECT id FROM batches WHERE batch_code = ? AND id != ?");
        $check->execute([$batchCode, $batchId]);
        if ($check->fetch()) {
            http_response_code(409);
            return ['success' => false, 'error' => "Batch code {$batchCode} is in use."];
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                UPDATE batches
                SET title = ?, batch_code = ?, start_date = ?, end_date = ?, capacity = ?,
                    delivery_mode = ?, timezone = ?, status = ?, lead_faculty_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([
                $title, $batchCode, $startDate, $endDate, $capacity,
                $deliveryMode, $timezone, $status, $leadFacultyId, $batchId
            ]);

            if ($leadFacultyId) {
                $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
                if ($isSqlite) {
                    $pdo->prepare("INSERT OR REPLACE INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, 'Lead Faculty')")
                        ->execute([$leadFacultyId, $batchId]);
                } else {
                    $pdo->prepare("INSERT INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, 'Lead Faculty') ON DUPLICATE KEY UPDATE role = 'Lead Faculty'")
                        ->execute([$leadFacultyId, $batchId]);
                }
            }

            $pdo->commit();
            AuditLogger::log('UPDATE_BATCH', 'batch', $batchId, ['batch_code' => $batchCode, 'title' => $title], $actor);
            return ['success' => true, 'message' => "Batch {$batchCode} updated successfully."];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Batch update failed: ' . $e->getMessage()];
        }
    }

    public static function getBatchStudents($batchId) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;

        $stmt = $pdo->prepare("
            SELECT u.id as user_id, u.full_name, u.email, u.avatar,
                   sp.student_id_code, sp.mobile, sp.account_status,
                   be.status as batch_enrollment_status, be.enrolled_at, be.withdrawal_reason, be.withdrawn_at
            FROM batch_enrollments be
            JOIN users u ON be.user_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            WHERE be.batch_id = ?
            ORDER BY be.enrolled_at DESC
        ");
        $stmt->execute([$batchId]);
        return ['success' => true, 'students' => $stmt->fetchAll()];
    }

    public static function addBatchStudent($batchId, $data, $actor) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;
        $studentId = (int)($data['user_id'] ?? 0);

        if (!$studentId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Student user ID is required.'];
        }

        $batchStmt = $pdo->prepare("SELECT id, course_id, capacity FROM batches WHERE id = ?");
        $batchStmt->execute([$batchId]);
        $batch = $batchStmt->fetch();
        if (!$batch) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Batch not found.'];
        }

        $courseId = (int)$batch['course_id'];
        return self::enrollStudentCourse($studentId, ['course_id' => $courseId, 'batch_id' => $batchId], $actor);
    }

    public static function withdrawBatchStudent($batchId, $studentId, $data, $actor) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;
        $studentId = (int)$studentId;
        $reason = trim($data['reason'] ?? $data['withdrawal_reason'] ?? 'Removed from cohort');

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                UPDATE batch_enrollments
                SET status = 'withdrawn', withdrawal_reason = ?, withdrawn_at = CURRENT_TIMESTAMP
                WHERE batch_id = ? AND user_id = ? AND status = 'active'
            ");
            $stmt->execute([$reason, $batchId, $studentId]);

            $pdo->commit();
            AuditLogger::log('WITHDRAW_BATCH_STUDENT', 'batch', $batchId, ['student_id' => $studentId, 'reason' => $reason], $actor);
            return ['success' => true, 'message' => 'Student withdrawn from cohort batch.'];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Withdrawal failed: ' . $e->getMessage()];
        }
    }

    public static function assignBatchFaculty($batchId, $data, $actor) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;
        $facultyId = (int)($data['faculty_id'] ?? 0);
        $role = trim($data['role'] ?? 'Lead Faculty');

        if (!$facultyId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Faculty ID is required.'];
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE batches SET lead_faculty_id = ? WHERE id = ?")->execute([$facultyId, $batchId]);

            $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
            if ($isSqlite) {
                $stmt = $pdo->prepare("INSERT OR REPLACE INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, ?)");
            } else {
                $stmt = $pdo->prepare("INSERT INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)");
            }
            $stmt->execute([$facultyId, $batchId, $role]);

            $pdo->commit();
            AuditLogger::log('ASSIGN_BATCH_FACULTY', 'batch', $batchId, ['faculty_id' => $facultyId, 'role' => $role], $actor);
            return ['success' => true, 'message' => 'Lead faculty assigned to cohort batch.'];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Faculty assignment failed: ' . $e->getMessage()];
        }
    }

    public static function archiveBatch($batchId, $actor) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;

        $stmt = $pdo->prepare("UPDATE batches SET status = 'archived', archived_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$batchId]);

        AuditLogger::log('ARCHIVE_BATCH', 'batch', $batchId, [], $actor);
        return ['success' => true, 'message' => 'Batch archived successfully.'];
    }

    public static function restoreBatch($batchId, $actor) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;

        $stmt = $pdo->prepare("UPDATE batches SET status = 'active', archived_at = NULL WHERE id = ?");
        $stmt->execute([$batchId]);

        AuditLogger::log('RESTORE_BATCH', 'batch', $batchId, [], $actor);
        return ['success' => true, 'message' => 'Batch restored to active cohorts.'];
    }

    public static function updateBatchStatus($batchId, $data, $actor) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;
        $status = strtolower(trim($data['status'] ?? 'active'));
        $allowed = ['active', 'upcoming', 'completed', 'cancelled', 'archived'];
        if (!in_array($status, $allowed)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid batch status.'];
        }

        $stmt = $pdo->prepare("UPDATE batches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$status, $batchId]);

        AuditLogger::log('UPDATE_BATCH_STATUS', 'batch', $batchId, ['status' => $status], $actor);
        return ['success' => true, 'message' => "Batch status updated to {$status}."];
    }

    public static function checkBatchDeletionEligibility($batchId) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;

        $stmt = $pdo->prepare("SELECT id, batch_code, title, status FROM batches WHERE id = ?");
        $stmt->execute([$batchId]);
        $batch = $stmt->fetch();
        if (!$batch) {
            return [
                'success' => true,
                'eligible' => true,
                'can_delete' => true,
                'can_delete_permanently' => true,
                'is_ghost' => true,
                'dependencies' => [
                    'enrolled_students' => 0,
                    'faculty_assignments' => 0,
                    'scheduled_sessions' => 0,
                    'attendance_records' => 0,
                    'task_submissions' => 0,
                    'issued_certificates' => 0,
                ],
                'blocking_reasons' => [],
                'reason' => 'Cohort batch is not found in active database records (or was already removed). It can be safely purged from view.'
            ];
        }

        $enrolledStudents = 0;
        try {
            $enrolledStudents = (int)$pdo->query("SELECT COUNT(*) FROM batch_enrollments WHERE batch_id = {$batchId}")->fetchColumn();
        } catch (Exception $e) {}

        $facultyAssignments = 0;
        try {
            $facultyAssignments = (int)$pdo->query("SELECT COUNT(*) FROM faculty_batch_assignments WHERE batch_id = {$batchId}")->fetchColumn();
        } catch (Exception $e) {}

        $scheduledSessions = 0;
        try {
            $scheduledSessions = (int)$pdo->query("SELECT COUNT(*) FROM class_sessions WHERE batch_id = {$batchId}")->fetchColumn();
        } catch (Exception $e) {}

        $attendanceRecords = 0;
        try {
            $attendanceRecords = (int)$pdo->query("
                SELECT COUNT(*) FROM attendance_records ar
                JOIN class_sessions cs ON ar.session_id = cs.id
                WHERE cs.batch_id = {$batchId}
            ")->fetchColumn();
        } catch (Exception $e) {}

        $taskSubmissions = 0;
        try {
            $taskSubmissions = (int)$pdo->query("
                SELECT COUNT(*) FROM task_submissions ts
                JOIN batch_enrollments be ON ts.enrollment_id = be.enrollment_id
                WHERE be.batch_id = {$batchId}
            ")->fetchColumn();
        } catch (Exception $e) {}

        $issuedCertificates = 0;
        try {
            $issuedCertificates = (int)$pdo->query("SELECT COUNT(*) FROM certificates WHERE batch_id = {$batchId}")->fetchColumn();
        } catch (Exception $e) {}

        $criticalDependencies = $enrolledStudents + $scheduledSessions + $attendanceRecords + $taskSubmissions + $issuedCertificates;
        $canDelete = ($criticalDependencies === 0);

        $depList = [];
        if ($enrolledStudents > 0) $depList[] = "{$enrolledStudents} enrolled student(s)";
        if ($facultyAssignments > 0) $depList[] = "{$facultyAssignments} faculty assignment(s)";
        if ($scheduledSessions > 0) $depList[] = "{$scheduledSessions} scheduled session(s)";
        if ($attendanceRecords > 0) $depList[] = "{$attendanceRecords} attendance record(s)";
        if ($taskSubmissions > 0) $depList[] = "{$taskSubmissions} task submission(s)";
        if ($issuedCertificates > 0) $depList[] = "{$issuedCertificates} issued certificate(s)";

        return [
            'success' => true,
            'eligible' => $canDelete,
            'can_delete' => $canDelete,
            'can_delete_permanently' => $canDelete,
            'dependencies' => [
                'enrolled_students' => $enrolledStudents,
                'faculty_assignments' => $facultyAssignments,
                'scheduled_sessions' => $scheduledSessions,
                'attendance_records' => $attendanceRecords,
                'task_submissions' => $taskSubmissions,
                'issued_certificates' => $issuedCertificates,
            ],
            'blocking_reasons' => $depList,
            'reason' => $canDelete
                ? 'Batch has zero student enrollments or academic records and can be safely deleted.'
                : 'Permanent deletion is prohibited to protect academic records. Retained: ' . implode(', ', $depList) . '.',
            'recommendation' => $canDelete ? null : 'Use Archive Batch instead to preserve cohort audit records.'
        ];
    }

    public static function deleteBatch($batchId, $actor, $inputData = []) {
        $pdo = Database::getConnection();
        $batchId = (int)$batchId;

        $isPermanent = !empty($_GET['permanent']) || !empty($_POST['permanent']) || !empty($inputData['permanent']);

        $stmt = $pdo->prepare("SELECT id, batch_code, title, status FROM batches WHERE id = ?");
        $stmt->execute([$batchId]);
        $batch = $stmt->fetch();
        if (!$batch) {
            try { $pdo->prepare("DELETE FROM faculty_batch_assignments WHERE batch_id = ?")->execute([$batchId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM class_sessions WHERE batch_id = ?")->execute([$batchId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM batch_enrollments WHERE batch_id = ?")->execute([$batchId]); } catch (Exception $e) {}
            return [
                'success' => true,
                'message' => 'Cohort batch was already purged from the database.'
            ];
        }

        if ($isPermanent) {
            try { $pdo->prepare("DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM class_sessions WHERE batch_id = ?)")->execute([$batchId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM task_submissions WHERE enrollment_id IN (SELECT id FROM batch_enrollments WHERE batch_id = ?)")->execute([$batchId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM faculty_batch_assignments WHERE batch_id = ?")->execute([$batchId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM class_sessions WHERE batch_id = ?")->execute([$batchId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM batch_enrollments WHERE batch_id = ?")->execute([$batchId]); } catch (Exception $e) {}
            $delStmt = $pdo->prepare("DELETE FROM batches WHERE id = ?");
            $delStmt->execute([$batchId]);
        } else {
            $enrolledCount = 0;
            try {
                $enrolledCount = (int)$pdo->query("SELECT COUNT(*) FROM batch_enrollments WHERE batch_id = {$batchId}")->fetchColumn();
            } catch (Exception $e) {}

            $sessionsCount = 0;
            try {
                $sessionsCount = (int)$pdo->query("SELECT COUNT(*) FROM class_sessions WHERE batch_id = {$batchId}")->fetchColumn();
            } catch (Exception $e) {}

            if ($enrolledCount > 0 || $sessionsCount > 0) {
                // Soft archive to protect audit logs
                $stmt = $pdo->prepare("UPDATE batches SET status = 'archived', is_archived = 1, archived_at = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->execute([$batchId]);
            } else {
                $stmt = $pdo->prepare("UPDATE batches SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->execute([$batchId]);
            }
        }

        AuditLogger::log('DELETE_BATCH', 'batch', $batchId, ['permanent' => $isPermanent], $actor);
        return ['success' => true, 'message' => 'Cohort batch successfully removed.'];
    }


    // -------------------------------------------------------------
    // 5. CLASS SCHEDULING
    // -------------------------------------------------------------
    public static function getSchedule($queryParams = []) {
        $pdo = Database::getConnection();

        $batchId = !empty($queryParams['batch_id']) ? (int)$queryParams['batch_id'] : null;
        $facultyId = !empty($queryParams['faculty_id']) ? (int)$queryParams['faculty_id'] : null;

        $sql = "
            SELECT cs.*, 
                   b.batch_code, b.title as batch_title, b.delivery_mode,
                   c.title as course_title,
                   u.full_name as faculty_name, u.avatar as faculty_avatar
            FROM class_sessions cs
            JOIN batches b ON cs.batch_id = b.id
            JOIN courses c ON b.course_id = c.id
            JOIN users u ON cs.faculty_id = u.id
            WHERE 1=1
        ";
        $params = [];

        if ($batchId) {
            $sql .= " AND cs.batch_id = ?";
            $params[] = $batchId;
        }

        if ($facultyId) {
            $sql .= " AND cs.faculty_id = ?";
            $params[] = $facultyId;
        }

        $sql .= " ORDER BY cs.start_time ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $sessions = $stmt->fetchAll();

        return [
            'success' => true,
            'sessions' => $sessions
        ];
    }

    public static function createSession($data, $actor) {
        $pdo = Database::getConnection();

        $batchId = (int)($data['batch_id'] ?? 0);
        $facultyId = (int)($data['faculty_id'] ?? 0);
        $topic = trim($data['topic'] ?? '');
        $description = trim($data['description'] ?? '');
        $startTime = trim($data['start_time'] ?? '');
        $endTime = trim($data['end_time'] ?? '');
        $sessionType = trim($data['session_type'] ?? 'Lecture');
        $meetingLink = trim($data['meeting_link'] ?? '');
        $classroom = trim($data['classroom_location'] ?? '');

        if (!$batchId || !$facultyId || !$topic || !$startTime || !$endTime) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Batch, Faculty, Topic, Start Time, and End Time are required.'];
        }

        if (strtotime($endTime) <= strtotime($startTime)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'End time must be after Start time.'];
        }

        // Faculty conflict check: Is faculty already booked for an overlapping session?
        $stmtConflict = $pdo->prepare("
            SELECT cs.id, cs.topic, cs.start_time, cs.end_time, b.batch_code
            FROM class_sessions cs
            JOIN batches b ON cs.batch_id = b.id
            WHERE cs.faculty_id = ? 
              AND cs.status != 'cancelled'
              AND cs.start_time < ? 
              AND cs.end_time > ?
        ");
        $stmtConflict->execute([$facultyId, $endTime, $startTime]);
        $conflict = $stmtConflict->fetch();
        if ($conflict) {
            http_response_code(409);
            return [
                'success' => false,
                'error' => "Schedule Conflict: Faculty is already assigned to '{$conflict['topic']}' ({$conflict['batch_code']}) during this timeframe ({$conflict['start_time']} - {$conflict['end_time']})."
            ];
        }

        $stmt = $pdo->prepare("
            INSERT INTO class_sessions (
                batch_id, faculty_id, topic, description, start_time, end_time,
                session_type, meeting_link, classroom_location, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$batchId, $facultyId, $topic, $description, $startTime, $endTime, $sessionType, $meetingLink, $classroom]);
        $sessionId = (int)$pdo->lastInsertId();

        AuditLogger::log('CREATE_SESSION', 'class_session', $sessionId, [
            'batch_id' => $batchId,
            'topic' => $topic,
            'start_time' => $startTime
        ], $actor);

        return [
            'success' => true,
            'message' => "Class session '{$topic}' scheduled successfully.",
            'session_id' => $sessionId
        ];
    }

    public static function rescheduleSession($sessionId, $data, $actor) {
        $pdo = Database::getConnection();
        $startTime = trim($data['start_time'] ?? '');
        $endTime = trim($data['end_time'] ?? '');
        $reason = trim($data['reason'] ?? 'Rescheduled by administrator');

        if (!$startTime || !$endTime) {
            http_response_code(400);
            return ['success' => false, 'error' => 'New Start Time and End Time are required.'];
        }

        $stmt = $pdo->prepare("
            UPDATE class_sessions
            SET start_time = ?, end_time = ?, status = 'rescheduled', reschedule_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$startTime, $endTime, $reason, (int)$sessionId]);

        AuditLogger::log('RESCHEDULE_SESSION', 'class_session', $sessionId, [
            'start_time' => $startTime,
            'end_time' => $endTime,
            'reason' => $reason
        ], $actor);

        return ['success' => true, 'message' => 'Class session rescheduled successfully.'];
    }

    public static function cancelSession($sessionId, $data, $actor) {
        $pdo = Database::getConnection();
        $reason = trim($data['reason'] ?? 'Cancelled by coordinator');

        $stmt = $pdo->prepare("
            UPDATE class_sessions
            SET status = 'cancelled', cancel_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$reason, (int)$sessionId]);

        AuditLogger::log('CANCEL_SESSION', 'class_session', $sessionId, ['reason' => $reason], $actor);
        return ['success' => true, 'message' => 'Class session marked as cancelled.'];
    }

    public static function deleteSession($sessionId, $actor) {
        $pdo = Database::getConnection();
        $sessionId = (int)$sessionId;

        $attCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance_records WHERE session_id = {$sessionId}")->fetchColumn();
        if ($attCount > 0) {
            http_response_code(400);
            return [
                'success' => false,
                'error' => "Cannot delete class session: {$attCount} attendance record(s) exist.",
                'recommendation' => 'Use Cancel Session instead to preserve student attendance history.'
            ];
        }

        $stmt = $pdo->prepare("DELETE FROM class_sessions WHERE id = ?");
        $stmt->execute([$sessionId]);

        AuditLogger::log('DELETE_SESSION', 'class_session', $sessionId, [], $actor);
        return ['success' => true, 'message' => 'Unused class session permanently deleted.'];
    }


    // -------------------------------------------------------------
    // 6. ATTENDANCE OPERATIONS
    // -------------------------------------------------------------
    public static function getSessionAttendance($sessionId) {
        $pdo = Database::getConnection();

        $stmtSession = $pdo->prepare("
            SELECT cs.*, b.batch_code, b.title as batch_title
            FROM class_sessions cs
            JOIN batches b ON cs.batch_id = b.id
            WHERE cs.id = ?
        ");
        $stmtSession->execute([(int)$sessionId]);
        $session = $stmtSession->fetch();

        if (!$session) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Class session not found.'];
        }

        // Fetch all active enrolled students in this batch with their attendance record if exists
        $stmt = $pdo->prepare("
            SELECT u.id as user_id, u.full_name, u.email, u.avatar,
                   sp.student_id_code,
                   be.enrollment_id,
                   COALESCE(ar.status, 'present') as attendance_status,
                   ar.id as record_id,
                   ar.marked_at,
                   ar.correction_reason
            FROM batch_enrollments be
            JOIN users u ON be.user_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN attendance_records ar ON ar.session_id = ? AND ar.user_id = u.id
            WHERE be.batch_id = ? AND be.status = 'active'
            ORDER BY u.full_name ASC
        ");
        $stmt->execute([(int)$sessionId, (int)$session['batch_id']]);
        $roster = $stmt->fetchAll();

        return [
            'success' => true,
            'session' => $session,
            'roster' => $roster
        ];
    }

    public static function saveSessionAttendance($sessionId, $data, $actor) {
        $pdo = Database::getConnection();
        $records = is_array($data['records'] ?? null) ? $data['records'] : [];

        if (empty($records)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'No attendance records provided.'];
        }

        $pdo->beginTransaction();
        try {
            $stmtInsert = $pdo->prepare("
                INSERT INTO attendance_records (session_id, enrollment_id, user_id, status, marked_by, marked_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), marked_at = CURRENT_TIMESTAMP
            ");

            // For SQLite compatibility
            $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

            foreach ($records as $r) {
                $userId = (int)($r['user_id'] ?? 0);
                $enrollmentId = (int)($r['enrollment_id'] ?? 0);
                $status = in_array($r['status'] ?? '', ['present', 'absent', 'late', 'excused']) ? $r['status'] : 'present';

                if ($isSqlite) {
                    $stmtCheck = $pdo->prepare("SELECT id FROM attendance_records WHERE session_id = ? AND user_id = ?");
                    $stmtCheck->execute([(int)$sessionId, $userId]);
                    if ($existing = $stmtCheck->fetch()) {
                        $stmtUpd = $pdo->prepare("UPDATE attendance_records SET status = ?, marked_by = ?, marked_at = CURRENT_TIMESTAMP WHERE id = ?");
                        $stmtUpd->execute([$status, $actor['id'], $existing['id']]);
                    } else {
                        $stmtIns = $pdo->prepare("INSERT INTO attendance_records (session_id, enrollment_id, user_id, status, marked_by) VALUES (?, ?, ?, ?, ?)");
                        $stmtIns->execute([(int)$sessionId, $enrollmentId, $userId, $status, $actor['id']]);
                    }
                } else {
                    $stmtInsert->execute([(int)$sessionId, $enrollmentId, $userId, $status, $actor['id']]);
                }
            }

            // Mark session as completed if it was scheduled
            $stmtComp = $pdo->prepare("UPDATE class_sessions SET status = 'completed' WHERE id = ? AND status = 'scheduled'");
            $stmtComp->execute([(int)$sessionId]);

            $pdo->commit();

            AuditLogger::log('MARK_ATTENDANCE', 'class_session', $sessionId, [
                'count' => count($records)
            ], $actor);

            return ['success' => true, 'message' => 'Attendance saved successfully.'];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to save attendance: ' . $e->getMessage()];
        }
    }

    public static function correctAttendance($recordId, $data, $actor) {
        $pdo = Database::getConnection();
        $newStatus = trim($data['status'] ?? 'present');
        $reason = trim($data['reason'] ?? 'Correction logged by coordinator');

        $stmt = $pdo->prepare("
            UPDATE attendance_records
            SET status = ?, correction_reason = ?, corrected_by = ?, corrected_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$newStatus, $reason, $actor['id'], (int)$recordId]);

        AuditLogger::log('CORRECT_ATTENDANCE', 'attendance_record', $recordId, [
            'new_status' => $newStatus,
            'reason' => $reason
        ], $actor);

        return ['success' => true, 'message' => 'Attendance record corrected with audit justification.'];
    }

    // -------------------------------------------------------------
    // 7. FEES & FINANCIALS
    // -------------------------------------------------------------
    public static function getFeePlans($queryParams = []) {
        $pdo = Database::getConnection();

        $stmt = $pdo->query("
            SELECT fp.*, 
                   u.full_name as student_name, u.email as student_email,
                   sp.student_id_code,
                   c.title as course_title,
                   b.batch_code,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE fee_plan_id = fp.id AND is_refund = 0), 0) as total_paid
            FROM fee_plans fp
            JOIN users u ON fp.user_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            JOIN courses c ON fp.course_id = c.id
            JOIN enrollments e ON fp.enrollment_id = e.id
            LEFT JOIN batches b ON e.batch_id = b.id
            ORDER BY fp.id DESC
        ");
        $plans = $stmt->fetchAll();

        // Calculate dynamic balances (never rely on static balance fields)
        foreach ($plans as &$p) {
            $net = (float)$p['net_fee'];
            $paid = (float)$p['total_paid'];
            $p['balance_due'] = max(0, $net - $paid);
        }

        return ['success' => true, 'fee_plans' => $plans];
    }

    public static function recordPayment($data, $actor) {
        $pdo = Database::getConnection();

        $feePlanId = (int)($data['fee_plan_id'] ?? 0);
        $amount = (float)($data['amount'] ?? 0);
        $paymentMethod = trim($data['payment_method'] ?? 'Bank Transfer (NEFT/RTGS)');
        $transactionRef = trim($data['transaction_reference'] ?? '');
        $paymentDate = trim($data['payment_date'] ?? date('Y-m-d'));
        $notes = trim($data['notes'] ?? '');

        if (!$feePlanId || $amount <= 0) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Valid Fee Plan ID and positive payment amount are required.'];
        }

        // Generate unique receipt number: REC-2026-XXXXX
        $randSuffix = str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
        $receiptNumber = 'REC-2026-' . $randSuffix;

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO payments (
                    fee_plan_id, receipt_number, amount, payment_method, transaction_reference,
                    payment_date, notes, received_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$feePlanId, $receiptNumber, $amount, $paymentMethod, $transactionRef, $paymentDate, $notes, $actor['id']]);
            $paymentId = (int)$pdo->lastInsertId();

            // Re-calculate total paid to update fee plan status
            $stmtSum = $pdo->prepare("SELECT SUM(amount) FROM payments WHERE fee_plan_id = ? AND is_refund = 0");
            $stmtSum->execute([$feePlanId]);
            $totalPaid = (float)$stmtSum->fetchColumn();

            $stmtPlan = $pdo->prepare("SELECT net_fee, user_id FROM fee_plans WHERE id = ?");
            $stmtPlan->execute([$feePlanId]);
            $plan = $stmtPlan->fetch();

            $newStatus = ($totalPaid >= (float)$plan['net_fee']) ? 'paid' : 'partially_paid';
            $stmtUpd = $pdo->prepare("UPDATE fee_plans SET status = ? WHERE id = ?");
            $stmtUpd->execute([$newStatus, $feePlanId]);

            // Update student profile payment_status
            $stmtProfile = $pdo->prepare("UPDATE student_profiles SET payment_status = ? WHERE user_id = ?");
            $stmtProfile->execute([$newStatus, $plan['user_id']]);

            $pdo->commit();

            AuditLogger::log('RECORD_PAYMENT', 'payment', $paymentId, [
                'receipt_number' => $receiptNumber,
                'amount' => $amount,
                'fee_plan_id' => $feePlanId
            ], $actor);

            return [
                'success' => true,
                'message' => "Payment of INR {$amount} recorded with receipt {$receiptNumber}.",
                'receipt_number' => $receiptNumber,
                'payment_id' => $paymentId
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error recording payment: ' . $e->getMessage()];
        }
    }

    public static function recordRefund($data, $actor) {
        $pdo = Database::getConnection();

        $feePlanId = (int)($data['fee_plan_id'] ?? 0);
        $amount = (float)($data['amount'] ?? 0);
        $reason = trim($data['reason'] ?? 'Approved withdrawal');

        if (!$feePlanId || $amount <= 0 || !$reason) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Fee Plan, positive refund amount, and justified reason are required.'];
        }

        $receiptNumber = 'REF-2026-' . str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare("
            INSERT INTO payments (
                fee_plan_id, receipt_number, amount, payment_method, transaction_reference,
                payment_date, notes, received_by, is_refund, refund_reason, created_at
            ) VALUES (?, ?, ?, 'Refund Reversal', 'REFUND', CURRENT_DATE, ?, ?, 1, ?, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$feePlanId, $receiptNumber, $amount, $reason, $actor['id'], $reason]);

        AuditLogger::log('RECORD_REFUND', 'payment', $pdo->lastInsertId(), [
            'amount' => $amount,
            'reason' => $reason
        ], $actor);

        return ['success' => true, 'message' => "Refund receipt {$receiptNumber} issued for INR {$amount}."];
    }

    // -------------------------------------------------------------
    // 8. STUDENT FOLLOW-UP TRIAGE DASHBOARD
    // -------------------------------------------------------------
    public static function getFollowups($queryParams = []) {
        $pdo = Database::getConnection();

        $stmt = $pdo->query("
            SELECT sfu.*, 
                   u.full_name as student_name, u.email as student_email,
                   sp.student_id_code, sp.mobile,
                   b.batch_code,
                   assignee.full_name as assigned_to_name
            FROM student_followups sfu
            JOIN users u ON sfu.user_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN batches b ON sfu.batch_id = b.id
            LEFT JOIN users assignee ON sfu.assigned_to = assignee.id
            ORDER BY sfu.id DESC
        ");
        return ['success' => true, 'followups' => $stmt->fetchAll()];
    }

    public static function createFollowup($data, $actor) {
        $pdo = Database::getConnection();

        $userId = (int)($data['user_id'] ?? 0);
        $batchId = !empty($data['batch_id']) ? (int)$data['batch_id'] : null;
        $reason = trim($data['reason'] ?? 'low_attendance');
        $description = trim($data['description'] ?? '');
        $assignedTo = !empty($data['assigned_to']) ? (int)$data['assigned_to'] : $actor['id'];
        $priority = trim($data['priority'] ?? 'medium');
        $nextDate = trim($data['next_followup_date'] ?? date('Y-m-d', strtotime('+3 days')));

        if (!$userId || !$description) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Student and description are required.'];
        }

        $stmt = $pdo->prepare("
            INSERT INTO student_followups (
                user_id, batch_id, reason, description, assigned_to, priority,
                next_followup_date, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$userId, $batchId, $reason, $description, $assignedTo, $priority, $nextDate]);

        AuditLogger::log('CREATE_FOLLOWUP', 'student_followup', $pdo->lastInsertId(), [
            'student_id' => $userId,
            'reason' => $reason
        ], $actor);

        return ['success' => true, 'message' => 'Follow-up triage record logged.'];
    }

    public static function updateFollowup($id, $data, $actor) {
        $pdo = Database::getConnection();
        $status = trim($data['status'] ?? 'resolved');
        $notes = trim($data['resolution_notes'] ?? '');

        $stmt = $pdo->prepare("
            UPDATE student_followups
            SET status = ?, resolution_notes = ?, last_followup_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$status, $notes, (int)$id]);

        return ['success' => true, 'message' => 'Follow-up status updated.'];
    }

    // -------------------------------------------------------------
    // 9. PLACEMENT & CAREER READINESS
    // -------------------------------------------------------------
    public static function getPlacementData() {
        $pdo = Database::getConnection();

        $profiles = $pdo->query("
            SELECT pp.*, u.full_name as student_name, u.email as student_email,
                   sp.student_id_code, sp.mobile, sp.education
            FROM placement_profiles pp
            JOIN users u ON pp.user_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            ORDER BY pp.readiness_score DESC
        ")->fetchAll();

        $jobs = $pdo->query("
            SELECT jo.*, 
                   (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_opening_id = jo.id) as applicants_count
            FROM job_openings jo
            ORDER BY jo.id DESC
        ")->fetchAll();

        $applications = $pdo->query("
            SELECT ja.*, u.full_name as student_name, u.email as student_email,
                   jo.company_name, jo.job_title
            FROM job_applications ja
            JOIN users u ON ja.user_id = u.id
            JOIN job_openings jo ON ja.job_opening_id = jo.id
            ORDER BY ja.application_date DESC
        ")->fetchAll();

        return [
            'success' => true,
            'profiles' => $profiles,
            'jobs' => $jobs,
            'applications' => $applications
        ];
    }

    // -------------------------------------------------------------
    // 10. SUPPORT TICKETS & FEEDBACK
    // -------------------------------------------------------------
    public static function getSupportTickets() {
        $pdo = Database::getConnection();

        $tickets = $pdo->query("
            SELECT st.*, u.full_name as student_name, u.email as student_email,
                   assignee.full_name as assigned_to_name,
                   (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = st.id) as message_count
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            LEFT JOIN users assignee ON st.assigned_to = assignee.id
            ORDER BY st.id DESC
        ")->fetchAll();

        $feedback = $pdo->query("
            SELECT fb.*, u.full_name as student_name, c.title as course_title, b.batch_code
            FROM feedback_submissions fb
            JOIN users u ON fb.student_id = u.id
            JOIN courses c ON fb.course_id = c.id
            LEFT JOIN batches b ON fb.batch_id = b.id
            ORDER BY fb.created_at DESC
        ")->fetchAll();

        return [
            'success' => true,
            'tickets' => $tickets,
            'feedback' => $feedback
        ];
    }

    public static function getTicketThread($ticketId) {
        $pdo = Database::getConnection();
        $ticketId = (int)$ticketId;

        $stmt = $pdo->prepare("
            SELECT st.*, u.full_name as student_name, u.email as student_email,
                   assignee.full_name as assigned_to_name
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            LEFT JOIN users assignee ON st.assigned_to = assignee.id
            WHERE st.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Support ticket not found.'];
        }

        $msgStmt = $pdo->prepare("
            SELECT tm.*, u.full_name as sender_name, u.role as sender_role, u.avatar as sender_avatar
            FROM ticket_messages tm
            JOIN users u ON tm.sender_id = u.id
            WHERE tm.ticket_id = ?
            ORDER BY tm.created_at ASC
        ");
        $msgStmt->execute([$ticketId]);
        $messages = $msgStmt->fetchAll();

        return [
            'success' => true,
            'ticket' => $ticket,
            'messages' => $messages
        ];
    }

    public static function replySupportTicket($ticketId, $data, $actor) {
        $pdo = Database::getConnection();
        $ticketId = (int)$ticketId;
        $message = trim($data['message'] ?? '');
        $isInternal = !empty($data['is_internal_note']) ? 1 : 0;
        $senderId = (int)$actor['id'];

        if (!$message) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Message text cannot be empty.'];
        }

        $stmt = $pdo->prepare("
            INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal_note, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$ticketId, $senderId, $message, $isInternal]);

        if (!$isInternal) {
            $pdo->prepare("UPDATE support_tickets SET status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                ->execute([$ticketId]);
        }

        AuditLogger::log('REPLY_SUPPORT_TICKET', 'support_ticket', $ticketId, ['is_internal' => $isInternal], $actor);
        return [
            'success' => true,
            'message' => $isInternal ? 'Internal staff note saved.' : 'Reply sent to student fellow.'
        ];
    }

    public static function updateTicketStatus($ticketId, $data, $actor) {
        $pdo = Database::getConnection();
        $ticketId = (int)$ticketId;
        $status = trim($data['status'] ?? 'resolved');

        $stmt = $pdo->prepare("UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$status, $ticketId]);

        AuditLogger::log('UPDATE_TICKET_STATUS', 'support_ticket', $ticketId, ['status' => $status], $actor);
        return ['success' => true, 'message' => "Ticket status updated to {$status}."];
    }

    public static function assignSupportTicket($ticketId, $data, $actor) {
        $pdo = Database::getConnection();
        $ticketId = (int)$ticketId;
        $assignedTo = !empty($data['assigned_to']) ? (int)$data['assigned_to'] : null;

        $stmt = $pdo->prepare("UPDATE support_tickets SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$assignedTo, $ticketId]);

        AuditLogger::log('ASSIGN_SUPPORT_TICKET', 'support_ticket', $ticketId, ['assigned_to' => $assignedTo], $actor);
        return ['success' => true, 'message' => 'Ticket assigned successfully.'];
    }


    // -------------------------------------------------------------
    // 11. AUDIT LOGS & SYSTEM SETTINGS
    // -------------------------------------------------------------
    public static function getAuditLogs($queryParams = []) {
        $pdo = Database::getConnection();
        $limit = min(100, max(10, (int)($queryParams['limit'] ?? 50)));

        $stmt = $pdo->prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?");
        $stmt->execute([$limit]);
        return ['success' => true, 'audit_logs' => $stmt->fetchAll()];
    }

    public static function getSettings() {
        $pdo = Database::getConnection();
        $settings = $pdo->query("SELECT * FROM system_settings")->fetchAll();
        $map = [];
        foreach ($settings as $s) {
            $map[$s['setting_key']] = $s['setting_value'];
        }
        return ['success' => true, 'settings' => $map];
    }

    public static function updateSettings($data, $actor) {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO system_settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
        ");
        $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

        foreach ($data as $key => $val) {
            if ($isSqlite) {
                $cur = $pdo->prepare("INSERT OR REPLACE INTO system_settings (setting_key, setting_value) VALUES (?, ?)");
                $cur->execute([$key, (string)$val]);
            } else {
                $stmt->execute([$key, (string)$val]);
            }
        }

        AuditLogger::log('UPDATE_SETTINGS', 'system', 'settings', $data, $actor);
        return ['success' => true, 'message' => 'System settings updated.'];
    }

    /**
     * Generate / Refresh Single-Use Account Setup Link (WhatsApp manual sharing workflow)
     */
    public static function resendInvitation($data, $actor) {
        $userId = (int)($data['user_id'] ?? 0);
        if (!$userId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'User ID is required'];
        }

        $pdo = Database::getConnection();

        // Check user existence
        $uStmt = $pdo->prepare("SELECT id, full_name, email, role, password_hash FROM users WHERE id = ? LIMIT 1");
        $uStmt->execute([$userId]);
        $userRow = $uStmt->fetch();
        if (!$userRow) {
            http_response_code(404);
            return ['success' => false, 'error' => 'User account not found'];
        }

        // Generate 32-byte cryptographically secure token and store only SHA-256 hash
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $sStmt = $pdo->prepare("SELECT id FROM student_profiles WHERE user_id = ? LIMIT 1");
        $sStmt->execute([$userId]);
        if ($sStmt->fetch()) {
            $up = $pdo->prepare("UPDATE student_profiles SET invitation_token = ?, invitation_expires_at = ?, invitation_accepted_at = NULL, account_status = 'invited' WHERE user_id = ?");
            $up->execute([$tokenHash, $expires, $userId]);
        } else {
            $fStmt = $pdo->prepare("SELECT id FROM faculty_profiles WHERE user_id = ? LIMIT 1");
            $fStmt->execute([$userId]);
            if ($fStmt->fetch()) {
                $up = $pdo->prepare("UPDATE faculty_profiles SET invitation_token = ?, invitation_expires_at = ?, invitation_accepted_at = NULL, account_status = 'invited' WHERE user_id = ?");
                $up->execute([$tokenHash, $expires, $userId]);
            } else {
                // If profile missing but user exists, link appropriate profile without losing history
                if ($userRow['role'] === 'student') {
                    $randSuffix = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
                    $ins = $pdo->prepare("INSERT INTO student_profiles (user_id, student_id_code, account_status, invitation_token, invitation_expires_at, created_at) VALUES (?, ?, 'invited', ?, ?, CURRENT_TIMESTAMP)");
                    $ins->execute([$userId, 'STU-2026-' . $randSuffix, $tokenHash, $expires]);
                } else {
                    $randSuffix = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
                    $ins = $pdo->prepare("INSERT INTO faculty_profiles (user_id, faculty_id_code, account_status, invitation_token, invitation_expires_at, created_at) VALUES (?, ?, 'invited', ?, ?, CURRENT_TIMESTAMP)");
                    $ins->execute([$userId, 'FAC-2026-' . $randSuffix, $tokenHash, $expires]);
                }
            }
        }

        // If credentials were not established, ensure unmatchable marker
        if (empty($userRow['password_hash']) || $userRow['password_hash'] === '!INVITED_UNSET_CREDENTIALS!') {
            $pdo->prepare("UPDATE users SET password_hash = '!INVITED_UNSET_CREDENTIALS!' WHERE id = ?")->execute([$userId]);
        }

        $invUrl = self::getPublicLmsUrl() . "/activate?token=" . $rawToken;
        AuditLogger::log('GENERATE_SETUP_LINK', 'user', $userId, ['expires_at' => $expires], $actor);

        return [
            'success' => true,
            'message' => 'A new single-use setup link has been generated (valid for 24 hours). Previous links have been invalidated.',
            'invitation_url' => $invUrl,
            'setup_url' => $invUrl,
            'expires_at' => $expires,
            'account_status' => 'invited',
            'invitation_status' => 'Link Generated',
            'delivery_method' => 'manual_share',
            'email_sent' => false,
            'email_notice' => 'Email server is unconfigured. Copy this setup link and share it directly via WhatsApp.'
        ];
    }

    /**
     * Generate Single-Use Password Reset Link for Authorised Admin to Share Manually
     */
    public static function adminGenerateResetLink($data, $actor) {
        $userId = (int)($data['user_id'] ?? 0);
        if (!$userId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'User ID is required'];
        }

        $pdo = Database::getConnection();
        $uStmt = $pdo->prepare("SELECT id, full_name, email, role FROM users WHERE id = ? LIMIT 1");
        $uStmt->execute([$userId]);
        $userRow = $uStmt->fetch();
        if (!$userRow) {
            http_response_code(404);
            return ['success' => false, 'error' => 'User not found'];
        }

        // Invalidate previous unconsumed reset tokens for this user
        $pdo->prepare("UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL")
            ->execute([$userId]);

        // Generate 32-byte cryptographically secure token and store only SHA-256 hash
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $ins = $pdo->prepare("INSERT INTO password_resets (user_id, token, expires_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)");
        $ins->execute([$userId, $tokenHash, $expires]);

        $resetUrl = self::getPublicLmsUrl() . "/reset-password?token=" . $rawToken;
        AuditLogger::log('ADMIN_GENERATE_RESET_LINK', 'user', $userId, ['expires_at' => $expires], $actor);

        return [
            'success' => true,
            'message' => 'Password reset link generated successfully (valid for 24 hours). Previous reset links have been invalidated.',
            'reset_url' => $resetUrl,
            'reset_token' => $rawToken,
            'expires_at' => $expires,
            'delivery_method' => 'manual_share',
            'email_sent' => false,
            'email_notice' => 'Email server is unconfigured. Copy this password reset link and share it directly via WhatsApp.'
        ];
    }

    /**
     * Revoke Invitation Link and deactivate account
     */
    public static function revokeInvitation($data, $actor) {
        $userId = (int)($data['user_id'] ?? 0);
        if (!$userId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'User ID is required'];
        }

        $pdo = Database::getConnection();
        $sStmt = $pdo->prepare("UPDATE student_profiles SET invitation_token = NULL, invitation_expires_at = NULL, account_status = 'deactivated' WHERE user_id = ?");
        $sStmt->execute([$userId]);

        $fStmt = $pdo->prepare("UPDATE faculty_profiles SET invitation_token = NULL, invitation_expires_at = NULL, account_status = 'deactivated' WHERE user_id = ?");
        $fStmt->execute([$userId]);

        AuditLogger::log('REVOKE_INVITATION', 'user', $userId, ['action' => 'revoked'], $actor);

        return [
            'success' => true,
            'message' => 'Invitation setup link has been revoked and account deactivated.'
        ];
    }

    /**
     * Toggle Faculty Status with Reassignment Conflict Detection
     */
    public static function toggleFacultyStatus($facultyId, $data, $actor) {
        $pdo = Database::getConnection();
        $targetStatus = trim($data['status'] ?? 'deactivated');
        $reason = trim($data['reason'] ?? '');

        $stmt = $pdo->prepare("UPDATE faculty_profiles SET account_status = ? WHERE user_id = ?");
        $stmt->execute([$targetStatus, (int)$facultyId]);

        $sessionsToReassign = [];
        if ($targetStatus === 'deactivated' || $targetStatus === 'suspended') {
            $sessStmt = $pdo->prepare("
                SELECT cs.id, cs.topic, cs.start_time, cs.end_time, b.batch_code
                FROM class_sessions cs
                JOIN batches b ON cs.batch_id = b.id
                WHERE cs.faculty_id = ? AND cs.status = 'scheduled' AND cs.start_time >= CURRENT_TIMESTAMP
                ORDER BY cs.start_time ASC
            ");
            $sessStmt->execute([(int)$facultyId]);
            $sessionsToReassign = $sessStmt->fetchAll();
        }

        AuditLogger::log('TOGGLE_FACULTY_STATUS', 'faculty', $facultyId, [
            'status' => $targetStatus,
            'reason' => $reason,
            'sessions_requiring_reassignment' => count($sessionsToReassign)
        ], $actor);

        return [
            'success' => true,
            'message' => "Faculty account status updated to " . $targetStatus . ".",
            'reassignment_required' => count($sessionsToReassign) > 0,
            'upcoming_sessions' => $sessionsToReassign
        ];
    }

    public static function updateUserRole(int $userId, array $data, array $actor) {
        $pdo = Database::getConnection();

        $actorRole = strtolower(trim($actor['role'] ?? ''));
        if (!in_array($actorRole, ['admin', 'super_admin'])) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Administrative authority required to modify user roles.'];
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $targetUser = $stmt->fetch();
        if (!$targetUser) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Target user not found.', 'field' => 'user_id'];
        }

        $prevRole = strtolower(trim($targetUser['role'] ?? ''));
        $newRole = strtolower(trim($data['role'] ?? ''));

        $allowedRoles = ['super_admin', 'admin', 'coordinator', 'faculty', 'instructor', 'student', 'placement_officer', 'counselor', 'accounts'];
        if (!in_array($newRole, $allowedRoles)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid role specified. Allowed roles: ' . implode(', ', $allowedRoles), 'field' => 'role'];
        }

        // Only Super Admin can modify or grant Super Admin
        if (($newRole === 'super_admin' || $prevRole === 'super_admin') && $actorRole !== 'super_admin') {
            http_response_code(403);
            return ['success' => false, 'error' => 'Only an active Super Administrator can assign or modify Super Administrator authority.', 'field' => 'role'];
        }

        // Protect against locking out the last active Super Admin
        if ($prevRole === 'super_admin' && $newRole !== 'super_admin') {
            $saCountStmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND (status != 'deactivated' OR status IS NULL) AND (is_archived = 0 OR is_archived IS NULL)");
            $activeSaCount = (int)$saCountStmt->fetchColumn();
            if ($activeSaCount <= 1) {
                http_response_code(409);
                return [
                    'success' => false,
                    'error' => 'Operation prohibited: Cannot demote the last remaining active Super Administrator. System requires at least one active Super Administrator.',
                    'field' => 'role'
                ];
            }
        }

        $authRoles = [];
        if (!empty($targetUser['authorized_roles_json'])) {
            $authRoles = json_decode($targetUser['authorized_roles_json'], true) ?: [];
        }
        if (!in_array($prevRole, $authRoles) && !empty($prevRole)) {
            $authRoles[] = $prevRole;
        }
        if (!in_array($newRole, $authRoles)) {
            $authRoles[] = $newRole;
        }

        $pdo->beginTransaction();
        try {
            // Profile synchronization without erasing past records
            if ($newRole === 'student') {
                $spStmt = $pdo->prepare("SELECT id FROM student_profiles WHERE user_id = ?");
                $spStmt->execute([$userId]);
                if (!$spStmt->fetch()) {
                    $stuCode = sprintf('STU-%04d', $userId);
                    $pdo->prepare("INSERT INTO student_profiles (user_id, student_id_code, account_status, admission_status, enrollment_status) VALUES (?, ?, 'active', 'enrolled', 'active')")->execute([$userId, $stuCode]);
                }
            } elseif (in_array($newRole, ['faculty', 'instructor'])) {
                $fpStmt = $pdo->prepare("SELECT id FROM faculty_profiles WHERE user_id = ?");
                $fpStmt->execute([$userId]);
                if (!$fpStmt->fetch()) {
                    $facCode = sprintf('FAC-%04d', $userId);
                    $pdo->prepare("INSERT INTO faculty_profiles (user_id, faculty_id_code, account_status, bio) VALUES (?, ?, 'active', 'Faculty Fellow')")->execute([$userId, $facCode]);
                }
            } elseif ($newRole === 'placement_officer') {
                $ppStmt = $pdo->prepare("SELECT id FROM placement_profiles WHERE user_id = ?");
                $ppStmt->execute([$userId]);
                if (!$ppStmt->fetch()) {
                    $pdo->prepare("INSERT INTO placement_profiles (user_id, target_roles, readiness_score, placement_status) VALUES (?, 'Corporate Placements', 100, 'active')")->execute([$userId]);
                }
            }

            $updateStmt = $pdo->prepare("UPDATE users SET role = ?, authorized_roles_json = ? WHERE id = ?");
            $updateStmt->execute([$newRole, json_encode($authRoles), $userId]);

            AuditLogger::log('UPDATE_USER_ROLE', 'user', $userId, [
                'previous_role' => $prevRole,
                'new_role' => $newRole,
                'authorized_roles' => $authRoles
            ], $actor);

            $pdo->commit();

            return [
                'success' => true,
                'message' => "User role successfully updated from {$prevRole} to {$newRole}.",
                'user' => [
                    'id' => $userId,
                    'full_name' => $targetUser['full_name'],
                    'email' => $targetUser['email'],
                    'role' => $newRole,
                    'authorized_roles' => $authRoles
                ]
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Database operation failed: ' . $e->getMessage()];
        }
    }

    public static function cleanupTestBatches(array $actor): array {
        $pdo = Database::getConnection();
        $actorRole = strtolower(trim($actor['role'] ?? ''));
        if (!in_array($actorRole, ['super_admin', 'admin'])) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Super Administrator authorization required for batch test cleanup.'];
        }
        $stmt = $pdo->query("
            SELECT id FROM batches 
            WHERE batch_code LIKE 'TEST-DISPOSABLE-%'
            AND id NOT IN (SELECT DISTINCT batch_id FROM batch_enrollments WHERE status = 'active')
        ");
        $batches = $stmt->fetchAll();
        $ids = array_column($batches, 'id');
        if (!empty($ids)) {
            $inClause = implode(',', array_fill(0, count($ids), '?'));
            try { $pdo->prepare("DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM class_sessions WHERE batch_id IN ($inClause))")->execute($ids); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM class_sessions WHERE batch_id IN ($inClause)")->execute($ids); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM faculty_batch_assignments WHERE batch_id IN ($inClause)")->execute($ids); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM batch_enrollments WHERE batch_id IN ($inClause)")->execute($ids); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM batches WHERE id IN ($inClause)")->execute($ids); } catch (\Exception $e) {}
        }
        return [
            'success' => true,
            'message' => 'Cleaned up ' . count($ids) . ' disposable test batches.',
            'deleted_batch_ids' => $ids
        ];
    }

    public static function cleanupDummyData(array $actor): array {
        $pdo = Database::getConnection();
        $actorRole = strtolower(trim($actor['role'] ?? ''));
        if (!in_array($actorRole, ['super_admin', 'admin'])) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Super Administrator authorization required.'];
        }

        $canonicalEmails = [
            'admin@aaroha-inc.com',
            'coordinator@aaroha-inc.com',
            'faculty@aaroha-inc.com',
            'student@aaroha-inc.com',
            'placement@aaroha-inc.com',
            'ryu@aaroha.in',
            'aa@aaroha.in'
        ];

        // Find non-canonical users
        $stmt = $pdo->query("SELECT id, email, role, full_name FROM users");
        $all = $stmt->fetchAll();
        $toPurge = [];
        foreach ($all as $u) {
            $em = strtolower(trim($u['email'] ?? ''));
            if (!in_array($em, $canonicalEmails)) {
                $toPurge[] = (int)$u['id'];
            }
        }

        if (!empty($toPurge)) {
            $inClause = implode(',', array_fill(0, count($toPurge), '?'));
            $doublePurge = array_merge($toPurge, $toPurge);
            try { $pdo->prepare("DELETE FROM audit_logs WHERE user_id IN ($inClause) OR actor_id IN ($inClause)")->execute($doublePurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM notifications WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM uploaded_files WHERE uploaded_by IN ($inClause) OR uploader_user_id IN ($inClause)")->execute($doublePurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM certificates WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM task_submissions WHERE enrollment_id IN (SELECT id FROM enrollments WHERE user_id IN ($inClause)) OR enrollment_id IN (SELECT id FROM batch_enrollments WHERE user_id IN ($inClause))")->execute($doublePurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM attendance_records WHERE user_id IN ($inClause) OR marked_by IN ($inClause)")->execute($doublePurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM faculty_batch_assignments WHERE faculty_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM batch_enrollments WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM enrollments WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM student_profiles WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM faculty_profiles WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM placement_profiles WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM fee_plans WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM student_followups WHERE user_id IN ($inClause) OR assigned_coordinator_id IN ($inClause)")->execute($doublePurge); } catch (\Exception $e) {}
            try { $pdo->prepare("DELETE FROM password_resets WHERE user_id IN ($inClause)")->execute($toPurge); } catch (\Exception $e) {}
            try { 
                $pdo->prepare("DELETE FROM users WHERE id IN ($inClause)")->execute($toPurge); 
            } catch (\Exception $e) {
                $pdo->prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted' WHERE id IN ($inClause)")->execute($toPurge);
            }
        }

        // Clean duplicates in batch_enrollments: keep exactly one enrollment per user per batch
        try {
            $pdo->exec("
                DELETE be1 FROM batch_enrollments be1
                INNER JOIN batch_enrollments be2 
                WHERE be1.id > be2.id 
                  AND be1.batch_id = be2.batch_id 
                  AND be1.user_id = be2.user_id
            ");
        } catch (\Exception $e) {}

        // Purge dummy/probe sessions with placeholder meeting links or test topics
        try {
            $pdo->exec("
                DELETE FROM class_sessions 
                WHERE meeting_link LIKE '%xyz-aaroha-lms%' 
                   OR meeting_link LIKE '%example.com%' 
                   OR meeting_link LIKE '%placeholder%'
                   OR meeting_link LIKE '%dummy%'
                   OR topic LIKE '%test%'
                   OR topic LIKE '%Ephemeral%'
            ");
        } catch (\Exception $e) {}

        // Set verified bcrypt password for canonical test accounts & genuine test users
        $pwHash = password_hash('password123', PASSWORD_BCRYPT, ['cost' => 12]);
        foreach (['admin@aaroha-inc.com', 'coordinator@aaroha-inc.com', 'faculty@aaroha-inc.com', 'student@aaroha-inc.com', 'placement@aaroha-inc.com', 'ryu@aaroha.in', 'aa@aaroha.in'] as $em) {
            try {
                $pdo->prepare("UPDATE users SET password_hash = ? WHERE email = ?")->execute([$pwHash, $em]);
            } catch (\Exception $e) {}
        }

        return [
            'success' => true,
            'purged_count' => count($toPurge),
            'purged_user_ids' => $toPurge,
            'message' => 'Cleaned up ' . count($toPurge) . ' non-canonical dummy test accounts and unaccredited test records.'
        ];
    }

    public static function updatePlacementProfile(int $userId, array $data, array $actor): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            UPDATE placement_profiles 
            SET readiness_score = ?, placement_status = ? 
            WHERE user_id = ?
        ");
        $readiness = (int)($data['readiness_score'] ?? 80);
        $status = trim($data['placement_status'] ?? 'training');
        $stmt->execute([$readiness, $status, $userId]);
        return ['success' => true, 'message' => 'Placement profile updated'];
    }

    public static function createJobOpening(array $data, array $actor): array {
        $pdo = Database::getConnection();
        $company = trim($data['company_name'] ?? '');
        $title = trim($data['job_title'] ?? '');
        if (!$company || !$title) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Company name and job title are required.'];
        }
        $desc = trim($data['job_description'] ?? '');
        $loc = trim($data['location'] ?? 'Remote / Bengaluru');
        $pkg = trim($data['package_range'] ?? '12 - 18 LPA');
        $stmt = $pdo->prepare("
            INSERT INTO job_openings (company_name, job_title, job_description, location, package_range, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        ");
        $stmt->execute([$company, $title, $desc, $loc, $pkg]);
        return ['success' => true, 'message' => 'Job opening published', 'job_id' => (int)$pdo->lastInsertId()];
    }
}
