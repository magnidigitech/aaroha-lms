<?php
// Aaroha LMS - Upload & Secure Media Delivery Controller
// Supports Direct File Uploads, Resumable Chunked Video Uploads, Range Streaming,
// and HMAC-signed short-lived token access for enrolled students.

require_once __DIR__ . '/../config/database.php';
if (!class_exists('JWT')) {
    if (file_exists(__DIR__ . '/../config/jwt.php')) {
        require_once __DIR__ . '/../config/jwt.php';
    } elseif (file_exists(__DIR__ . '/jwt.php')) {
        require_once __DIR__ . '/jwt.php';
    }
}

class UploadController {

    private static function getSecret(): string {
        $candidates = [
            __DIR__ . '/../config/env.php',
            dirname(__DIR__, 2) . '/env.php',
            dirname(__DIR__, 3) . '/env.php',
        ];
        foreach ($candidates as $candidate) {
            if (file_exists($candidate)) {
                $cfg = require $candidate;
                if (!empty($cfg['JWT_SECRET'])) return $cfg['JWT_SECRET'];
                if (!empty($cfg['jwt']['secret'])) return $cfg['jwt']['secret'];
            }
        }
        return getenv('JWT_SECRET') ?: 'aaroha_shared_production_jwt_secret_key_2026';
    }

    private static function getUploadsBaseDir(): string {
        $dir = __DIR__ . '/../uploads';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return realpath($dir) ?: $dir;
    }

    private static function getCategoryConfig(): array {
        return [
            'avatar' => [
                'dir' => 'avatars',
                'max_bytes' => 10 * 1024 * 1024,
                'allowed_exts' => ['png', 'jpg', 'jpeg', 'webp', 'svg'],
                'is_public' => true
            ],
            'course_image' => [
                'dir' => 'courses',
                'max_bytes' => 10 * 1024 * 1024,
                'allowed_exts' => ['png', 'jpg', 'jpeg', 'webp', 'svg'],
                'is_public' => true
            ],
            'lesson_video' => [
                'dir' => 'lessons',
                'max_bytes' => 500 * 1024 * 1024,
                'allowed_exts' => ['mp4', 'webm', 'mov', 'mkv'],
                'is_public' => false
            ],
            'class_recording' => [
                'dir' => 'recordings',
                'max_bytes' => 500 * 1024 * 1024,
                'allowed_exts' => ['mp4', 'webm', 'mov'],
                'is_public' => false
            ],
            'material_document' => [
                'dir' => 'materials',
                'max_bytes' => 50 * 1024 * 1024,
                'allowed_exts' => ['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'zip', 'png', 'jpg'],
                'is_public' => false
            ],
            'assignment_attachment' => [
                'dir' => 'materials',
                'max_bytes' => 50 * 1024 * 1024,
                'allowed_exts' => ['pdf', 'zip', 'docx', 'txt', 'ipynb', 'py'],
                'is_public' => false
            ],
            'task_submission' => [
                'dir' => 'submissions',
                'max_bytes' => 50 * 1024 * 1024,
                'allowed_exts' => ['pdf', 'zip', 'tar.gz', 'docx', 'txt', 'ipynb', 'py', 'js', 'ts'],
                'is_public' => false
            ]
        ];
    }

    public static function signFileToken(string $fileKey, ?int $userId, int $ttl = 14400): string {
        $exp = time() + $ttl;
        $uidStr = $userId !== null ? (string)$userId : '';
        $data = $fileKey . '|' . $uidStr . '|' . $exp;
        $sig = hash_hmac('sha256', $data, self::getSecret());
        return $exp . '.' . $sig;
    }

    public static function verifyFileToken(string $fileKey, string $token, ?int $userId): bool {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) return false;
        $exp = (int)$parts[0];
        $sig = $parts[1];
        if (time() > $exp) return false;
        $uidStr = $userId !== null ? (string)$userId : '';
        $expected = hash_hmac('sha256', $fileKey . '|' . $uidStr . '|' . $exp, self::getSecret());
        return hash_equals($expected, $sig);
    }

