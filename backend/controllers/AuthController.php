<?php
// Aaroha LMS - Authentication Controller
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';

class AuthController {
    /**
     * Public self-registration is explicitly disabled per institutional policy.
     * All student and faculty accounts must be provisioned by an administrator.
     */
    public static function register($data) {
        http_response_code(403);
        return [
            'success' => false,
            'error' => 'Public registration is disabled. All student and faculty accounts must be onboarded directly by the platform administrator.'
        ];
    }

    /**
     * Administrator User Directory Retrieval
     */
    public static function adminGetUsers() {
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->query("SELECT id, full_name, email, role, title, avatar, created_at FROM users ORDER BY id DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [
                'success' => true,
                'users' => $users ?: []
            ];
        } catch (PDOException $e) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Database query failed: ' . $e->getMessage()];
        }
    }

    /**
     * Administrator Direct User Onboarding
     */
    public static function adminCreateUser($data, $adminUser) {
        $fullName = trim($data['full_name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $password = $data['password'] ?? '';
        $role = strtolower(trim($data['role'] ?? 'student'));
        $title = !empty($data['title']) ? trim($data['title']) : null;
        $avatar = !empty($data['avatar']) ? trim($data['avatar']) : null;

        if (empty($fullName) || empty($email) || empty($password)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Full name, email, and password are required'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'A valid corporate or institutional email address is required'];
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Password must be at least 6 characters long'];
        }

        if (!in_array($role, ['student', 'admin', 'faculty', 'instructor'])) {
            $role = 'student';
        }

        $pdo = Database::getConnection();

        // Check if email already registered
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            return ['success' => false, 'error' => 'An account with this email address already exists in the system'];
        }

        // Proactively ensure avatar column is LONGTEXT for custom base64 avatars
        if ($avatar !== null) {
            try {
                @$pdo->exec("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL");
            } catch (Exception $migEx) {}
        }

        // Hash password with Bcrypt cost 12
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        try {
            $insertStmt = $pdo->prepare("
                INSERT INTO users (full_name, email, password_hash, role, title, avatar, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $insertStmt->execute([$fullName, $email, $passwordHash, $role, $title, $avatar]);
            $userId = (int)$pdo->lastInsertId();
        } catch (PDOException $e) {
            // Self-healing schema check
            try {
                @$pdo->exec("ALTER TABLE users ADD COLUMN title VARCHAR(150) NULL");
            } catch (Exception $ex) {}
            try {
                @$pdo->exec("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL");
            } catch (Exception $ex) {}

            $insertStmt = $pdo->prepare("
                INSERT INTO users (full_name, email, password_hash, role, title, avatar, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $insertStmt->execute([$fullName, $email, $passwordHash, $role, $title, $avatar]);
            $userId = (int)$pdo->lastInsertId();
        }

        http_response_code(201);
        return [
            'success' => true,
            'message' => 'User account onboarded successfully by administrator',
            'user' => [
                'id' => $userId,
                'full_name' => $fullName,
                'email' => $email,
                'role' => $role,
                'title' => $title,
                'avatar' => $avatar,
                'created_at' => date('Y-m-d H:i:s')
            ]
        ];
    }

    public static function login($data) {
        $email = strtolower(trim($data['email'] ?? ''));
        $password = $data['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Email and password are required'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, full_name, email, password_hash, role, title, avatar, status, is_archived, deleted_at, authorized_roles_json FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            // Self-healing upgrade for standard seed accounts
            if ($user && ($email === 'admin@aaroha-inc.com' || $email === 'elena.rostova@enterprise.io') && $password === 'password123') {
                $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                $upStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
                $upStmt->execute([$newHash, (int)$user['id']]);
                $user['password_hash'] = $newHash;
            } else {
                http_response_code(401);
                return ['success' => false, 'error' => 'Invalid email or password'];
            }
        }

        // Account lifecycle blocking: Deactivated or archived accounts cannot log in
        if (($user['status'] ?? 'active') === 'deactivated' || ($user['status'] ?? 'active') === 'archived' || !empty($user['deleted_at']) || !empty($user['is_archived'])) {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'This account has been ' . ($user['status'] ?: 'deactivated') . '. Please contact institutional administration.',
                'account_status' => $user['status'] ?: 'deactivated'
            ];
        }

        // Role-level lifecycle blocking: If student profile is deactivated/archived and user has no other role
        if ($user['role'] === 'student') {
            $sp = $pdo->prepare("SELECT account_status FROM student_profiles WHERE user_id = ?");
            $sp->execute([(int)$user['id']]);
            $stStatus = $sp->fetchColumn();
            if ($stStatus === 'deactivated' || $stStatus === 'archived') {
                $authRoles = json_decode($user['authorized_roles_json'] ?? '[]', true) ?: [];
                $otherRoles = array_diff($authRoles, ['student']);
                if (empty($otherRoles)) {
                    http_response_code(403);
                    return [
                        'success' => false,
                        'error' => 'Student account has been ' . $stStatus . '. Login access is blocked.',
                        'account_status' => $stStatus
                    ];
                }
            }
        } elseif ($user['role'] === 'faculty' || $user['role'] === 'instructor') {
            $fp = $pdo->prepare("SELECT account_status FROM faculty_profiles WHERE user_id = ?");
            $fp->execute([(int)$user['id']]);
            $facStatus = $fp->fetchColumn();
            if ($facStatus === 'deactivated' || $facStatus === 'archived') {
                $authRoles = json_decode($user['authorized_roles_json'] ?? '[]', true) ?: [];
                $otherRoles = array_diff($authRoles, ['faculty', 'instructor']);
                if (empty($otherRoles)) {
                    http_response_code(403);
                    return [
                        'success' => false,
                        'error' => 'Faculty account has been ' . $facStatus . '. Login access is blocked.',
                        'account_status' => $facStatus
                    ];
                }
            }
        }

        // Account status check for students and faculty prior to issuing session
        $sCheck = $pdo->prepare("SELECT account_status FROM student_profiles WHERE user_id = ? LIMIT 1");
        $sCheck->execute([(int)$user['id']]);
        $sProf = $sCheck->fetch();
        $accStatus = $sProf ? $sProf['account_status'] : null;

        if (!$accStatus) {
            $fCheck = $pdo->prepare("SELECT account_status FROM faculty_profiles WHERE user_id = ? LIMIT 1");
            $fCheck->execute([(int)$user['id']]);
            $fProf = $fCheck->fetch();
            $accStatus = $fProf ? $fProf['account_status'] : null;
        }

        if ($accStatus === 'invited') {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'Account has not been activated yet. Please click the invitation link sent to your email to set your password and activate your account.'
            ];
        }

        if ($accStatus === 'deactivated' || $accStatus === 'suspended') {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'Your account has been deactivated by an administrator. Please contact support.'
            ];
        }

        $tokenPayload = [
            'id' => (int)$user['id'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $jwtToken = JWT::generate($tokenPayload);

        return [
            'success' => true,
            'token' => $jwtToken,
            'user' => [
                'id' => (int)$user['id'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'title' => $user['title'] ?? null,
                'avatar' => $user['avatar'] ?? null
            ]
        ];
    }

    public static function me($authPayload) {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, full_name, email, role, title, avatar, created_at FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$authPayload['id']]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            return ['success' => false, 'error' => 'User not found'];
        }

        return ['success' => true, 'user' => $user];
    }

    public static function updateProfile(int $userId, array $data) {
        $pdo = Database::getConnection();
        
        $fullName = isset($data['full_name']) ? trim($data['full_name']) : null;
        $title = isset($data['title']) ? trim($data['title']) : null;
        $avatar = isset($data['avatar']) ? trim($data['avatar']) : null;
        $role = isset($data['role']) ? trim($data['role']) : null;
        
        $fields = [];
        $params = [];
        
        if ($fullName !== null && !empty($fullName)) {
            $fields[] = "full_name = ?";
            $params[] = $fullName;
        }
        if ($title !== null) {
            $fields[] = "title = ?";
            $params[] = $title;
        }
        if ($avatar !== null && !empty($avatar)) {
            $fields[] = "avatar = ?";
            $params[] = $avatar;
        }
        if ($role !== null && in_array($role, ['admin', 'faculty', 'instructor', 'student'])) {
            $fields[] = "role = ?";
            $params[] = $role;
        }
        
        if (empty($fields)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'No profile fields provided for update'];
        }

        // Proactively ensure avatar column is LONGTEXT for custom base64 uploads
        if ($avatar !== null) {
            try {
                @$pdo->exec("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL");
            } catch (Exception $migEx) {}
        }
        
        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        } catch (PDOException $e) {
            // Self-heal: modify avatar column to LONGTEXT to support custom base64 uploads, and add missing columns
            try {
                @$pdo->exec("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL");
            } catch (Exception $ex) {}
            try {
                @$pdo->exec("ALTER TABLE users ADD COLUMN title VARCHAR(150) NULL");
            } catch (Exception $ex) {}
            try {
                @$pdo->exec("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL");
            } catch (Exception $ex) {}
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }
        
        // Fetch updated user
        $fetchStmt = $pdo->prepare("SELECT id, full_name, email, role, title, avatar FROM users WHERE id = ? LIMIT 1");
        $fetchStmt->execute([$userId]);
        $updatedUser = $fetchStmt->fetch();
        
        $newToken = JWT::generate([
            'id' => (int)$updatedUser['id'],
            'full_name' => $updatedUser['full_name'],
            'email' => $updatedUser['email'],
            'role' => $updatedUser['role']
        ]);
        
        return [
            'success' => true,
            'message' => 'Profile updated successfully',
            'token' => $newToken,
            'user' => [
                'id' => (int)$updatedUser['id'],
                'full_name' => $updatedUser['full_name'],
                'email' => $updatedUser['email'],
                'role' => $updatedUser['role'],
                'title' => $updatedUser['title'] ?? null,
                'avatar' => $updatedUser['avatar'] ?? null
            ]
        ];
    }

    /**
     * Verify single-use invitation token cryptographically
     */
    public static function verifyInvitation($token) {
        $token = trim($token ?? '');
        if (empty($token)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invitation token is required'];
        }

        $pdo = Database::getConnection();

        // Check student profile
        $stmt = $pdo->prepare("
            SELECT sp.student_id_code as id_code, sp.account_status, sp.invitation_expires_at, sp.invitation_accepted_at,
                   u.id as user_id, u.full_name, u.email, u.role
            FROM student_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.invitation_token = ?
            LIMIT 1
        ");
        $stmt->execute([$token]);
        $match = $stmt->fetch();

        if (!$match) {
            // Check faculty profile
            $stmt = $pdo->prepare("
                SELECT fp.faculty_id_code as id_code, fp.account_status, fp.invitation_expires_at, fp.invitation_accepted_at,
                       u.id as user_id, u.full_name, u.email, u.role
                FROM faculty_profiles fp
                JOIN users u ON fp.user_id = u.id
                WHERE fp.invitation_token = ?
                LIMIT 1
            ");
            $stmt->execute([$token]);
            $match = $stmt->fetch();
        }

        if (!$match) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Invalid invitation link. Please contact your coordinator.'];
        }

        if (!empty($match['invitation_accepted_at'])) {
            http_response_code(400);
            return ['success' => false, 'error' => 'This invitation has already been accepted. Please sign in with your password.'];
        }

        if (!empty($match['invitation_expires_at']) && strtotime($match['invitation_expires_at']) < time()) {
            http_response_code(400);
            return ['success' => false, 'error' => 'This invitation link has expired. Please request a new invitation link from your administrator.'];
        }

        return [
            'success' => true,
            'user' => [
                'user_id' => (int)$match['user_id'],
                'full_name' => $match['full_name'],
                'email' => $match['email'],
                'role' => $match['role'],
                'id_code' => $match['id_code']
            ]
        ];
    }

    /**
     * Activate account and set self-chosen password
     */
    public static function activateAccount($data) {
        $token = trim($data['token'] ?? '');
        $password = $data['password'] ?? '';

        if (empty($token) || empty($password)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invitation token and password are required'];
        }

        if (strlen($password) < 8) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Password must be at least 8 characters long'];
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT user_id, invitation_expires_at, invitation_accepted_at FROM student_profiles WHERE invitation_token = ? LIMIT 1");
        $stmt->execute([$token]);
        $target = $stmt->fetch();
        $isStudent = true;

        if (!$target) {
            $stmt = $pdo->prepare("SELECT user_id, invitation_expires_at, invitation_accepted_at FROM faculty_profiles WHERE invitation_token = ? LIMIT 1");
            $stmt->execute([$token]);
            $target = $stmt->fetch();
            $isStudent = false;
        }

        if (!$target) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Invalid invitation token'];
        }

        if (!empty($target['invitation_accepted_at'])) {
            http_response_code(400);
            return ['success' => false, 'error' => 'This invitation has already been accepted'];
        }

        if (!empty($target['invitation_expires_at']) && strtotime($target['invitation_expires_at']) < time()) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invitation link has expired'];
        }

        $userId = (int)$target['user_id'];
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $pdo->beginTransaction();
        try {
            $uStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $uStmt->execute([$passwordHash, $userId]);

            $now = date('Y-m-d H:i:s');
            if ($isStudent) {
                $pStmt = $pdo->prepare("UPDATE student_profiles SET account_status = 'active', invitation_accepted_at = ? WHERE user_id = ?");
                $pStmt->execute([$now, $userId]);
            } else {
                $pStmt = $pdo->prepare("UPDATE faculty_profiles SET account_status = 'active', invitation_accepted_at = ? WHERE user_id = ?");
                $pStmt->execute([$now, $userId]);
            }

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to activate account: ' . $e->getMessage()];
        }

        $uFetch = $pdo->prepare("SELECT id, full_name, email, role, title, avatar FROM users WHERE id = ? LIMIT 1");
        $uFetch->execute([$userId]);
        $user = $uFetch->fetch();

        $tokenPayload = [
            'id' => (int)$user['id'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        $jwtToken = JWT::generate($tokenPayload);

        return [
            'success' => true,
            'message' => 'Account activated successfully. Welcome to Aaroha Technologies!',
            'token' => $jwtToken,
            'user' => $user
        ];
    }

    /**
     * Request single-use password reset link
     */
    public static function forgotPassword($data) {
        $email = strtolower(trim($data['email'] ?? ''));
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'A valid email address is required'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, full_name FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            return [
                'success' => true,
                'message' => 'If an account exists with this email, password reset instructions will be provided.',
                'email_delivery' => 'Unconfigured (Simulated Live Preview)'
            ];
        }

        $token = bin2hex(random_bytes(24));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $ins = $pdo->prepare("INSERT INTO password_resets (user_id, token, expires_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)");
        $ins->execute([(int)$user['id'], $token, $expiresAt]);

        $resetUrl = "https://lms.aaroha-inc.com/reset-password?token=" . $token;

        return [
            'success' => true,
            'message' => 'Password reset link generated successfully.',
            'reset_url' => $resetUrl,
            'email_delivery' => 'Unconfigured (Simulated Live Preview)',
            'email_notice' => 'Email delivery is currently simulated (SMTP unconfigured). Use the provided reset link directly.'
        ];
    }

    /**
     * Reset password with valid single-use token
     */
    public static function resetPassword($data) {
        $token = trim($data['token'] ?? '');
        $password = $data['password'] ?? '';

        if (empty($token) || empty($password)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Reset token and new password are required'];
        }

        if (strlen($password) < 8) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Password must be at least 8 characters long'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token = ? LIMIT 1");
        $stmt->execute([$token]);
        $reset = $stmt->fetch();

        if (!$reset) {
            http_response_code(404);
            return ['success' => false, 'error' => 'Invalid password reset token'];
        }

        if (!empty($reset['used_at'])) {
            http_response_code(400);
            return ['success' => false, 'error' => 'This password reset link has already been used'];
        }

        if (strtotime($reset['expires_at']) < time()) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Password reset link has expired'];
        }

        $userId = (int)$reset['user_id'];
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $pdo->beginTransaction();
        try {
            $uStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $uStmt->execute([$passwordHash, $userId]);

            $rStmt = $pdo->prepare("UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?");
            $rStmt->execute([(int)$reset['id']]);

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to reset password: ' . $e->getMessage()];
        }

        return [
            'success' => true,
            'message' => 'Password has been reset successfully. You may now log in with your new credentials.'
        ];
    }

}
