<?php
// Aaroha LMS - Database Configuration
// Compatible with MySQL 8.0+ / MariaDB via phpMyAdmin on Hostinger Shared Hosting

class Database {
    // Default Hostinger MySQL settings (override via env.php, environment, or direct update)
    private static $host = 'localhost';
    private static $db_name = 'lms_db';
    private static $username = 'root';
    private static $password = '';
    private static $charset = 'utf8mb4';
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo === null) {
            // Load credentials from optional env.php file if present
            $envConfig = [];
            $envFile = __DIR__ . '/env.php';
            if (file_exists($envFile)) {
                $envConfig = require $envFile;
            }

            $host = $envConfig['DB_HOST'] ?? getenv('DB_HOST') ?: self::$host;
            $db_name = $envConfig['DB_NAME'] ?? getenv('DB_NAME') ?: self::$db_name;
            $username = $envConfig['DB_USER'] ?? getenv('DB_USER') ?: self::$username;
            $password = $envConfig['DB_PASS'] ?? (getenv('DB_PASS') !== false ? getenv('DB_PASS') : self::$password);
            $charset = self::$charset;

            $dsn = "mysql:host={$host};dbname={$db_name};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$pdo = new PDO($dsn, $username, $password, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit;
            }
        }
        return self::$pdo;
    }
}