    /**
     * Standard File Upload (Multipart Form or Base64 Payload)
     */
    public static function upload(array $data, ?array $user): array {
        $category = $data['category'] ?? 'material_document';
        $configs = self::getCategoryConfig();
        $cfg = $configs[$category] ?? $configs['material_document'];

        $filename = '';
        $content = '';

        if (!empty($_FILES['file']['tmp_name']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
            $filename = basename($_FILES['file']['name']);
            $fileSize = $_FILES['file']['size'];
            if ($fileSize > $cfg['max_bytes']) {
                http_response_code(400);
                return ['success' => false, 'error' => 'File size exceeds maximum allowed limit.'];
            }
            $content = file_get_contents($_FILES['file']['tmp_name']);
        } elseif (!empty($data['file_base64'])) {
            $filename = basename($data['filename'] ?? 'uploaded_file');
            $b64 = $data['file_base64'];
            if (strpos($b64, 'base64,') !== false) {
                $b64 = explode('base64,', $b64, 2)[1];
            }
            $content = base64_decode($b64);
            if ($content === false) {
                http_response_code(400);
                return ['success' => false, 'error' => 'Invalid base64 payload.'];
            }
            if (strlen($content) > $cfg['max_bytes']) {
                http_response_code(400);
                return ['success' => false, 'error' => 'File size exceeds maximum allowed limit.'];
            }
        } else {
            http_response_code(400);
            return ['success' => false, 'error' => 'No file was provided for upload.'];
        }

        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($ext, $cfg['allowed_exts'], true)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Disallowed file extension: .' . $ext];
        }

        $baseDir = self::getUploadsBaseDir();
        $targetSubDir = $baseDir . '/' . $cfg['dir'];
        if (!is_dir($targetSubDir)) {
            mkdir($targetSubDir, 0755, true);
        }

        $storageKey = bin2hex(random_bytes(16));
        $destFilename = $storageKey . ($ext ? '.' . $ext : '');
        $destPath = $targetSubDir . '/' . $destFilename;

        if (file_put_contents($destPath, $content) === false) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to write uploaded file to disk.'];
        }

