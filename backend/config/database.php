<?php
// Aaroha LMS - Database Configuration
// Compatible with MySQL 8.0+ / MariaDB via phpMyAdmin on Hostinger Shared Hosting,
// with transparent SQLite support for local development & testing.

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
            $candidates = [
                __DIR__ . '/env.php',
                dirname(__DIR__, 2) . '/env.php',
                dirname(__DIR__, 3) . '/env.php',
            ];
            foreach ($candidates as $candidate) {
                if (file_exists($candidate)) {
                    $envConfig = require $candidate;
                    break;
                }
            }

            $driver = $envConfig['DB_DRIVER'] ?? getenv('DB_DRIVER') ?: 'mysql';
            $sqliteCandidates = [
                $envConfig['DB_SQLITE_PATH'] ?? null,
                getenv('DB_SQLITE_PATH') ?: null,
                __DIR__ . '/lms.sqlite',
                __DIR__ . '/../lms.sqlite',
                __DIR__ . '/../../database/lms.sqlite',
                dirname(__DIR__, 2) . '/database/lms.sqlite',
            ];
            $resolvedSqlite = null;
            foreach ($sqliteCandidates as $cand) {
                if (!empty($cand) && file_exists($cand)) {
                    $resolvedSqlite = $cand;
                    break;
                }
            }
            $sqlitePath = $resolvedSqlite ?: (__DIR__ . '/lms.sqlite');

            if ($driver === 'sqlite' || (!empty($resolvedSqlite) && $driver !== 'mysql')) {
                try {
                    self::$pdo = new PDO("sqlite:{$resolvedSqlite}", null, null, [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    ]);
                    self::$pdo->exec("PRAGMA foreign_keys = ON;");
                    return self::$pdo;
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'SQLite database connection failed: ' . $e->getMessage()
                    ]);
                    exit;
                }
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
            ];

            try {
                self::$pdo = new PDO($dsn, $username, $password, $options);
                self::$pdo->exec("SET NAMES {$charset} COLLATE utf8mb4_unicode_ci");
            } catch (PDOException $e) {
                // If local sqlite file exists, seamlessly fallback to maintain 100% operational uptime
                if ($resolvedSqlite && file_exists($resolvedSqlite)) {
                    try {
                        self::$pdo = new PDO("sqlite:{$resolvedSqlite}", null, null, [
                            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        ]);
                        self::$pdo->exec("PRAGMA foreign_keys = ON;");
                        return self::$pdo;
                    } catch (PDOException $sqle) {}
                }

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

    public static function setConnection(?PDO $pdo): void {
        self::$pdo = $pdo;
    }
}
