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

                // Auto-provision MySQL schema & seeds for missing tables
                try {
                    $existingTables = self::$pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN) ?: [];
                    $requiredTables = ['courses', 'users', 'student_profiles', 'faculty_profiles', 'batches', 'batch_enrollments', 'enrollments'];
                    $missingTables = array_diff($requiredTables, $existingTables);

                    if (!empty($missingTables)) {
                        $schemaFiles = [
                            __DIR__ . '/schema.sql',
                            __DIR__ . '/../../database/schema.sql',
                            dirname(__DIR__, 2) . '/database/schema.sql'
                        ];
                        foreach ($schemaFiles as $sf) {
                            if (file_exists($sf)) {
                                $sql = file_get_contents($sf);
                                $stmts = array_filter(array_map('trim', explode(';', $sql)));
                                foreach ($stmts as $stmt) {
                                    if ($stmt) {
                                        try { self::$pdo->exec($stmt); } catch (Exception $e) {}
                                    }
                                }
                                break;
                            }
                        }
                    }

                    // Ensure baseline seed accounts (Admin, Faculty, Student) exist if users table is empty
                    try {
                        $userCount = (int)self::$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
                        if ($userCount === 0) {
                            $seedFiles = [
                                __DIR__ . '/seeds_dev.sql',
                                __DIR__ . '/../../database/seeds_dev.sql',
                                dirname(__DIR__, 2) . '/database/seeds_dev.sql'
                            ];
                            foreach ($seedFiles as $sf) {
                                if (file_exists($sf)) {
                                    $sql = file_get_contents($sf);
                                    $stmts = array_filter(array_map('trim', explode(';', $sql)));
                                    foreach ($stmts as $stmt) {
                                        if ($stmt) {
                                            try { self::$pdo->exec($stmt); } catch (Exception $e) {}
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    } catch (Exception $seedErr) {}
                } catch (Exception $initErr) {}
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
                            if (!isset($colSet['access_duration_type'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN access_duration_type VARCHAR(50) DEFAULT 'lifetime'");
                            }
                            if (!isset($colSet['access_duration_value'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN access_duration_value INT UNSIGNED DEFAULT 0");
                            }
                            if (!isset($colSet['access_duration_unit'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN access_duration_unit VARCHAR(50) DEFAULT 'months'");
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

                            // Self-heal: ensure image and avatar columns can hold full base64 data URIs
                            @self::$pdo->exec("ALTER TABLE courses MODIFY COLUMN thumbnail_url LONGTEXT NULL");
                            @self::$pdo->exec("ALTER TABLE courses MODIFY COLUMN instructor_avatar LONGTEXT NULL");

                            // Non-destructive column migrations for users (Profile & Preferences)
                            try {
                                $userCols = self::$pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
                                $userColSet = array_flip($userCols);
                                if (!isset($userColSet['display_name'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN display_name VARCHAR(120) NULL");
                                }
                                if (!isset($userColSet['phone'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL");
                                }
                                if (!isset($userColSet['timezone'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN timezone VARCHAR(100) DEFAULT 'Asia/Kolkata'");
                                }
                                if (!isset($userColSet['preferred_language'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN preferred_language VARCHAR(20) DEFAULT 'en'");
                                }
                                if (!isset($userColSet['notification_preferences_json'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN notification_preferences_json LONGTEXT NULL");
                                }
                                if (!isset($userColSet['security_settings_json'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN security_settings_json LONGTEXT NULL");
                                }
                                if (!isset($userColSet['authorized_roles_json'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN authorized_roles_json LONGTEXT NULL");
                                }
                                if (!isset($userColSet['status'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'");
                                }
                                if (!isset($userColSet['is_archived'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN is_archived TINYINT(1) DEFAULT 0");
                                }
                                if (!isset($userColSet['deleted_at'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL");
                                }
                                if (!isset($userColSet['archived_at'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN archived_at DATETIME NULL");
                                }
                                if (!isset($userColSet['archival_reason'])) {
                                    self::$pdo->exec("ALTER TABLE users ADD COLUMN archival_reason TEXT NULL");
                                }
                            } catch (Exception $uErr) {}

                            // Non-destructive column migrations for student_profiles
                            try {
                                $spCheck = self::$pdo->query("SHOW TABLES LIKE 'student_profiles'")->fetch();
                                if ($spCheck) {
                                    $stuCols = self::$pdo->query("SHOW COLUMNS FROM student_profiles")->fetchAll(PDO::FETCH_COLUMN);
                                    $stuColSet = array_flip($stuCols);
                                    if (!isset($stuColSet['skills'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN skills TEXT NULL");
                                    }
                                    if (!isset($stuColSet['career_interests'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN career_interests TEXT NULL");
                                    }
                                    if (!isset($stuColSet['resume_url'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN resume_url VARCHAR(500) NULL");
                                    }
                                    if (!isset($stuColSet['portfolio_url'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN portfolio_url VARCHAR(500) NULL");
                                    }
                                    if (!isset($stuColSet['github_url'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN github_url VARCHAR(500) NULL");
                                    }
                                    if (!isset($stuColSet['work_experience'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN work_experience TEXT NULL");
                                    }
                                    if (!isset($stuColSet['experience_years'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN experience_years VARCHAR(50) NULL");
                                    }
                                    if (!isset($stuColSet['account_status'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN account_status VARCHAR(50) DEFAULT 'active'");
                                    }
                                    if (!isset($stuColSet['admission_status'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN admission_status VARCHAR(50) DEFAULT 'enrolled'");
                                    }
                                    if (!isset($stuColSet['enrollment_status'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN enrollment_status VARCHAR(50) DEFAULT 'active'");
                                    }
                                    if (!isset($stuColSet['payment_status'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN payment_status VARCHAR(50) DEFAULT 'paid'");
                                    }
                                    if (!isset($stuColSet['archived_at'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN archived_at DATETIME NULL");
                                    }
                                    if (!isset($stuColSet['archival_reason'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN archival_reason TEXT NULL");
                                    }
                                    if (!isset($stuColSet['archived_enrolment_resolution'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN archived_enrolment_resolution VARCHAR(50) NULL");
                                    }
                                    if (!isset($stuColSet['withdrawn_at'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN withdrawn_at DATETIME NULL");
                                    }
                                    if (!isset($stuColSet['withdrawal_reason'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN withdrawal_reason TEXT NULL");
                                    }
                                    if (!isset($stuColSet['coordinator_id'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN coordinator_id INT UNSIGNED NULL");
                                    }
                                    if (!isset($stuColSet['internal_notes'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN internal_notes TEXT NULL");
                                    }
                                    if (!isset($stuColSet['invitation_token'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN invitation_token VARCHAR(100) NULL");
                                    }
                                    if (!isset($stuColSet['invitation_expires_at'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN invitation_expires_at DATETIME NULL");
                                    }
                                    if (!isset($stuColSet['invitation_accepted_at'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN invitation_accepted_at DATETIME NULL");
                                    }
                                    if (!isset($stuColSet['suspension_reason'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN suspension_reason TEXT NULL");
                                    }
                                    if (!isset($stuColSet['suspension_end_date'])) {
                                        self::$pdo->exec("ALTER TABLE student_profiles ADD COLUMN suspension_end_date DATETIME NULL");
                                    }
                                    try {
                                        self::$pdo->exec("ALTER TABLE student_profiles MODIFY COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid'");
                                    } catch (Exception $e) {}
                                }
                            } catch (Exception $spErr) {}

                            // Non-destructive column migrations for faculty_profiles
                            try {
                                $fpCheck = self::$pdo->query("SHOW TABLES LIKE 'faculty_profiles'")->fetch();
                                if ($fpCheck) {
                                    $facCols = self::$pdo->query("SHOW COLUMNS FROM faculty_profiles")->fetchAll(PDO::FETCH_COLUMN);
                                    $facColSet = array_flip($facCols);
                                    if (!isset($facColSet['bio'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN bio TEXT NULL");
                                    }
                                    if (!isset($facColSet['qualifications'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN qualifications TEXT NULL");
                                    }
                                    if (!isset($facColSet['expertise'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN expertise TEXT NULL");
                                    }
                                    if (!isset($facColSet['experience_years'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN experience_years VARCHAR(50) NULL");
                                    }
                                    if (!isset($facColSet['professional_links_json'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN professional_links_json LONGTEXT NULL");
                                    }
                                    if (!isset($facColSet['availability_json'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN availability_json LONGTEXT NULL");
                                    }
                                    if (!isset($facColSet['account_status'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN account_status VARCHAR(50) DEFAULT 'active'");
                                    }
                                    if (!isset($facColSet['archived_at'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN archived_at DATETIME NULL");
                                    }
                                    if (!isset($facColSet['archival_reason'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN archival_reason TEXT NULL");
                                    }
                                    if (!isset($facColSet['reassignment_notes'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN reassignment_notes TEXT NULL");
                                    }
                                    if (!isset($facColSet['invitation_token'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN invitation_token VARCHAR(100) NULL");
                                    }
                                    if (!isset($facColSet['invitation_expires_at'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN invitation_expires_at DATETIME NULL");
                                    }
                                    if (!isset($facColSet['invitation_accepted_at'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN invitation_accepted_at DATETIME NULL");
                                    }
                                    if (!isset($facColSet['suspension_reason'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN suspension_reason TEXT NULL");
                                    }
                                    if (!isset($facColSet['suspension_end_date'])) {
                                        self::$pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN suspension_end_date DATETIME NULL");
                                    }
                                }
                            } catch (Exception $fpErr) {}

                            // Non-destructive column migrations for batches
                            try {
                                $bCheck = self::$pdo->query("SHOW TABLES LIKE 'batches'")->fetch();
                                if ($bCheck) {
                                    $bCols = self::$pdo->query("SHOW COLUMNS FROM batches")->fetchAll(PDO::FETCH_COLUMN);
                                    $bColSet = array_flip($bCols);
                                    if (!isset($bColSet['archived_at'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN archived_at DATETIME NULL");
                                    }
                                    if (!isset($bColSet['archival_reason'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN archival_reason TEXT NULL");
                                    }
                                    if (!isset($bColSet['is_archived'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN is_archived TINYINT(1) DEFAULT 0");
                                    }
                                    if (!isset($bColSet['deleted_at'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN deleted_at DATETIME NULL");
                                    }
                                    if (!isset($bColSet['lead_faculty_id'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN lead_faculty_id INT UNSIGNED NULL");
                                    }
                                    if (!isset($bColSet['coordinator_id'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN coordinator_id INT UNSIGNED NULL");
                                    }
                                    if (!isset($bColSet['capacity'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN capacity INT UNSIGNED NOT NULL DEFAULT 30");
                                    }
                                    if (!isset($bColSet['delivery_mode'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN delivery_mode VARCHAR(50) NOT NULL DEFAULT 'Online Live'");
                                    }
                                    if (!isset($bColSet['timezone'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata'");
                                    }
                                    if (!isset($bColSet['is_deleted'])) {
                                        self::$pdo->exec("ALTER TABLE batches ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0");
                                    }
                                }
                            } catch (Exception $bErr) {}

                            // Non-destructive synchronization for faculty profiles and teaching staff
                            try {
                                $fpCheck = self::$pdo->query("SHOW TABLES LIKE 'faculty_profiles'")->fetch();
                                if ($fpCheck) {
                                    // Ensure core faculty profiles exist for teaching staff
                                    // 1. Dr. Aris Thorne (user_id = 1)
                                    $hasFp1 = (int)self::$pdo->query("SELECT COUNT(*) FROM faculty_profiles WHERE user_id = 1")->fetchColumn();
                                    if ($hasFp1 === 0) {
                                        self::$pdo->exec("INSERT INTO faculty_profiles (user_id, faculty_id_code, mobile, expertise, account_status) VALUES (1, 'FAC-001', '+91 98111 22233', 'Distributed Systems, Cloud Architecture', 'active')");
                                    }
                                    // 2. Professor Test (user_id = 4)
                                    self::$pdo->exec("UPDATE users SET is_archived = 0, status = 'active', role = 'faculty' WHERE id = 4");
                                    $hasFp4 = (int)self::$pdo->query("SELECT COUNT(*) FROM faculty_profiles WHERE user_id = 4")->fetchColumn();
                                    if ($hasFp4 === 0) {
                                        self::$pdo->exec("INSERT INTO faculty_profiles (user_id, faculty_id_code, mobile, expertise, account_status) VALUES (4, 'FAC-004', '+91 98111 44455', 'Cloud Native Systems & Kubernetes', 'active')");
                                    }
                                    // 3. Elena Rostova (user_id = 2)
                                    $hasFp2 = (int)self::$pdo->query("SELECT COUNT(*) FROM faculty_profiles WHERE user_id = 2")->fetchColumn();
                                    if ($hasFp2 === 0) {
                                        self::$pdo->exec("INSERT INTO faculty_profiles (user_id, faculty_id_code, mobile, expertise, account_status) VALUES (2, 'FAC-002', '+91 98111 33344', 'Applied AI & Neural Engineering', 'active')");
                                    }
                                }
                            } catch (Exception $fpErr) {}

                            // Non-destructive column migrations for enrollments
                            try {
                                $enrCheck = self::$pdo->query("SHOW TABLES LIKE 'enrollments'")->fetch();
                                if ($enrCheck) {
                                    $enrCols = self::$pdo->query("SHOW COLUMNS FROM enrollments")->fetchAll(PDO::FETCH_COLUMN);
                                    $enrColSet = array_flip($enrCols);
                                    if (!isset($enrColSet['batch_id'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN batch_id INT UNSIGNED NULL");
                                    }
                                    if (!isset($enrColSet['access_start_at'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN access_start_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
                                    }
                                    if (!isset($enrColSet['expires_at'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL");
                                    }
                                    if (!isset($enrColSet['access_duration_applied'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN access_duration_applied VARCHAR(50) NOT NULL DEFAULT '6 Months'");
                                    }
                                    if (!isset($enrColSet['access_status'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN access_status VARCHAR(50) NOT NULL DEFAULT 'active'");
                                    }
                                    if (!isset($enrColSet['withdrawal_reason'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN withdrawal_reason TEXT NULL");
                                    }
                                    if (!isset($enrColSet['withdrawn_at'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN withdrawn_at DATETIME NULL");
                                    }
                                    if (!isset($enrColSet['extension_history'])) {
                                        self::$pdo->exec("ALTER TABLE enrollments ADD COLUMN extension_history LONGTEXT NULL");
                                    }
                                }
                            } catch (Exception $enrErr) {}

                            // Non-destructive table and column migrations for uploaded_files
                            try {
                                self::$pdo->exec("CREATE TABLE IF NOT EXISTS uploaded_files (
                                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                    file_key VARCHAR(191) NULL,
                                    storage_key VARCHAR(191) NULL,
                                    original_filename VARCHAR(255) NULL,
                                    filename VARCHAR(255) NULL,
                                    mime_type VARCHAR(100) NOT NULL,
                                    file_size BIGINT UNSIGNED NOT NULL,
                                    category VARCHAR(50) NOT NULL,
                                    visibility VARCHAR(50) NOT NULL DEFAULT 'private',
                                    is_public TINYINT(1) NOT NULL DEFAULT 0,
                                    storage_path TEXT NOT NULL,
                                    uploaded_by INT UNSIGNED NULL,
                                    uploader_user_id INT UNSIGNED NULL,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    INDEX idx_uf_fkey (file_key),
                                    INDEX idx_uf_skey (storage_key),
                                    INDEX idx_uf_category (category)
                                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

                                $ufCols = self::$pdo->query("SHOW COLUMNS FROM uploaded_files")->fetchAll(PDO::FETCH_COLUMN);
                                $ufColSet = array_flip($ufCols);
                                if (!isset($ufColSet['storage_key'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN storage_key VARCHAR(191) NULL");
                                }
                                if (!isset($ufColSet['file_key'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN file_key VARCHAR(191) NULL");
                                }
                                if (!isset($ufColSet['filename'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN filename VARCHAR(255) NULL");
                                }
                                if (!isset($ufColSet['original_filename'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN original_filename VARCHAR(255) NULL");
                                }
                                if (!isset($ufColSet['is_public'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0");
                                }
                                if (!isset($ufColSet['visibility'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN visibility VARCHAR(50) NOT NULL DEFAULT 'private'");
                                }
                                if (!isset($ufColSet['uploader_user_id'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN uploader_user_id INT UNSIGNED NULL");
                                }
                                if (!isset($ufColSet['uploaded_by'])) {
                                    self::$pdo->exec("ALTER TABLE uploaded_files ADD COLUMN uploaded_by INT UNSIGNED NULL");
                                }
                            } catch (Exception $ufErr) {}

                            // Ensure audit_logs table exists
                            try {
                                self::$pdo->exec("CREATE TABLE IF NOT EXISTS audit_logs (
                                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                    user_id INT UNSIGNED NULL,
                                    user_email VARCHAR(191) NULL,
                                    user_role VARCHAR(50) NULL,
                                    action VARCHAR(100) NOT NULL,
                                    entity_type VARCHAR(50) NOT NULL,
                                    entity_id VARCHAR(50) NULL,
                                    details_json LONGTEXT NULL,
                                    ip_address VARCHAR(50) NULL,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                            } catch (Exception $audErr) {}

                            // Ensure faculty_batch_assignments table exists
                            try {
                                self::$pdo->exec("CREATE TABLE IF NOT EXISTS faculty_batch_assignments (
                                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                    faculty_id INT UNSIGNED NOT NULL,
                                    batch_id INT UNSIGNED NOT NULL,
                                    role VARCHAR(50) NOT NULL DEFAULT 'co_faculty',
                                    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    INDEX idx_fba_fac (faculty_id),
                                    INDEX idx_fba_batch (batch_id)
                                )");
                            } catch (Exception $fbaErr) {}

                            // Create degrees table
                            self::$pdo->exec("CREATE TABLE IF NOT EXISTS degrees (
                                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                title VARCHAR(255) NOT NULL,
                                slug VARCHAR(255) NOT NULL UNIQUE,
                                degree_type VARCHAR(100) NOT NULL,
                                duration VARCHAR(100) NOT NULL,
                                level VARCHAR(100) NOT NULL,
                                accreditation VARCHAR(255) NOT NULL,
                                course_id INT UNSIGNED NULL,
                                faculty_name VARCHAR(200) NOT NULL,
                                faculty_title VARCHAR(200) NULL,
                                faculty_avatar LONGTEXT NULL,
                                description TEXT NOT NULL,
                                modules_count VARCHAR(100) NULL,
                                evaluated_projects_count VARCHAR(100) NULL,
                                credential_awarded VARCHAR(255) NULL,
                                skills LONGTEXT NULL,
                                highlights LONGTEXT NULL,
                                is_published TINYINT(1) DEFAULT 1,
                                is_deleted TINYINT(1) DEFAULT 0,
                                created_by INT UNSIGNED NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )");

                            // Seed Core Degrees 1, 2, 3 if empty
                            $degCount = (int)self::$pdo->query("SELECT COUNT(*) FROM degrees WHERE is_deleted = 0")->fetchColumn();
                            if ($degCount === 0) {
                                $stmtDeg = self::$pdo->prepare("
                                    INSERT INTO degrees 
                                    (id, title, slug, degree_type, duration, level, accreditation, course_id, faculty_name, faculty_title, faculty_avatar, description, modules_count, evaluated_projects_count, credential_awarded, skills, highlights, is_published, is_deleted, created_by)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1)
                                ");
                                $stmtDeg->execute([
                                    1,
                                    'Master of Science in Distributed Cloud Architecture & High-Throughput Systems',
                                    'distributed-cloud-architecture',
                                    'Master of Science (M.S. Equivalent)',
                                    '12 Months · 36 ECTS Credits',
                                    'Graduate / Principal Level',
                                    'Aaroha Institute of Technology & Systems Directorate',
                                    1,
                                    'Faculty Member',
                                    'Chair of Distributed Infrastructure',
                                    '/avatars/3d/memo_1.png',
                                    'An advanced graduate curriculum focused on multi-region consensus engines, kernel-bypass networking, Raft leader election invariants, and LSM-tree storage internals sustaining 100k+ QPS with strict P99 latency budgets.',
                                    '3 In-Depth Specialization Semesters',
                                    '3 Production RFC Architectural Defenses',
                                    'Official Master of Science Degree & Accredited Parchment',
                                    json_encode(['Raft Consensus Protocol', 'BGP Anycast Edge Routing', 'LSM Storage Compaction (RocksDB)', 'Zero-Trust mTLS Architecture', 'Transactional Outbox & CDC']),
                                    json_encode(['100% online with asynchronous laboratory benchmarks', 'Mandatory evaluated capstone evaluated by systems faculty', 'Permanent verifiable cryptographic degree credential on graduation'])
                                ]);
                                $stmtDeg->execute([
                                    2,
                                    'Master of Engineering in Applied Machine Learning & Model Serving Infrastructure',
                                    'applied-ml-engineering',
                                    'Master of Engineering (M.Eng. Equivalent)',
                                    '10 Months · 32 ECTS Credits',
                                    'Graduate / Staff ML Engineer',
                                    'Accelerated Computing Directorate, Aaroha Institute',
                                    2,
                                    'Faculty Member',
                                    'ML Systems Engineer & Faculty Chair',
                                    '/avatars/3d/memo_3.png',
                                    'Bridging the gap between neural weights and production GPU runtimes. Specialize in low-latency transformer inference, continuous request batching, INT8/AWQ quantization, and Triton model serving.',
                                    '2 Core Semesters + Accelerated Lab',
                                    '2 Evaluated GPU Throughput Benchmarks',
                                    'Master of Engineering in Applied ML Systems',
                                    json_encode(['vLLM & Continuous Batching', 'AWQ & GPTQ Quantization', 'Triton Multi-Model Inference', 'CUDA Memory Bounds', 'Concept Drift Telemetry']),
                                    json_encode(['Hands-on profiling with production GPU execution graphs', 'Faculty evaluation of sub-50ms P99 inference SLAs', 'Dual-accreditation with industry systems laboratories'])
                                ]);
                                $stmtDeg->execute([
                                    3,
                                    'Post-Graduate Diploma in Enterprise Cyber Defense & Zero-Trust Architecture',
                                    'enterprise-cyber-defense',
                                    'Post-Graduate Diploma (P.G. Dip)',
                                    '8 Months · 24 ECTS Credits',
                                    'Advanced Specialist',
                                    'Center for Cyber Resilience, Aaroha Institute',
                                    3,
                                    'Faculty Member',
                                    'Security Architect & Red Team Fellow',
                                    '/avatars/3d/memo_14.png',
                                    'Master application defense, supply-chain attestation, memory safety transitions, and real-time incident triage using eBPF kernel telemetry, SLSA Level 3 attestations, and STRIDE threat modeling.',
                                    '2 Specialist Semesters',
                                    '2 Cryptographic Supply Chain Audits',
                                    'Accredited Post-Graduate Diploma in Cyber Defense',
                                    json_encode(['STRIDE Threat Modeling', 'eBPF Kernel Telemetry', 'Sigstore Cosign Attestations', 'mTLS Identity Mesh (SPIFFE)', 'Zero-Day Incident Forensics']),
                                    json_encode(['Real-world simulated adversary scenarios and red-team defenses', 'Automated admission controller policy authoring (Kyverno)', 'Tamper-evident verification backed by Aaroha Certificate Authority'])
                                ]);
                            }

                            // Ensure Core Course 1 (Distributed Cloud Architecture) is active and provisioned
                            $c1 = self::$pdo->query("SELECT id, is_deleted, is_published FROM courses WHERE id = 1")->fetch();
                            if (!$c1) {
                                self::$pdo->exec("INSERT INTO courses (id, title, slug, category, level, duration, partner_type, rating, reviews_count, badge_text, description, thumbnail_url, skills, what_you_will_learn, is_published, is_deleted, created_by) VALUES
                                (1, 'Distributed Cloud Architecture & High-Throughput Systems', 'distributed-cloud-architecture', 'Cloud Architecture', 'Advanced Level', '8 Weeks', 'Specialization', 4.90, '2.8K', 'Recently updated', 'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets, Raft consensus, and transactional integrity.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', '[\"Distributed Systems\", \"Raft Consensus Protocol\", \"BGP Anycast Routing\", \"mTLS & Zero-Trust\", \"Storage Engines (LSM & B-Trees)\", \"Kafka & CDC Event Streaming\"]', '[\"Architect zero-trust multi-region ingress gateways utilizing Anycast BGP and Envoy proxy mesh routing\", \"Implement fault-tolerant distributed state machines using Raft consensus and split-brain mitigation invariants\", \"Tune write-heavy storage engines by comparing Log-Structured Merge (LSM) trees with InnoDB B+Trees\", \"Eliminate dual-write vulnerabilities with Change Data Capture (CDC) pipelines and transactional outbox patterns\"]', 1, 0, 1)");
                            } elseif ((int)$c1['is_deleted'] === 1 || (int)$c1['is_published'] === 0) {
                                self::$pdo->exec("UPDATE courses SET is_deleted = 0, is_published = 1 WHERE id = 1");
                            }

                            // Ensure Modules 101, 102, 103 for Course 1
                            $m101 = self::$pdo->query("SELECT id FROM modules WHERE id = 101")->fetch();
                            if (!$m101) {
                                self::$pdo->exec("INSERT INTO modules (id, course_id, title, estimated_time, description, sequence_order, is_deleted) VALUES
                                (101, 1, 'Module 1: Global Edge Routing & Zero-Trust Boundaries', '5 hours to complete', 'Explore ingress topology, Anycast BGP routing, and mTLS cryptography inside production Kubernetes clusters.', 1, 0),
                                (102, 1, 'Module 2: Distributed Consensus & State Storage', '6 hours to complete', 'Master Raft leader election, commit log safety, and high-performance LSM storage engine compaction.', 2, 0),
                                (103, 1, 'Module 3: Event Sourcing & High-Throughput Streaming', '5 hours to complete', 'Build change-data-capture pipelines and Kafka stream processors for guaranteed delivery semantics.', 3, 0)");
                            } else {
                                self::$pdo->exec("UPDATE modules SET is_deleted = 0 WHERE id IN (101, 102, 103)");
                            }

                            // Ensure Lessons 1001-1005 for Course 1
                            $l1001 = self::$pdo->query("SELECT id FROM lessons WHERE id = 1001")->fetch();
                            if (!$l1001) {
                                self::$pdo->exec("INSERT INTO lessons (id, module_id, title, content_type, video_provider, duration, content_body, media_url, sequence_order, is_free_preview, is_published, is_deleted) VALUES
                                (1001, 101, 'Multi-Region Anycast Topology & BGP Ingress Routing', 'video', 'youtube', '22 min', 'An in-depth analysis of global edge ingress networks. We evaluate how Anycast DNS and BGP route optimization direct user packets to the nearest Point of Presence (PoP), mitigating latency before requests reach internal mesh clusters. We examine real packet capture profiles and failure mode recovery when an undersea transit link experiences degradation.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1, 1, 0),
                                (1002, 101, 'Mutual TLS (mTLS) & Ephemeral Identity in Microservices', 'article', NULL, '14 min read', 'Perimeter-only security models fail once an adversary establishes lateral mobility inside your cluster. In this lesson, we specify zero-trust service-to-service communication using SPIFFE/SPIRE identity standards. We examine x509 certificate rotation pipelines, hardware security module (HSM) key isolation, and how Envoy sidecars negotiate cryptographic handshakes without introducing CPU bottlenecks.', NULL, 2, 0, 1, 0),
                                (1003, 102, 'Raft Consensus Protocol & Split-Brain Mitigation', 'video', 'youtube', '28 min', 'Stateful services require unambiguous truth. We unpack the Raft consensus algorithm: leader election, log replication, safety invariants, and commit index advancement. We inspect how network partitions induce partitioned quorums and why strict majority voting guarantees no two nodes can commit contradictory log entries.', 'https://www.youtube.com/embed/R2-9sDYtOt4', 1, 0, 1, 0),
                                (1004, 102, 'LSM Trees vs B-Trees in Modern Storage Engines', 'article', NULL, '18 min read', 'Choosing between Log-Structured Merge (LSM) trees (RocksDB, Cassandra) and traditional B+Trees (InnoDB, PostgreSQL) dictates write amplification and read amplification. We examine memtable flushes, write-ahead logs (WAL), Bloom filter tuning, and tiered compaction strategies under sustained write pressures.', NULL, 2, 0, 1, 0),
                                (1005, 103, 'Transactional Outbox Pattern & CDC Stream Pipelines', 'article', NULL, '16 min read', 'Dual-write operations between a relational database and a message broker are vulnerable to split-second failures that cause data inconsistency. We implement the Transactional Outbox Pattern using Change Data Capture (CDC) via Debezium and Kafka, guaranteeing at-least-once message delivery with exactly-once consumer semantics.', NULL, 1, 0, 1, 0)");
                            } else {
                                self::$pdo->exec("UPDATE lessons SET is_deleted = 0, is_published = 1 WHERE id IN (1001, 1002, 1003, 1004, 1005)");
                            }

                            // Ensure Tasks 2001-2003 for Course 1
                            $t2001 = self::$pdo->query("SELECT id FROM tasks WHERE id = 2001")->fetch();
                            if (!$t2001) {
                                self::$pdo->exec("INSERT INTO tasks (id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory, is_deleted) VALUES
                                (2001, 101, 'Assignment 1: Ingress Gateway Resiliency & Failover Specification', 'Draft an architectural RFC detailing a dual-region active-active ingress routing plan. Specify: 1) Health check probe frequencies and dead-man switches; 2) State synchronization strategy for TLS session resumption tickets; 3) Circuit breaking rules to prevent cascading brownouts during regional evacuation.', 'text_response', 100, 75, 1, 0),
                                (2002, 102, 'Assignment 2: Database Partitioning & Benchmark Artifact', 'Submit your benchmark repository link or technical report demonstrating a sharded database cluster with composite partition keys. Include P95/P99 latency measurements under a simulated 20,000 write ops/sec load profile.', 'file_upload', 100, 80, 1, 0),
                                (2003, 103, 'Assignment 3: Capstone Distributed Architecture Defense', 'Synthesize Modules 1, 2, and 3 into a comprehensive architectural defense. Defend your choice of storage engines, consensus mechanisms, and egress rate limits against an unpredictable 10x traffic spike.', 'text_response', 100, 80, 1, 0)");
                            } else {
                                self::$pdo->exec("UPDATE tasks SET is_deleted = 0 WHERE id IN (2001, 2002, 2003)");
                            }
                        } catch (Exception $colErr) {}
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

if (!function_exists('getDBConnection')) {
    function getDBConnection(): PDO {
        return Database::getConnection();
    }
}
