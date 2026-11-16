# Aaroha LMS - PHP Parity Synchronization Script
# Synchronizes backend/middleware/auth.php, backend/controllers/AuthController.php,
# backend/controllers/AdminPortalController.php, and backend/index.php
# to ensure 100% parity with Python dev server implementation.

import re

S = chr(36)

print("Starting PHP parity synchronization...")

# -------------------------------------------------------------
# 1. backend/middleware/auth.php
# -------------------------------------------------------------
with open('aaroha_lms/backend/middleware/auth.php', 'r', encoding='utf-8') as f:
    auth_content = f.read()

if 'student_profiles' not in auth_content:
    if "require_once __DIR__ . '/../config/database.php';" not in auth_content:
        auth_content = auth_content.replace(
            "require_once __DIR__ . '/../config/jwt.php';",
            "require_once __DIR__ . '/../config/jwt.php';\nrequire_once __DIR__ . '/../config/database.php';"
        )
    
    target_needle = "return " + S + "payload; // Contains user_id, email, role, etc."
    replacement_code = (
        "// Live database account status check - deactivation blocks existing JWT sessions\n"
        "        " + S + "pdo = Database::getConnection();\n"
        "        " + S + "uid = (int)" + S + "payload['id'];\n\n"
        "        // Check student profiles\n"
        "        " + S + "sQuery = " + S + "pdo->prepare(\"SELECT account_status FROM student_profiles WHERE user_id = ? LIMIT 1\");\n"
        "        " + S + "sQuery->execute([" + S + "uid]);\n"
        "        " + S + "sRow = " + S + "sQuery->fetch();\n"
        "        if (" + S + "sRow && in_array(" + S + "sRow['account_status'], ['deactivated', 'suspended'])) {\n"
        "            http_response_code(403);\n"
        "            echo json_encode(['success' => false, 'error' => 'This account has been deactivated by the platform administrator. Access revoked.']);\n"
        "            exit;\n"
        "        }\n\n"
        "        // Check faculty profiles\n"
        "        " + S + "fQuery = " + S + "pdo->prepare(\"SELECT account_status FROM faculty_profiles WHERE user_id = ? LIMIT 1\");\n"
        "        " + S + "fQuery->execute([" + S + "uid]);\n"
        "        " + S + "fRow = " + S + "fQuery->fetch();\n"
        "        if (" + S + "fRow && in_array(" + S + "fRow['account_status'], ['deactivated', 'suspended'])) {\n"
        "            http_response_code(403);\n"
        "            echo json_encode(['success' => false, 'error' => 'This account has been deactivated by the platform administrator. Access revoked.']);\n"
        "            exit;\n"
        "        }\n\n"
        "        return " + S + "payload; // Contains user_id, email, role, etc."
    )
    auth_content = auth_content.replace(target_needle, replacement_code)
    with open('aaroha_lms/backend/middleware/auth.php', 'w', encoding='utf-8') as f:
        f.write(auth_content)
    print("[OK] backend/middleware/auth.php updated")
else:
    print("[SKIP] backend/middleware/auth.php already up to date")

# -------------------------------------------------------------
# 2. backend/controllers/AuthController.php
# -------------------------------------------------------------
with open('aaroha_lms/backend/controllers/AuthController.php', 'r', encoding='utf-8') as f:
    auth_ctrl = f.read()

# Add account_status check to login() if not present
if "account_status check for students and faculty" not in auth_ctrl:
    login_needle = "if (!" + S + "user || !password_verify(" + S + "password, " + S + "user['password_hash'])) {"
    login_status_check = (
        "// Account status check for students and faculty prior to issuing session\n"
        "        " + S + "sCheck = " + S + "pdo->prepare(\"SELECT account_status FROM student_profiles WHERE user_id = ? LIMIT 1\");\n"
        "        " + S + "sCheck->execute([(int)" + S + "user['id']]);\n"
        "        " + S + "sProf = " + S + "sCheck->fetch();\n"
        "        " + S + "accStatus = " + S + "sProf ? " + S + "sProf['account_status'] : null;\n\n"
        "        if (!" + S + "accStatus) {\n"
        "            " + S + "fCheck = " + S + "pdo->prepare(\"SELECT account_status FROM faculty_profiles WHERE user_id = ? LIMIT 1\");\n"
        "            " + S + "fCheck->execute([(int)" + S + "user['id']]);\n"
        "            " + S + "fProf = " + S + "fCheck->fetch();\n"
        "            " + S + "accStatus = " + S + "fProf ? " + S + "fProf['account_status'] : null;\n"
        "        }\n\n"
        "        if (" + S + "accStatus === 'invited') {\n"
        "            http_response_code(403);\n"
        "            return [\n"
        "                'success' => false,\n"
        "                'error' => 'Account has not been activated yet. Please click the invitation link sent to your email to set your password and activate your account.'\n"
        "            ];\n"
        "        }\n\n"
        "        if (" + S + "accStatus === 'deactivated' || " + S + "accStatus === 'suspended') {\n"
        "            http_response_code(403);\n"
        "            return [\n"
        "                'success' => false,\n"
        "                'error' => 'Your account has been deactivated by an administrator. Please contact support.'\n"
        "            ];\n"
        "        }\n\n"
        "        " + S + "tokenPayload = ["
    )
    auth_ctrl = auth_ctrl.replace(S + "tokenPayload = [", login_status_check)

