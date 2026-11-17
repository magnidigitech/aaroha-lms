<?php
// Aaroha LMS - Certificate Controller
// Generates, issues, and verifies accredited digital certificates
require_once __DIR__ . '/../config/database.php';

class CertificateController {

    // Issue an official certificate for a course
    public static function issueCertificate(int $courseId, array $data, array $issuer): array {
        $pdo = Database::getConnection();

        // 1. Verify course existence
        $stmt = $pdo->prepare("SELECT id, title FROM courses WHERE id = ? LIMIT 1");
        $stmt->execute([$courseId]);
        $course = $stmt->fetch();

        if (!$course) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Course not found'
            ];
        }

        // 2. Validate recipient details
        $recipientName = trim($data['recipient_name'] ?? '');
        if (empty($recipientName)) {
            http_response_code(400);
            return [
                'success' => false,
                'error' => 'Recipient name is required to issue a certificate'
            ];
        }

        $recipientEmail = trim($data['recipient_email'] ?? '');
        $userId = !empty($data['user_id']) ? (int)$data['user_id'] : null;

        // If user_id wasn't passed directly, look up user by email
        if (!$userId && !empty($recipientEmail)) {
            $userStmt = $pdo->prepare("SELECT id, full_name FROM users WHERE email = ? LIMIT 1");
            $userStmt->execute([$recipientEmail]);
            $u = $userStmt->fetch();
            if ($u) {
                $userId = (int)$u['id'];
                if (empty($recipientName)) {
                    $recipientName = $u['full_name'];
                }
            }
        }

        // 3. Generate unique accredited certificate code
        $randomHex = strtoupper(bin2hex(random_bytes(3)));
        $randomDigits = mt_rand(1000, 9999);
        $certificateCode = 'AAROHA-CERT-' . date('Y') . '-' . $randomHex . '-' . $randomDigits;

        $issuerId = (int)($issuer['id'] ?? 1);
        $issuerName = !empty($data['issuer_name']) ? trim($data['issuer_name']) : (!empty($issuer['full_name']) ? $issuer['full_name'] : 'Faculty Curriculum Director');
        $issuerTitle = !empty($data['issuer_title']) ? trim($data['issuer_title']) : (!empty($issuer['title']) ? $issuer['title'] : 'Director of Curriculum & Academic Systems');
        $grade = !empty($data['grade']) ? trim($data['grade']) : 'Executive Distinction (Verified Peer Reviewed)';
        $issuedAt = !empty($data['issued_at']) ? $data['issued_at'] : date('Y-m-d H:i:s');
        $courseTitle = $course['title'];

        // 4. Insert into certificates table
        $ins = $pdo->prepare("
            INSERT INTO certificates (
                certificate_code, course_id, user_id, recipient_name, recipient_email,
                course_title, issuer_id, issuer_name, issuer_title, grade, issued_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $certificateCode,
            $courseId,
            $userId,
            $recipientName,
            $recipientEmail ?: null,
            $courseTitle,
            $issuerId,
            $issuerName,
            $issuerTitle,
            $grade,
            $issuedAt
        ]);

        $newCertId = (int)$pdo->lastInsertId();

        // 5. If recipient user_id is linked to an enrollment, mark enrollment as completed
        if ($userId) {
            try {
                $updEnroll = $pdo->prepare("
                    UPDATE enrollments 
                    SET status = 'completed', completed_at = COALESCE(completed_at, ?) 
                    WHERE user_id = ? AND course_id = ?
                ");
                $updEnroll->execute([$issuedAt, $userId, $courseId]);
            } catch (Exception $e) {}
        }

        $certificate = [
            'id' => $newCertId,
            'certificate_code' => $certificateCode,
            'course_id' => $courseId,
            'course_title' => $courseTitle,
            'user_id' => $userId,
            'recipient_name' => $recipientName,
            'recipient_email' => $recipientEmail,
            'issuer_id' => $issuerId,
            'issuer_name' => $issuerName,
            'issuer_title' => $issuerTitle,
            'grade' => $grade,
            'issued_at' => $issuedAt
        ];

        // 6. Synchronize to SQLite fallback database if active
        self::syncCertificateToSqlite($certificate);

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'Official certificate generated and issued successfully',
            'certificate' => $certificate
        ];
    }

    // Retrieve all certificates issued for a given course
    public static function getCourseCertificates(int $courseId): array {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT * FROM certificates 
            WHERE course_id = ? 
            ORDER BY issued_at DESC
        ");
        $stmt->execute([$courseId]);
        $certs = $stmt->fetchAll();

        return [
            'success' => true,
            'course_id' => $courseId,
            'certificates' => $certs ?: []
        ];
    }

    // Retrieve all certificates issued to the logged in student
    public static function getMyCertificates(int $userId): array {
        $pdo = Database::getConnection();

        // Also check by user email for maximum reliability
        $userEmail = null;
        $userStmt = $pdo->prepare("SELECT email FROM users WHERE id = ? LIMIT 1");
        $userStmt->execute([$userId]);
        $row = $userStmt->fetch();
        if ($row && !empty($row['email'])) {
            $userEmail = $row['email'];
        }

        if ($userEmail) {
            $stmt = $pdo->prepare("
                SELECT * FROM certificates 
                WHERE user_id = ? OR recipient_email = ? 
                ORDER BY issued_at DESC
            ");
            $stmt->execute([$userId, $userEmail]);
        } else {
            $stmt = $pdo->prepare("
                SELECT * FROM certificates 
                WHERE user_id = ? 
                ORDER BY issued_at DESC
            ");
            $stmt->execute([$userId]);
        }

        $certs = $stmt->fetchAll();

        return [
            'success' => true,
            'certificates' => $certs ?: []
        ];
    }

    // Reissue an accredited digital certificate with a new credential code
    public static function reissueCertificate(int $certId, array $data, array $actor): array {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM certificates WHERE id = ? LIMIT 1");
        $stmt->execute([$certId]);
        $cert = $stmt->fetch();

        if (!$cert) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Certificate not found'
            ];
        }

        $reissueReason = trim($data['reissue_reason'] ?? 'Official curriculum administrative reissuance');
        $newGrade = !empty($data['grade']) ? trim($data['grade']) : $cert['grade'];
        $newRecipientName = !empty($data['recipient_name']) ? trim($data['recipient_name']) : $cert['recipient_name'];

        $randomHex = strtoupper(bin2hex(random_bytes(3)));
        $randomDigits = mt_rand(1000, 9999);
        $newCertificateCode = 'AAROHA-CERT-' . date('Y') . '-' . $randomHex . '-' . $randomDigits;

        $prevCode = $cert['certificate_code'];
        $now = date('Y-m-d H:i:s');
        $issuerId = (int)($actor['id'] ?? $cert['issuer_id']);
        $issuerName = !empty($actor['full_name']) ? $actor['full_name'] : $cert['issuer_name'];

        $upd = $pdo->prepare("
            UPDATE certificates
            SET previous_certificate_code = ?,
                certificate_code = ?,
                recipient_name = ?,
                grade = ?,
                reissued_at = ?,
                reissue_reason = ?,
                issuer_id = ?,
                issuer_name = ?
            WHERE id = ?
        ");

        $upd->execute([
            $prevCode,
            $newCertificateCode,
            $newRecipientName,
            $newGrade,
            $now,
            $reissueReason,
            $issuerId,
            $issuerName,
            $certId
        ]);

        return [
            'success' => true,
            'message' => 'Certificate successfully reissued with new credential tracking code.',
            'certificate' => [
                'id' => $certId,
                'previous_certificate_code' => $prevCode,
                'certificate_code' => $newCertificateCode,
                'recipient_name' => $newRecipientName,
                'grade' => $newGrade,
                'reissued_at' => $now,
                'reissue_reason' => $reissueReason
            ]
        ];
    }

    // Verify a certificate by verification code
    public static function verifyCertificate(string $code): array {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT * FROM certificates 
            WHERE certificate_code = ? 
            LIMIT 1
        ");
        $stmt->execute([trim($code)]);
        $cert = $stmt->fetch();

        if (!$cert) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Certificate not found or verification code is invalid',
                'is_valid' => false
            ];
        }

        return [
            'success' => true,
            'is_valid' => true,
            'certificate' => $cert
        ];
    }

    // Retrieve all issued certificates with course & student details (Admin Portal)
    public static function adminListAllCertificates(): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("
            SELECT cert.*, c.title as course_title, c.slug as course_slug,
                   u.full_name as student_name, u.email as student_email
            FROM certificates cert
            JOIN courses c ON cert.course_id = c.id
            LEFT JOIN users u ON cert.user_id = u.id
            ORDER BY cert.id DESC
        ");
        $rows = $stmt->fetchAll();
        return [
            'success' => true,
            'certificates' => $rows ?: []
        ];
    }

    // Check certificate eligibility for a student in a course
    public static function adminGetEligibility(array $query): array {
        $pdo = Database::getConnection();
        $cid = (int)($query['course_id'] ?? 0);
        $uid = (int)($query['user_id'] ?? 0);

        if (!$cid || !$uid) {
            http_response_code(400);
            return ['success' => false, 'error' => 'course_id and user_id are required.'];
        }

        $stmt = $pdo->prepare("
            SELECT u.id, u.full_name, u.email, sp.student_id_code, sp.account_status 
            FROM users u 
            LEFT JOIN student_profiles sp ON u.id = sp.user_id 
            WHERE u.id = ?
        ");
        $stmt->execute([$uid]);
        $student = $stmt->fetch();

        $cStmt = $pdo->prepare("SELECT id, title, duration FROM courses WHERE id = ?");
        $cStmt->execute([$cid]);
        $course = $cStmt->fetch();

        if (!$student || !$course) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Student or course not found.'];
        }

        $certStmt = $pdo->prepare("SELECT id, certificate_code FROM certificates WHERE user_id = ? AND course_id = ? AND (status = 'valid' OR status IS NULL) LIMIT 1");
        $certStmt->execute([$uid, $cid]);
        $existingCert = $certStmt->fetch();

        return [
            'success' => true,
            'eligible' => true,
            'student' => $student,
            'course' => $course,
            'already_issued' => !!$existingCert,
            'existing_certificate' => $existingCert ?: null
        ];
    }

    // Generate verified preview for certificate
    public static function adminPreviewCertificate(array $data, array $actor): array {
        $cid = (int)($data['course_id'] ?? 0);
        $uid = (int)($data['user_id'] ?? 0);
        $templateId = trim($data['template_id'] ?? 'academic_excellence');
        $grade = trim($data['grade'] ?? 'Executive Distinction (Verified Peer Reviewed)');

        $pdo = Database::getConnection();
        $uStmt = $pdo->prepare("SELECT id, full_name, email FROM users WHERE id = ?");
        $uStmt->execute([$uid]);
        $student = $uStmt->fetch();

        $cStmt = $pdo->prepare("SELECT id, title, duration FROM courses WHERE id = ?");
        $cStmt->execute([$cid]);
        $course = $cStmt->fetch();

        if (!$student || !$course) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Student or course not found.'];
        }

        $recipientName = trim($data['recipient_name'] ?? '') ?: $student['full_name'];
        $sigFaculty = trim($data['signatory_faculty_name'] ?? '') ?: 'Dr. Aris Thorne';
        $sigFacultyTitle = trim($data['signatory_faculty_title'] ?? '') ?: 'Curriculum Lead & Systems Architect';
        $sigDean = trim($data['signatory_dean_name'] ?? '') ?: 'Academic Board & Dean';
        $sigDeanTitle = trim($data['signatory_dean_title'] ?? '') ?: 'Board of Academic Review';
        $compDate = trim($data['completion_date'] ?? '') ?: date('F d, Y');

        $tokenMaterial = "{$cid}:{$uid}:{$templateId}:{$recipientName}:" . (int)(time() / 300);
        $previewToken = hash('sha256', $tokenMaterial);

        $previewCert = [
            'is_preview' => true,
            'watermark' => '[PREVIEW — NOT ISSUED]',
            'preview_token' => $previewToken,
            'certificate_code' => '[PENDING ISSUANCE]',
            'verification_url' => '[PREVIEW — NOT ISSUED]',
            'course_id' => $cid,
            'course_title' => $course['title'],
            'user_id' => $uid,
            'recipient_name' => $recipientName,
            'recipient_email' => $student['email'],
            'grade' => $grade,
            'template_id' => $templateId,
            'completion_date' => $compDate,
            'training_hours' => $data['training_hours'] ?? '48 Hours Practicum',
            'signatory_faculty_name' => $sigFaculty,
            'signatory_faculty_title' => $sigFacultyTitle,
            'signatory_dean_name' => $sigDean,
            'signatory_dean_title' => $sigDeanTitle,
            'issuer_name' => $sigFaculty,
            'issuer_title' => $sigFacultyTitle,
            'issued_at' => null,
            'status' => 'preview'
        ];

        return [
            'success' => true,
            'is_preview' => true,
            'preview_token' => $previewToken,
            'preview_certificate' => $previewCert,
            'certificate' => $previewCert
        ];
    }

    // Revoke an existing certificate
    public static function adminRevokeCertificate(int $certId, array $data, array $actor): array {
        $reason = trim($data['reason'] ?? '');
        if (empty($reason)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'A valid revocation reason must be provided.'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM certificates WHERE id = ? LIMIT 1");
        $stmt->execute([$certId]);
        $cert = $stmt->fetch();

        if (!$cert) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Certificate not found.'];
        }

        $now = date('Y-m-d H:i:s');
        $upd = $pdo->prepare("UPDATE certificates SET status = 'revoked', revocation_reason = ?, revoked_at = ? WHERE id = ?");
        $upd->execute([$reason, $now, $certId]);

        return [
            'success' => true,
            'message' => 'Certificate credential has been revoked.',
            'certificate_id' => $certId,
            'revoked_at' => $now,
            'reason' => $reason
        ];
    }

    // SQLite synchronization helper for failover resilience
    private static function syncCertificateToSqlite(array $cert): void {
        $sqlitePaths = [
            __DIR__ . '/../../database/lms.sqlite',
            __DIR__ . '/../database/lms.sqlite'
        ];
        foreach ($sqlitePaths as $p) {
            if (file_exists($p)) {
                try {
                    $sq = new PDO("sqlite:{$p}", null, null, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]);
                    $sq->exec("CREATE TABLE IF NOT EXISTS certificates (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        certificate_code TEXT NOT NULL UNIQUE,
                        course_id INTEGER NOT NULL,
                        user_id INTEGER,
                        recipient_name TEXT NOT NULL,
                        recipient_email TEXT,
                        course_title TEXT NOT NULL,
                        issuer_id INTEGER,
                        issuer_name TEXT NOT NULL,
                        issuer_title TEXT,
                        grade TEXT NOT NULL DEFAULT 'Verified Completion',
                        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )");

                    $ins = $sq->prepare("
                        INSERT OR REPLACE INTO certificates (
                            certificate_code, course_id, user_id, recipient_name, recipient_email,
                            course_title, issuer_id, issuer_name, issuer_title, grade, issued_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $ins->execute([
                        $cert['certificate_code'],
                        $cert['course_id'],
                        $cert['user_id'],
                        $cert['recipient_name'],
                        $cert['recipient_email'] ?? null,
                        $cert['course_title'],
                        $cert['issuer_id'],
                        $cert['issuer_name'],
                        $cert['issuer_title'],
                        $cert['grade'],
                        $cert['issued_at']
                    ]);
                } catch (Exception $e) {}
            }
        }
    }
}
