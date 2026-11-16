<?php
// Aaroha LMS - Authentication & Role Authorization Middleware
require_once __DIR__ . '/../config/jwt.php';

class AuthMiddleware {
    public static function getBearerToken() {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER['Authorization']);
        } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }

        if (!empty($headers)) {
            if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
                return $matches[1];
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
        return self::requireRole(['super_admin']);
    }

    public static function requireCoordinator() {
        return self::requireRole(['super_admin', 'admin', 'coordinator']);
    }

    public static function requireAccounts() {
        return self::requireRole(['super_admin']);
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
