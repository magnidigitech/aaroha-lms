<?php
// Aaroha LMS - Authentication & Role Authorization Middleware
require_once __DIR__ . '/../config/jwt.php';

class AuthMiddleware {
    public static function getBearerToken() {
        $candidateHeaders = [];

        // 1. Direct Server / FastCGI / Apache Environment Variables
        $serverKeys = [
            'HTTP_AUTHORIZATION',
            'REDIRECT_HTTP_AUTHORIZATION',
            'HTTP_X_AUTHORIZATION',
            'REDIRECT_HTTP_X_AUTHORIZATION',
            'HTTP_X_AUTH_TOKEN',
            'REDIRECT_HTTP_X_AUTH_TOKEN',
            'Authorization'
        ];
        foreach ($serverKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $candidateHeaders[] = trim($_SERVER[$key]);
            }
        }

        // 2. Apache / FastCGI Request Headers (case-insensitive)
        $headerBag = [];
        if (function_exists('getallheaders')) {
            $h = getallheaders();
            if (is_array($h)) {
                $headerBag = array_merge($headerBag, $h);
            }
        }
        if (function_exists('apache_request_headers')) {
            $h = apache_request_headers();
            if (is_array($h)) {
                $headerBag = array_merge($headerBag, $h);
            }
        }

        if (!empty($headerBag)) {
            $normalized = [];
            foreach ($headerBag as $k => $v) {
                if (is_string($v)) {
                    $normalized[strtolower($k)] = trim($v);
                }
            }
            foreach (['authorization', 'x-authorization', 'x-auth-token', 'token'] as $targetKey) {
                if (!empty($normalized[$targetKey])) {
                    $candidateHeaders[] = $normalized[$targetKey];
                }
            }
        }

        // 3. Fallback: Query parameter 'token'
        if (!empty($_GET['token']) && is_string($_GET['token'])) {
            $candidateHeaders[] = trim($_GET['token']);
        }

        // 4. Fallback: POST / JSON body parameter 'token'
        if (!empty($_POST['token']) && is_string($_POST['token'])) {
            $candidateHeaders[] = trim($_POST['token']);
        }

        // Inspect candidate values in order of priority
        foreach ($candidateHeaders as $cand) {
            if (empty($cand) || !is_string($cand)) continue;

            // Pattern A: Standard "Bearer <jwt>"
            if (preg_match('/Bearer\s+(\S+)/i', $cand, $matches)) {
                return $matches[1];
            }

            // Pattern B: Direct JWT token without Bearer prefix (at least 20 chars, no spaces)
            if (!preg_match('/\s/', $cand) && strlen($cand) > 20) {
                return $cand;
            }
        }

        return null;
    }

    public static function requireAuth() {
        $token = self::getBearerToken();
        if (!$token) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Authentication token required']);
            exit;
        }

        $payload = JWT::verify($token);
        if (!$payload) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid or expired authentication session']);
            exit;
        }

        // Live database verification: block deactivated or archived accounts from using existing sessions
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id, status, is_archived, deleted_at, role, authorized_roles_json FROM users WHERE id = ?");
            $stmt->execute([(int)$payload['id']]);
            $userRow = $stmt->fetch();

            if (!$userRow || ($userRow['status'] ?? 'active') === 'deactivated' || ($userRow['status'] ?? 'active') === 'archived' || !empty($userRow['deleted_at']) || !empty($userRow['is_archived'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error' => 'Session terminated: This account has been ' . ($userRow['status'] ?? 'deactivated') . '.'
                ]);
                exit;
            }

            // Role-level status check
            if ($userRow['role'] === 'student') {
                $sp = $pdo->prepare("SELECT account_status FROM student_profiles WHERE user_id = ?");
                $sp->execute([(int)$userRow['id']]);
                $stStatus = $sp->fetchColumn();
                if ($stStatus === 'deactivated' || $stStatus === 'archived') {
                    $authRoles = json_decode($userRow['authorized_roles_json'] ?? '[]', true) ?: [];
                    if (empty(array_diff($authRoles, ['student']))) {
                        http_response_code(403);
                        echo json_encode(['success' => false, 'error' => 'Student account has been ' . $stStatus . '. Access blocked.']);
                        exit;
                    }
                }
            } elseif ($userRow['role'] === 'faculty' || $userRow['role'] === 'instructor') {
                $fp = $pdo->prepare("SELECT account_status FROM faculty_profiles WHERE user_id = ?");
                $fp->execute([(int)$userRow['id']]);
                $facStatus = $fp->fetchColumn();
                if ($facStatus === 'deactivated' || $facStatus === 'archived') {
                    $authRoles = json_decode($userRow['authorized_roles_json'] ?? '[]', true) ?: [];
                    if (empty(array_diff($authRoles, ['faculty', 'instructor']))) {
                        http_response_code(403);
                        echo json_encode(['success' => false, 'error' => 'Faculty account has been ' . $facStatus . '. Access blocked.']);
                        exit;
                    }
                }
            }
        } catch (Exception $e) {
            // Fail open on database errors during auth check so service remains resilient
            error_log('Auth database check exception: ' . $e->getMessage());
        }

        return $payload;
    }

    public static function requireRole(array $allowedRoles) {
        $user = self::requireAuth();
        $role = strtolower($user['role'] ?? '');
        
        // Super admin always has complete access
        if ($role === 'super_admin') {
            return $user;
        }

        // Generic admin has coordinator privileges by default
        if ($role === 'admin' && (in_array('admin', $allowedRoles) || in_array('coordinator', $allowedRoles))) {
            return $user;
        }

        if (!in_array($role, $allowedRoles)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Access denied: insufficient permissions for role ' . htmlspecialchars($role)
            ]);
            exit;
        }
        return $user;
    }

    public static function requireAdmin() {
        return self::requireRole(['super_admin', 'admin', 'coordinator', 'faculty', 'instructor']);
    }

    public static function requireSuperAdmin() {
        return self::requireRole(['super_admin', 'admin']);
    }

    public static function requireCoordinator() {
        return self::requireRole(['super_admin', 'admin', 'coordinator']);
    }

    public static function requireAccounts() {
        return self::requireRole(['super_admin', 'admin']);
    }

    public static function requirePlacement() {
        return self::requireRole(['super_admin', 'admin', 'placement_officer']);
    }

    public static function getOptionalAuth() {
        $token = self::getBearerToken();
        if (!$token) return null;
        return JWT::verify($token);
    }
}
