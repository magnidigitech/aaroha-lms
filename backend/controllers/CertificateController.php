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