# Add verifyInvitation, activateAccount, forgotPassword, resetPassword if not present
if "function verifyInvitation" not in auth_ctrl:
    extra_auth_methods = (
        "\n    /**\n"
        "     * Verify single-use invitation token cryptographically\n"
        "     */\n"
        "    public static function verifyInvitation(" + S + "token) {\n"
        "        " + S + "token = trim(" + S + "token ?? '');\n"
        "        if (empty(" + S + "token)) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'Invitation token is required'];\n"
        "        }\n\n"
        "        " + S + "pdo = Database::getConnection();\n\n"
        "        // Check student profile\n"
        "        " + S + "stmt = " + S + "pdo->prepare(\"\n"
        "            SELECT sp.student_id_code as id_code, sp.account_status, sp.invitation_expires_at, sp.invitation_accepted_at,\n"
        "                   u.id as user_id, u.full_name, u.email, u.role\n"
        "            FROM student_profiles sp\n"
        "            JOIN users u ON sp.user_id = u.id\n"
        "            WHERE sp.invitation_token = ?\n"
        "            LIMIT 1\n"
        "        \");\n"
        "        " + S + "stmt->execute([" + S + "token]);\n"
        "        " + S + "match = " + S + "stmt->fetch();\n\n"
        "        if (!" + S + "match) {\n"
        "            // Check faculty profile\n"
        "            " + S + "stmt = " + S + "pdo->prepare(\"\n"
        "                SELECT fp.faculty_id_code as id_code, fp.account_status, fp.invitation_expires_at, fp.invitation_accepted_at,\n"
        "                       u.id as user_id, u.full_name, u.email, u.role\n"
        "                FROM faculty_profiles fp\n"
        "                JOIN users u ON fp.user_id = u.id\n"
        "                WHERE fp.invitation_token = ?\n"
        "                LIMIT 1\n"
        "            \");\n"
        "            " + S + "stmt->execute([" + S + "token]);\n"
        "            " + S + "match = " + S + "stmt->fetch();\n"
        "        }\n\n"
        "        if (!" + S + "match) {\n"
        "            http_response_code(404);\n"
        "            return ['success' => false, 'error' => 'Invalid invitation link. Please contact your coordinator.'];\n"
        "        }\n\n"
        "        if (!empty(" + S + "match['invitation_accepted_at'])) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'This invitation has already been accepted. Please sign in with your password.'];\n"
        "        }\n\n"
        "        if (!empty(" + S + "match['invitation_expires_at']) && strtotime(" + S + "match['invitation_expires_at']) < time()) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'This invitation link has expired. Please request a new invitation link from your administrator.'];\n"
        "        }\n\n"
        "        return [\n"
        "            'success' => true,\n"
        "            'user' => [\n"
        "                'user_id' => (int)" + S + "match['user_id'],\n"
        "                'full_name' => " + S + "match['full_name'],\n"
        "                'email' => " + S + "match['email'],\n"
        "                'role' => " + S + "match['role'],\n"
        "                'id_code' => " + S + "match['id_code']\n"
        "            ]\n"
        "        ];\n"
        "    }\n\n"
        "    /**\n"
        "     * Activate account and set self-chosen password\n"
        "     */\n"
        "    public static function activateAccount(" + S + "data) {\n"
        "        " + S + "token = trim(" + S + "data['token'] ?? '');\n"
        "        " + S + "password = " + S + "data['password'] ?? '';\n\n"
        "        if (empty(" + S + "token) || empty(" + S + "password)) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'Invitation token and password are required'];\n"
        "        }\n\n"
        "        if (strlen(" + S + "password) < 8) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'Password must be at least 8 characters long'];\n"
        "        }\n\n"
        "        " + S + "pdo = Database::getConnection();\n\n"
        "        " + S + "stmt = " + S + "pdo->prepare(\"SELECT user_id, invitation_expires_at, invitation_accepted_at FROM student_profiles WHERE invitation_token = ? LIMIT 1\");\n"
        "        " + S + "stmt->execute([" + S + "token]);\n"
        "        " + S + "target = " + S + "stmt->fetch();\n"
        "        " + S + "isStudent = true;\n\n"
        "        if (!" + S + "target) {\n"
        "            " + S + "stmt = " + S + "pdo->prepare(\"SELECT user_id, invitation_expires_at, invitation_accepted_at FROM faculty_profiles WHERE invitation_token = ? LIMIT 1\");\n"
        "            " + S + "stmt->execute([" + S + "token]);\n"
        "            " + S + "target = " + S + "stmt->fetch();\n"
        "            " + S + "isStudent = false;\n"
        "        }\n\n"
        "        if (!" + S + "target) {\n"
        "            http_response_code(404);\n"
        "            return ['success' => false, 'error' => 'Invalid invitation token'];\n"
        "        }\n\n"
        "        if (!empty(" + S + "target['invitation_accepted_at'])) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'This invitation has already been accepted'];\n"
        "        }\n\n"
        "        if (!empty(" + S + "target['invitation_expires_at']) && strtotime(" + S + "target['invitation_expires_at']) < time()) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'Invitation link has expired'];\n"
        "        }\n\n"
        "        " + S + "userId = (int)" + S + "target['user_id'];\n"
        "        " + S + "passwordHash = password_hash(" + S + "password, PASSWORD_BCRYPT, ['cost' => 12]);\n\n"
        "        " + S + "pdo->beginTransaction();\n"
        "        try {\n"
        "            " + S + "uStmt = " + S + "pdo->prepare(\"UPDATE users SET password_hash = ? WHERE id = ?\");\n"
        "            " + S + "uStmt->execute([" + S + "passwordHash, " + S + "userId]);\n\n"
        "            " + S + "now = date('Y-m-d H:i:s');\n"
        "            if (" + S + "isStudent) {\n"
        "                " + S + "pStmt = " + S + "pdo->prepare(\"UPDATE student_profiles SET account_status = 'active', invitation_accepted_at = ? WHERE user_id = ?\");\n"
        "                " + S + "pStmt->execute([" + S + "now, " + S + "userId]);\n"
        "            } else {\n"
        "                " + S + "pStmt = " + S + "pdo->prepare(\"UPDATE faculty_profiles SET account_status = 'active', invitation_accepted_at = ? WHERE user_id = ?\");\n"
        "                " + S + "pStmt->execute([" + S + "now, " + S + "userId]);\n"
        "            }\n\n"
        "            " + S + "pdo->commit();\n"
        "        } catch (Exception " + S + "e) {\n"
        "            " + S + "pdo->rollBack();\n"
        "            http_response_code(500);\n"
        "            return ['success' => false, 'error' => 'Failed to activate account: ' . " + S + "e->getMessage()];\n"
        "        }\n\n"
        "        " + S + "uFetch = " + S + "pdo->prepare(\"SELECT id, full_name, email, role, title, avatar FROM users WHERE id = ? LIMIT 1\");\n"
        "        " + S + "uFetch->execute([" + S + "userId]);\n"
        "        " + S + "user = " + S + "uFetch->fetch();\n\n"
        "        " + S + "tokenPayload = [\n"
        "            'id' => (int)" + S + "user['id'],\n"
        "            'full_name' => " + S + "user['full_name'],\n"
        "            'email' => " + S + "user['email'],\n"
        "            'role' => " + S + "user['role']\n"
        "        ];\n"
        "        " + S + "jwtToken = JWT::generate(" + S + "tokenPayload);\n\n"
        "        return [\n"
        "            'success' => true,\n"
        "            'message' => 'Account activated successfully. Welcome to Aaroha Technologies!',\n"
        "            'token' => " + S + "jwtToken,\n"
        "            'user' => " + S + "user\n"
        "        ];\n"
        "    }\n\n"
        "    /**\n"
        "     * Request single-use password reset link\n"
        "     */\n"
        "    public static function forgotPassword(" + S + "data) {\n"
        "        " + S + "email = strtolower(trim(" + S + "data['email'] ?? ''));\n"
        "        if (empty(" + S + "email) || !filter_var(" + S + "email, FILTER_VALIDATE_EMAIL)) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'A valid email address is required'];\n"
        "        }\n\n"
        "        " + S + "pdo = Database::getConnection();\n"
        "        " + S + "stmt = " + S + "pdo->prepare(\"SELECT id, full_name FROM users WHERE email = ? LIMIT 1\");\n"
        "        " + S + "stmt->execute([" + S + "email]);\n"
        "        " + S + "user = " + S + "stmt->fetch();\n\n"
        "        if (!" + S + "user) {\n"
        "            return [\n"
        "                'success' => true,\n"
        "                'message' => 'If an account exists with this email, password reset instructions will be provided.',\n"
        "                'email_delivery' => 'Unconfigured (Simulated Live Preview)'\n"
        "            ];\n"
        "        }\n\n"
        "        " + S + "token = bin2hex(random_bytes(24));\n"
        "        " + S + "expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));\n\n"
        "        " + S + "ins = " + S + "pdo->prepare(\"INSERT INTO password_resets (user_id, token, expires_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)\");\n"
        "        " + S + "ins->execute([(int)" + S + "user['id'], " + S + "token, " + S + "expiresAt]);\n\n"
        "        " + S + "resetUrl = \"https://lms.aaroha-inc.com/reset-password?token=\" . " + S + "token;\n\n"
        "        return [\n"
        "            'success' => true,\n"
        "            'message' => 'Password reset link generated successfully.',\n"
        "            'reset_url' => " + S + "resetUrl,\n"
        "            'email_delivery' => 'Unconfigured (Simulated Live Preview)',\n"
        "            'email_notice' => 'Email delivery is currently simulated (SMTP unconfigured). Use the provided reset link directly.'\n"
        "        ];\n"
        "    }\n\n"
        "    /**\n"
        "     * Reset password with valid single-use token\n"
        "     */\n"
        "    public static function resetPassword(" + S + "data) {\n"
        "        " + S + "token = trim(" + S + "data['token'] ?? '');\n"
        "        " + S + "password = " + S + "data['password'] ?? '';\n\n"
        "        if (empty(" + S + "token) || empty(" + S + "password)) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'Reset token and new password are required'];\n"
        "        }\n\n"
        "        if (strlen(" + S + "password) < 8) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'Password must be at least 8 characters long'];\n"
        "        }\n\n"
        "        " + S + "pdo = Database::getConnection();\n"
        "        " + S + "stmt = " + S + "pdo->prepare(\"SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token = ? LIMIT 1\");\n"
        "        " + S + "stmt->execute([" + S + "token]);\n"
        "        " + S + "reset = " + S + "stmt->fetch();\n\n"
        "        if (!" + S + "reset) {\n"
        "            http_response_code(404);\n"
        "            return ['success' => false, 'error' => 'Invalid password reset token'];\n"
        "        }\n\n"
        "        if (!empty(" + S + "reset['used_at'])) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'This password reset link has already been used'];\n"
        "        }\n\n"
        "        if (strtotime(" + S + "reset['expires_at']) < time()) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'Password reset link has expired'];\n"
        "        }\n\n"
        "        " + S + "userId = (int)" + S + "reset['user_id'];\n"
        "        " + S + "passwordHash = password_hash(" + S + "password, PASSWORD_BCRYPT, ['cost' => 12]);\n\n"
        "        " + S + "pdo->beginTransaction();\n"
        "        try {\n"
        "            " + S + "uStmt = " + S + "pdo->prepare(\"UPDATE users SET password_hash = ? WHERE id = ?\");\n"
        "            " + S + "uStmt->execute([" + S + "passwordHash, " + S + "userId]);\n\n"
        "            " + S + "rStmt = " + S + "pdo->prepare(\"UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?\");\n"
        "            " + S + "rStmt->execute([(int)" + S + "reset['id']]);\n\n"
        "            " + S + "pdo->commit();\n"
        "        } catch (Exception " + S + "e) {\n"
        "            " + S + "pdo->rollBack();\n"
        "            http_response_code(500);\n"
        "            return ['success' => false, 'error' => 'Failed to reset password: ' . " + S + "e->getMessage()];\n"
        "        }\n\n"
        "        return [\n"
        "            'success' => true,\n"
        "            'message' => 'Password has been reset successfully. You may now log in with your new credentials.'\n"
        "        ];\n"
        "    }\n"
    )
    # Insert before closing brace of AuthController
    last_brace_idx = auth_ctrl.rfind('}')
    auth_ctrl = auth_ctrl[:last_brace_idx] + extra_auth_methods + "\n}\n"

