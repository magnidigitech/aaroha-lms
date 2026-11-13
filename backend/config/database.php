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

                // Auto-provision MySQL schema & seeds if database is empty
                try {
                    $tableCheck = self::$pdo->query("SHOW TABLES LIKE 'courses'")->fetch();
                    if (!$tableCheck) {
                        $schemaFiles = [
                            __DIR__ . '/schema.sql',
                            __DIR__ . '/../../database/schema.sql',
                            dirname(__DIR__, 2) . '/database/schema.sql'
                        ];
                        $seedFiles = [
                            __DIR__ . '/seeds_dev.sql',
                            __DIR__ . '/../../database/seeds_dev.sql',
                            dirname(__DIR__, 2) . '/database/seeds_dev.sql'
                        ];
                        foreach ($schemaFiles as $sf) {
                            if (file_exists($sf)) {
                                self::$pdo->exec(file_get_contents($sf));
                                break;
                            }
                        }
                        foreach ($seedFiles as $sf) {
                            if (file_exists($sf)) {
                                self::$pdo->exec(file_get_contents($sf));
                                break;
                            }
                        }
                    } else {
                        // Non-destructive column migrations for courses
                        try {
                            $cols = self::$pdo->query("SHOW COLUMNS FROM courses")->fetchAll(PDO::FETCH_COLUMN);
                            $colSet = array_flip($cols);
                            if (!isset($colSet['prerequisites'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN prerequisites TEXT NULL");
                            }
                            if (!isset($colSet['about'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN about TEXT NULL");
                            }
                            if (!isset($colSet['instructor_name'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_name VARCHAR(150) NULL");
                            }
                            if (!isset($colSet['instructor_title'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_title VARCHAR(150) NULL");
                            }
                            if (!isset($colSet['instructor_department'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_department VARCHAR(150) NULL");
                            }
                            if (!isset($colSet['instructor_bio'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_bio TEXT NULL");
                            }
                            if (!isset($colSet['instructor_avatar'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_avatar VARCHAR(500) NULL");
                            }

                            // Non-destructive table creation for certificates
                            self::$pdo->exec("CREATE TABLE IF NOT EXISTS certificates (
                                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                certificate_code VARCHAR(100) NOT NULL UNIQUE,
                                course_id INT UNSIGNED NOT NULL,
                                user_id INT UNSIGNED NULL,
                                recipient_name VARCHAR(200) NOT NULL,
                                recipient_email VARCHAR(200) NULL,
                                course_title VARCHAR(255) NOT NULL,
                                issuer_id INT UNSIGNED NULL,
                                issuer_name VARCHAR(200) NOT NULL,
                                issuer_title VARCHAR(200) NULL,
                                grade VARCHAR(150) NOT NULL DEFAULT 'Verified Completion',
                                issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )");
                        } catch (Exception $colErr) {}
                    }
                } catch (Exception $initErr) {}
            } catch (PDOException $e) {
                // If local sqlite file exists, seamlessly fallback to maintain 100% operational uptime
                if ($resolvedSqlite && file_exists($resolvedSqlite)) {
                    try {
                        self::$pdo = new PDO("sqlite:{$resolvedSqlite}", null, null, [
                            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        ]);
                        self::$pdo->exec("PRAGMA foreign_keys = ON;");
                        self::$pdo->exec("CREATE TABLE IF NOT EXISTS certificates (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            certificate_code TEXT NOT NULL UNIQUE,
                            course_id INTEGER NOT NULL,
                            user_id INTEGER NULL,
                            recipient_name TEXT NOT NULL,
                            recipient_email TEXT NULL,
                            course_title TEXT NOT NULL,
                            issuer_id INTEGER NULL,
                            issuer_name TEXT NOT NULL,
                            issuer_title TEXT NULL,
                            grade TEXT NOT NULL DEFAULT 'Verified Completion',
                            issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );");
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
