<?php
// Aaroha LMS - Audit Logging Service
require_once __DIR__ . '/../config/database.php';

class AuditLogger {
    public static function log($action, $entityType, $entityId, $details = [], $user = null) {
        try {
            $pdo = Database::getConnection();
            $userId = $user['id'] ?? null;
            $userEmail = $user['email'] ?? null;
            $userRole = $user['role'] ?? null;
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

            // Filter out sensitive parameters
            $cleanDetails = is_array($details) ? $details : ['info' => $details];
            unset($cleanDetails['password'], $cleanDetails['password_hash'], $cleanDetails['token'], $cleanDetails['jwt']);

            $stmt = $pdo->prepare("
                INSERT INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, details_json, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([
                $userId,
                $userEmail,
                $userRole,
                $action,
                $entityType,
                (string)$entityId,
                json_encode($cleanDetails, JSON_UNESCAPED_SLASHES),
                $ipAddress
            ]);
        } catch (Exception $e) {
            // Fail open for audit logging so primary transactional flow does not crash
            error_log("Audit log failure: " . $e->getMessage());
        }
    }
}