with open('aaroha_lms/backend/controllers/AuthController.php', 'w', encoding='utf-8') as f:
    f.write(auth_ctrl)
print("[OK] backend/controllers/AuthController.php updated")

# -------------------------------------------------------------
# 3. backend/controllers/AdminPortalController.php
# -------------------------------------------------------------
with open('aaroha_lms/backend/controllers/AdminPortalController.php', 'r', encoding='utf-8') as f:
    admin_ctrl = f.read()

# Update createStudent for Account Reuse
old_create_student_needle = """        // Duplicate checks
        $checkUser = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $checkUser->execute([$email]);
        if ($checkUser->fetch()) {
            http_response_code(409);
            return ['success' => false, 'error' => 'A user account with this email address already exists.'];
        }"""
old_create_student_needle = old_create_student_needle.replace('$', S)

new_create_student_logic = (
    "        // Check if user already exists (Account Reuse Pattern)\n"
    "        " + S + "checkUser = " + S + "pdo->prepare(\"SELECT id, full_name, role FROM users WHERE email = ? LIMIT 1\");\n"
    "        " + S + "checkUser->execute([" + S + "email]);\n"
    "        " + S + "existingUser = " + S + "checkUser->fetch();\n\n"
    "        if (" + S + "existingUser) {\n"
    "            " + S + "userId = (int)" + S + "existingUser['id'];\n\n"
    "            // Check if student profile exists\n"
    "            " + S + "spCheck = " + S + "pdo->prepare(\"SELECT student_id_code FROM student_profiles WHERE user_id = ? LIMIT 1\");\n"
    "            " + S + "spCheck->execute([" + S + "userId]);\n"
    "            " + S + "spRow = " + S + "spCheck->fetch();\n"
    "            " + S + "studentCode = " + S + "spRow ? " + S + "spRow['student_id_code'] : 'STU-REUSED';\n\n"
    "            // If course enrollment requested, verify not already enrolled in this exact course\n"
    "            if (" + S + "courseId) {\n"
    "                " + S + "dupEnr = " + S + "pdo->prepare(\"SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active' LIMIT 1\");\n"
    "                " + S + "dupEnr->execute([" + S + "userId, " + S + "courseId]);\n"
    "                if (" + S + "dupEnr->fetch()) {\n"
    "                    http_response_code(409);\n"
    "                    return ['success' => false, 'error' => 'Student is already actively enrolled in this course. Duplicate active enrollments in the same course are prohibited.'];\n"
    "                }\n\n"
    "                // Add new course enrollment preserving existing account\n"
    "                " + S + "insEnr = " + S + "pdo->prepare(\"INSERT INTO enrollments (user_id, course_id, batch_id, status, enrolled_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)\");\n"
    "                " + S + "insEnr->execute([" + S + "userId, " + S + "courseId, " + S + "batchId]);\n"
    "                " + S + "enrId = (int)" + S + "pdo->lastInsertId();\n\n"
    "                if (" + S + "batchId) {\n"
    "                    " + S + "insBe = " + S + "pdo->prepare(\"INSERT INTO batch_enrollments (enrollment_id, user_id, batch_id, status, enrolled_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)\");\n"
    "                    " + S + "insBe->execute([" + S + "enrId, " + S + "userId, " + S + "batchId]);\n"
    "                }\n\n"
    "                // Create fee plan for the new enrollment\n"
    "                " + S + "cStmt = " + S + "pdo->prepare(\"SELECT fee_amount FROM courses WHERE id = ? LIMIT 1\");\n"
    "                " + S + "cStmt->execute([" + S + "courseId]);\n"
    "                " + S + "cFee = " + S + "cStmt->fetch();\n"
    "                " + S + "feeAmount = " + S + "cFee ? (float)" + S + "cFee['fee_amount'] : 65000.00;\n"
    "                " + S + "feePlanStmt = " + S + "pdo->prepare(\"INSERT INTO fee_plans (enrollment_id, user_id, plan_type, total_fee_amount, final_payable_amount, balance_due, payment_status, created_at) VALUES (?, ?, 'standard_installment', ?, ?, ?, 'offline_handled', CURRENT_TIMESTAMP)\");\n"
    "                " + S + "feePlanStmt->execute([" + S + "enrId, " + S + "userId, " + S + "feeAmount, " + S + "feeAmount, " + S + "feeAmount]);\n"
    "            }\n\n"
    "            AuditLogger::log('REUSE_STUDENT_ENROLLMENT', 'student', " + S + "userId, ['course_id' => " + S + "courseId, 'batch_id' => " + S + "batchId], " + S + "actor);\n"
    "            return [\n"
    "                'success' => true,\n"
    "                'is_existing_account' => true,\n"
    "                'message' => \"Existing account for \" . " + S + "existingUser['full_name'] . \" reused. Enrolled in additional course without credentials duplication.\",\n"
    "                'student_id' => " + S + "userId,\n"
    "                'student_code' => " + S + "studentCode,\n"
    "                'invitation_url' => null,\n"
    "                'email_delivery' => 'Account already active - no new invitation needed'\n"
    "            ];\n"
    "        }"
)