        $fileSize = strlen($content);
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $destPath) ?: 'application/octet-stream';
        finfo_close($finfo);

        $pdo = Database::getConnection();
        $uploaderId = $user['id'] ?? null;
        $isPub = $cfg['is_public'] ? 1 : 0;
        $vis = $cfg['is_public'] ? 'public' : 'private';

        $stmt = $pdo->prepare("
            INSERT INTO uploaded_files (
                file_key, storage_key, original_filename, filename, mime_type,
                file_size, category, visibility, is_public, uploaded_by,
                uploader_user_id, storage_path, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $storageKey, $storageKey, $filename, $filename, $mimeType,
            $fileSize, $category, $vis, $isPub, $uploaderId,
            $uploaderId, $cfg['dir'] . '/' . $destFilename
        ]);

        $publicUrl = '/api/uploads/public/' . $storageKey;
        $streamUrl = '/api/uploads/stream/' . $storageKey;
        $signedToken = self::signFileToken($storageKey, $uploaderId);
        $signedStreamUrl = $streamUrl . '?token=' . $signedToken;

        return [
            'success' => true,
            'storage_key' => $storageKey,
            'filename' => $filename,
            'file_size' => $fileSize,
            'mime_type' => $mimeType,
            'is_public' => $cfg['is_public'],
            'url' => $cfg['is_public'] ? $publicUrl : $signedStreamUrl,
            'public_url' => $publicUrl,
            'stream_url' => $streamUrl,
            'signed_stream_url' => $signedStreamUrl
        ];
    }

    /**
     * Chunked Resumable Upload
     */
    public static function uploadChunk(array $data, ?array $user): array {
        $uploadId = preg_replace('/[^a-zA-Z0-9_-]/', '', $data['upload_id'] ?? '');
        $chunkIndex = (int)($data['chunk_index'] ?? 0);
        $totalChunks = (int)($data['total_chunks'] ?? 1);
        $chunkDataB64 = $data['chunk_data'] ?? '';
        $filename = basename($data['filename'] ?? 'video.mp4');
        $category = $data['category'] ?? 'lesson_video';

        if (!$uploadId || empty($chunkDataB64)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Missing upload_id or chunk_data.'];
        }

        $baseDir = self::getUploadsBaseDir();
        $chunkDir = $baseDir . '/chunks/' . $uploadId;
        if (!is_dir($chunkDir)) {
            mkdir($chunkDir, 0755, true);
        }

        $chunkBytes = base64_decode($chunkDataB64);
        if ($chunkBytes === false) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid chunk base64 data.'];
        }

        file_put_contents($chunkDir . '/chunk_' . $chunkIndex, $chunkBytes);

        if ($chunkIndex === $totalChunks - 1) {
            // Reassemble all slices
            $configs = self::getCategoryConfig();
            $cfg = $configs[$category] ?? $configs['lesson_video'];
            $targetSubDir = $baseDir . '/' . $cfg['dir'];
            if (!is_dir($targetSubDir)) mkdir($targetSubDir, 0755, true);

            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            $storageKey = bin2hex(random_bytes(16));
            $destFilename = $storageKey . ($ext ? '.' . $ext : '');
            $destPath = $targetSubDir . '/' . $destFilename;

            $outHandle = fopen($destPath, 'wb');
            for ($i = 0; $i < $totalChunks; $i++) {
                $slicePath = $chunkDir . '/chunk_' . $i;
                if (file_exists($slicePath)) {
                    $inHandle = fopen($slicePath, 'rb');
                    while (!feof($inHandle)) {
                        fwrite($outHandle, fread($inHandle, 8192));
                    }
                    fclose($inHandle);
                    unlink($slicePath);
                }
            }
            fclose($outHandle);
            @rmdir($chunkDir);

            $fileSize = filesize($destPath);
            $mimeType = 'video/mp4';

            $pdo = Database::getConnection();
            $uploaderId = $user['id'] ?? null;
            $stmt = $pdo->prepare("
                INSERT INTO uploaded_files (
                    file_key, storage_key, original_filename, filename, mime_type,
                    file_size, category, visibility, is_public, uploaded_by,
                    uploader_user_id, storage_path, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'private', 0, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([
                $storageKey, $storageKey, $filename, $filename, $mimeType,
                $fileSize, $category, $uploaderId, $uploaderId, $cfg['dir'] . '/' . $destFilename
            ]);

            $streamUrl = '/api/uploads/stream/' . $storageKey;
            $signedToken = self::signFileToken($storageKey, $uploaderId);

            return [
                'success' => true,
                'completed' => true,
                'storage_key' => $storageKey,
                'filename' => $filename,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
                'url' => $streamUrl . '?token=' . $signedToken,
                'signed_stream_url' => $streamUrl . '?token=' . $signedToken
            ];
        }

        return [
            'success' => true,
            'completed' => false,
            'chunk_index' => $chunkIndex,
            'total_chunks' => $totalChunks
        ];
    }

    /**
     * Serve Public Asset
     */
    public static function servePublic(string $fileKey): void {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM uploaded_files WHERE storage_key = ? OR file_key = ? LIMIT 1");
        $stmt->execute([$fileKey, $fileKey]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'File not found']);
            exit;
        }

        $baseDir = self::getUploadsBaseDir();
        $filePath = $baseDir . '/' . $row['storage_path'];
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'File data not found on disk']);
            exit;
        }

        header('Content-Type: ' . ($row['mime_type'] ?: 'application/octet-stream'));
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: public, max-age=86400');
        readfile($filePath);
        exit;
    }

    /**
     * Serve Protected Stream with HTTP 206 Partial Content Range Support
     */
    public static function serveStream(string $fileKey, ?array $user): void {
        $token = $_GET['token'] ?? '';
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM uploaded_files WHERE storage_key = ? OR file_key = ? LIMIT 1");
        $stmt->execute([$fileKey, $fileKey]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'File not found']);
            exit;
        }

        // Verify authorization via signed token OR active session
        $authorized = false;
        if (!empty($token)) {
            $authorized = self::verifyFileToken($fileKey, $token, $user['id'] ?? null)
                       || self::verifyFileToken($fileKey, $token, null);
        }

        if (!$authorized && $user) {
            $role = $user['role'] ?? '';
            if (in_array($role, ['admin', 'super_admin', 'faculty', 'instructor', 'coordinator'], true)) {
                $authorized = true;
            } else {
                // Check if student has active unexpired enrollment in course associated with this file
                $enrStmt = $pdo->prepare("
                    SELECT e.id, e.expires_at, e.access_status
                    FROM enrollments e
                    JOIN lessons l ON l.storage_key = ? OR l.media_url LIKE ?
                    JOIN modules m ON l.module_id = m.id AND m.course_id = e.course_id
                    WHERE e.user_id = ? AND e.status IN ('active', 'completed')
                ");
                $enrStmt->execute([$fileKey, '%' . $fileKey . '%', $user['id']]);
                $enr = $enrStmt->fetch();
                if ($enr) {
                    $exp = $enr['expires_at'] ? strtotime($enr['expires_at']) : null;
                    if ($exp === null || time() <= $exp) {
                        $authorized = true;
                    }
                }
            }
        }

        if (!$authorized) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Access denied: Course access duration has expired or token is invalid.',
                'code' => 'ACCESS_EXPIRED'
            ]);
            exit;
        }

        $baseDir = self::getUploadsBaseDir();
        $filePath = $baseDir . '/' . $row['storage_path'];
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'File data not found on disk']);
            exit;
        }

        self::outputRangeFile($filePath, $row['mime_type'] ?: 'video/mp4', $row['filename'] ?: 'video.mp4');
    }

    private static function outputRangeFile(string $filePath, string $mimeType, string $filename): void {
        $fileSize = filesize($filePath);
        $fp = fopen($filePath, 'rb');
        $start = 0;
        $end = $fileSize - 1;

        header('Accept-Ranges: bytes');
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: inline; filename="' . addslashes($filename) . '"');

        if (isset($_SERVER['HTTP_RANGE'])) {
            $rangeHeader = $_SERVER['HTTP_RANGE'];
            if (preg_match('/bytes=(\d+)-(\d*)/', $rangeHeader, $matches)) {
                $start = (int)$matches[1];
                if (!empty($matches[2])) {
                    $end = (int)$matches[2];
                }
            }
            http_response_code(206);
            header("Content-Range: bytes $start-$end/$fileSize");
            header('Content-Length: ' . ($end - $start + 1));
        } else {
            http_response_code(200);
            header('Content-Length: ' . $fileSize);
        }

        fseek($fp, $start);
        $cur = $start;
        while (!feof($fp) && $cur <= $end) {
            $readLen = min(65536, ($end - $cur) + 1);
            echo fread($fp, $readLen);
            flush();
            $cur += $readLen;
        }
        fclose($fp);
        exit;
    }
}