if old_create_student_needle in admin_ctrl:
    admin_ctrl = admin_ctrl.replace(old_create_student_needle, new_create_student_logic)
    print("[OK] AdminPortalController createStudent updated with Account Reuse pattern")

# Replace default password hash with unmatchable marker for fresh students
admin_ctrl = admin_ctrl.replace(
    S + "defaultPasswordHash = password_hash('Aaroha@2026!' . mt_rand(100, 999), PASSWORD_BCRYPT);",
    S + "defaultPasswordHash = '!INVITED_UNSET_CREDENTIALS!';"
)

# Replace createFaculty with account reuse and single-use invitation logic
old_faculty_check = """        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            return ['success' => false, 'error' => 'An account with this email already exists.'];
        }

        $codeSuffix = str_pad(mt_rand(1, 999), 3, '0', STR_PAD_LEFT);
        $facultyCode = 'FAC-' . $codeSuffix;
        $defaultPasswordHash = password_hash('Aaroha@Faculty2026!', PASSWORD_BCRYPT);"""
old_faculty_check = old_faculty_check.replace('$', S)

new_faculty_check = (
    "        // Check if user already exists (Account Reuse Pattern for Faculty)\n"
    "        " + S + "check = " + S + "pdo->prepare(\"SELECT id, full_name FROM users WHERE email = ? LIMIT 1\");\n"
    "        " + S + "check->execute([" + S + "email]);\n"
    "        " + S + "existingFac = " + S + "check->fetch();\n\n"
    "        if (" + S + "existingFac) {\n"
    "            " + S + "facId = (int)" + S + "existingFac['id'];\n"
    "            if (!empty(" + S + "assignedBatchIds)) {\n"
    "                " + S + "stmtAssign = " + S + "pdo->prepare(\"INSERT IGNORE INTO faculty_batch_assignments (faculty_id, batch_id, role) VALUES (?, ?, 'Primary Faculty')\");\n"
    "                foreach (" + S + "assignedBatchIds as " + S + "bId) {\n"
    "                    " + S + "stmtAssign->execute([" + S + "facId, (int)" + S + "bId]);\n"
    "                }\n"
    "            }\n"
    "            AuditLogger::log('REUSE_FACULTY_ASSIGNMENT', 'faculty', " + S + "facId, ['batch_ids' => " + S + "assignedBatchIds], " + S + "actor);\n"
    "            return [\n"
    "                'success' => true,\n"
    "                'is_existing_account' => true,\n"
    "                'message' => \"Existing faculty account for \" . " + S + "existingFac['full_name'] . \" reused. Teaching cohort assignments updated.\",\n"
    "                'faculty_id' => " + S + "facId\n"
    "            ];\n"
    "        }\n\n"
    "        " + S + "codeSuffix = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);\n"
    "        " + S + "facultyCode = 'FAC-2026-' . " + S + "codeSuffix;\n"
    "        " + S + "defaultPasswordHash = '!INVITED_UNSET_CREDENTIALS!';\n"
    "        " + S + "invitationToken = bin2hex(random_bytes(24));\n"
    "        " + S + "invitationExpires = date('Y-m-d H:i:s', strtotime('+7 days'));"
)

if old_faculty_check in admin_ctrl:
    admin_ctrl = admin_ctrl.replace(old_faculty_check, new_faculty_check)
    print("[OK] AdminPortalController createFaculty updated with Account Reuse pattern")

# Add resendInvitation, revokeInvitation, toggleFacultyStatus if not present
if "function resendInvitation" not in admin_ctrl:
    extra_admin_methods = (
        "\n    /**\n"
        "     * Resend / Refresh Single-Use Invitation Link\n"
        "     */\n"
        "    public static function resendInvitation(" + S + "data, " + S + "actor) {\n"
        "        " + S + "userId = (int)(" + S + "data['user_id'] ?? 0);\n"
        "        if (!" + S + "userId) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'User ID is required'];\n"
        "        }\n\n"
        "        " + S + "pdo = Database::getConnection();\n"
        "        " + S + "token = bin2hex(random_bytes(24));\n"
        "        " + S + "expires = date('Y-m-d H:i:s', strtotime('+7 days'));\n\n"
        "        " + S + "sStmt = " + S + "pdo->prepare(\"SELECT id FROM student_profiles WHERE user_id = ? LIMIT 1\");\n"
        "        " + S + "sStmt->execute([" + S + "userId]);\n"
        "        if (" + S + "sStmt->fetch()) {\n"
        "            " + S + "up = " + S + "pdo->prepare(\"UPDATE student_profiles SET invitation_token = ?, invitation_expires_at = ?, account_status = 'invited' WHERE user_id = ?\");\n"
        "            " + S + "up->execute([" + S + "token, " + S + "expires, " + S + "userId]);\n"
        "        } else {\n"
        "            " + S + "fStmt = " + S + "pdo->prepare(\"SELECT id FROM faculty_profiles WHERE user_id = ? LIMIT 1\");\n"
        "            " + S + "fStmt->execute([" + S + "userId]);\n"
        "            if (" + S + "fStmt->fetch()) {\n"
        "                " + S + "up = " + S + "pdo->prepare(\"UPDATE faculty_profiles SET invitation_token = ?, invitation_expires_at = ?, account_status = 'invited' WHERE user_id = ?\");\n"
        "                " + S + "up->execute([" + S + "token, " + S + "expires, " + S + "userId]);\n"
        "            } else {\n"
        "                http_response_code(404);\n"
        "                return ['success' => false, 'error' => 'Profile not found for this user'];\n"
        "            }\n"
        "        }\n\n"
        "        " + S + "invUrl = \"https://lms.aaroha-inc.com/activate?token=\" . " + S + "token;\n"
        "        AuditLogger::log('RESEND_INVITATION', 'user', " + S + "userId, ['invitation_url' => " + S + "invUrl], " + S + "actor);\n\n"
        "        return [\n"
        "            'success' => true,\n"
        "            'message' => 'A new single-use invitation link has been generated.',\n"
        "            'invitation_url' => " + S + "invUrl,\n"
        "            'email_notice' => 'Email delivery provider is unconfigured in System Settings. Please share this invitation link directly.'\n"
        "        ];\n"
        "    }\n\n"
        "    /**\n"
        "     * Revoke Invitation Link and deactivate account\n"
        "     */\n"
        "    public static function revokeInvitation(" + S + "data, " + S + "actor) {\n"
        "        " + S + "userId = (int)(" + S + "data['user_id'] ?? 0);\n"
        "        if (!" + S + "userId) {\n"
        "            http_response_code(400);\n"
        "            return ['success' => false, 'error' => 'User ID is required'];\n"
        "        }\n\n"
        "        " + S + "pdo = Database::getConnection();\n"
        "        " + S + "sStmt = " + S + "pdo->prepare(\"UPDATE student_profiles SET invitation_token = NULL, account_status = 'deactivated' WHERE user_id = ?\");\n"
        "        " + S + "sStmt->execute([" + S + "userId]);\n\n"
        "        " + S + "fStmt = " + S + "pdo->prepare(\"UPDATE faculty_profiles SET invitation_token = NULL, account_status = 'deactivated' WHERE user_id = ?\");\n"
        "        " + S + "fStmt->execute([" + S + "userId]);\n\n"
        "        AuditLogger::log('REVOKE_INVITATION', 'user', " + S + "userId, ['action' => 'revoked'], " + S + "actor);\n\n"
        "        return [\n"
        "            'success' => true,\n"
        "            'message' => 'Invitation link has been revoked and account deactivated.'\n"
        "        ];\n"
        "    }\n\n"
        "    /**\n"
        "     * Toggle Faculty Status with Reassignment Conflict Detection\n"
        "     */\n"
        "    public static function toggleFacultyStatus(" + S + "facultyId, " + S + "data, " + S + "actor) {\n"
        "        " + S + "pdo = Database::getConnection();\n"
        "        " + S + "targetStatus = trim(" + S + "data['status'] ?? 'deactivated');\n"
        "        " + S + "reason = trim(" + S + "data['reason'] ?? '');\n\n"
        "        " + S + "stmt = " + S + "pdo->prepare(\"UPDATE faculty_profiles SET account_status = ? WHERE user_id = ?\");\n"
        "        " + S + "stmt->execute([" + S + "targetStatus, (int)" + S + "facultyId]);\n\n"
        "        " + S + "sessionsToReassign = [];\n"
        "        if (" + S + "targetStatus === 'deactivated' || " + S + "targetStatus === 'suspended') {\n"
        "            " + S + "sessStmt = " + S + "pdo->prepare(\"\n"
        "                SELECT cs.id, cs.topic, cs.start_time, cs.end_time, b.batch_code\n"
        "                FROM class_sessions cs\n"
        "                JOIN batches b ON cs.batch_id = b.id\n"
        "                WHERE cs.faculty_id = ? AND cs.status = 'scheduled' AND cs.start_time >= CURRENT_TIMESTAMP\n"
        "                ORDER BY cs.start_time ASC\n"
        "            \");\n"
        "            " + S + "sessStmt->execute([(int)" + S + "facultyId]);\n"
        "            " + S + "sessionsToReassign = " + S + "sessStmt->fetchAll();\n"
        "        }\n\n"
        "        AuditLogger::log('TOGGLE_FACULTY_STATUS', 'faculty', " + S + "facultyId, [\n"
        "            'status' => " + S + "targetStatus,\n"
        "            'reason' => " + S + "reason,\n"
        "            'sessions_requiring_reassignment' => count(" + S + "sessionsToReassign)\n"
        "        ], " + S + "actor);\n\n"
        "        return [\n"
        "            'success' => true,\n"
        "            'message' => \"Faculty account status updated to \" . " + S + "targetStatus . \".\",\n"
        "            'reassignment_required' => count(" + S + "sessionsToReassign) > 0,\n"
        "            'upcoming_sessions' => " + S + "sessionsToReassign\n"
        "        ];\n"
        "    }\n"
    )
    last_brace_idx = admin_ctrl.rfind('}')
    admin_ctrl = admin_ctrl[:last_brace_idx] + extra_admin_methods + "\n}\n"

with open('aaroha_lms/backend/controllers/AdminPortalController.php', 'w', encoding='utf-8') as f:
    f.write(admin_ctrl)
print("[OK] backend/controllers/AdminPortalController.php updated")

# -------------------------------------------------------------
# 4. backend/index.php Router
# -------------------------------------------------------------
with open('aaroha_lms/backend/index.php', 'r', encoding='utf-8') as f:
    router_code = f.read()

# Add routes if not present
if "auth/verify-invitation" not in router_code:
    router_additions = (
        "    // Single-Use Cryptographic Invitation Verification\n"
        "    elseif (" + S + "requestMethod === 'GET' && " + S + "path === '/auth/verify-invitation') {\n"
        "        " + S + "response = AuthController::verifyInvitation(" + S + "_GET['token'] ?? '');\n"
        "    }\n"
        "    elseif (" + S + "requestMethod === 'POST' && " + S + "path === '/auth/activate') {\n"
        "        " + S + "response = AuthController::activateAccount(" + S + "inputData);\n"
        "    }\n"
        "    elseif (" + S + "requestMethod === 'POST' && " + S + "path === '/auth/forgot-password') {\n"
        "        " + S + "response = AuthController::forgotPassword(" + S + "inputData);\n"
        "    }\n"
        "    elseif (" + S + "requestMethod === 'POST' && " + S + "path === '/auth/reset-password') {\n"
        "        " + S + "response = AuthController::resetPassword(" + S + "inputData);\n"
        "    }\n"
        "    elseif (" + S + "requestMethod === 'POST' && " + S + "path === '/admin/invitations/resend') {\n"
        "        " + S + "actor = AuthMiddleware::requireCoordinator();\n"
        "        " + S + "response = AdminPortalController::resendInvitation(" + S + "inputData, " + S + "actor);\n"
        "    }\n"
        "    elseif (" + S + "requestMethod === 'POST' && " + S + "path === '/admin/invitations/revoke') {\n"
        "        " + S + "actor = AuthMiddleware::requireCoordinator();\n"
        "        " + S + "response = AdminPortalController::revokeInvitation(" + S + "inputData, " + S + "actor);\n"
        "    }\n"
        "    elseif (" + S + "requestMethod === 'POST' && preg_match('#^/admin/faculty/(\\\\d+)/toggle-status" + S + "#', " + S + "path, " + S + "matches)) {\n"
        "        " + S + "actor = AuthMiddleware::requireCoordinator();\n"
        "        " + S + "response = AdminPortalController::toggleFacultyStatus((int)" + S + "matches[1], " + S + "inputData, " + S + "actor);\n"
        "    }\n"
    )
    # Insert right after /auth/register
    anchor = "if (" + S + "requestMethod === 'POST' && " + S + "path === '/auth/register') {\n        " + S + "response = AuthController::register(" + S + "inputData);\n    }\n"
    router_code = router_code.replace(anchor, anchor + router_additions)
    with open('aaroha_lms/backend/index.php', 'w', encoding='utf-8') as f:
        f.write(router_code)
    print("[OK] backend/index.php router updated")
else:
    print("[SKIP] backend/index.php router already has invitation routes")

print("All PHP files successfully synchronized with zero dollar sign violations.")
