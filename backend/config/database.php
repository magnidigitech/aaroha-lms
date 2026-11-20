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

            if ($driver === 'sqlite' || (!empty($resolvedSqlite) && empty($envConfig['DB_HOST']) && empty(getenv('DB_HOST')))) {
                try {
                    self::$pdo = new PDO("sqlite:{$resolvedSqlite}", null, null, [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    ]);
                    self::$pdo->exec("PRAGMA foreign_keys = ON;");
                    self::ensureSqliteSchema(self::$pdo);
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

                // Self-healing schema migrations for lifecycle columns
                try { @self::$pdo->exec("ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL"); } catch (Exception $e) {}
                try { @self::$pdo->exec("ALTER TABLE users ADD COLUMN deactivation_reason TEXT NULL"); } catch (Exception $e) {}

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

                    // Ensure baseline administrator exists if users table is empty
                    try {
                        $userCount = (int)self::$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
                        if ($userCount === 0) {
                            $pw = password_hash('password123', PASSWORD_BCRYPT, ['cost' => 12]);
                            $adminStmt = self::$pdo->prepare("INSERT INTO users (id, full_name, email, password_hash, role, title, avatar, status, is_archived, authorized_roles_json) VALUES (1, 'Aaroha Admin', 'admin@aaroha-inc.com', ?, 'super_admin', 'System Administrator', '/avatars/3d/memo_1.png', 'active', 0, '[\"super_admin\",\"admin\"]')");
                            $adminStmt->execute([$pw]);
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
                            if (!isset($colSet['badge_color'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN badge_color VARCHAR(30) NULL DEFAULT NULL");
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
                                    try {
                                        self::$pdo->exec("ALTER TABLE batches MODIFY COLUMN delivery_mode VARCHAR(50) NOT NULL DEFAULT 'Online Live'");
                                        self::$pdo->exec("ALTER TABLE batches MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'upcoming'");
                                        self::$pdo->exec("ALTER TABLE batches MODIFY COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0");
                                        self::$pdo->exec("ALTER TABLE batches MODIFY COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0");
                                        self::$pdo->exec("UPDATE batches SET is_deleted = 0 WHERE is_deleted IS NULL");
                                        self::$pdo->exec("UPDATE batches SET is_archived = 0 WHERE is_archived IS NULL");
                                        self::$pdo->exec("UPDATE batches SET status = 'upcoming' WHERE status IS NULL OR status = ''");
                                    } catch (Exception $e) {}
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

                            // Comprehensive purge of dummy data across ALL sections
                            try {
                                // 1. Purge dummy courses, modules, lessons, tasks
                                self::$pdo->exec("DELETE FROM task_submissions WHERE task_id IN (2001, 2002, 2003, 3001, 4001) OR task_id IN (SELECT id FROM tasks WHERE module_id IN (101, 102, 103, 201, 202, 301))");
                                self::$pdo->exec("DELETE FROM tasks WHERE id IN (2001, 2002, 2003, 3001, 4001) OR title LIKE '%Ingress Gateway%' OR title LIKE '%Distributed State Machine%' OR title LIKE '%Database Partitioning%' OR title LIKE '%Capstone Distributed Architecture%'");
                                self::$pdo->exec("DELETE FROM lesson_progress WHERE lesson_id IN (1001, 1002, 1003, 1004, 1005, 2001, 2002, 3001) OR lesson_id IN (SELECT id FROM lessons WHERE module_id IN (101, 102, 103, 201, 202, 301))");
                                self::$pdo->exec("DELETE FROM lessons WHERE module_id IN (101, 102, 103, 201, 202, 301) OR id IN (1001, 1002, 1003, 1004, 1005, 2001, 2002, 3001)");
                                self::$pdo->exec("DELETE FROM modules WHERE course_id IN (1, 2, 3) OR id IN (101, 102, 103, 201, 202, 301)");
                                self::$pdo->exec("DELETE FROM courses WHERE id IN (1, 2, 3) OR title LIKE '%Distributed Cloud%' OR title LIKE '%Applied Machine Learning%' OR title LIKE '%Enterprise Cyber Defense%'");

                                // 2. Purge dummy batches and related records
                                self::$pdo->exec("DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM class_sessions WHERE batch_id IN (1, 2, 3, 4, 10))");
                                self::$pdo->exec("DELETE FROM faculty_batch_assignments WHERE batch_id IN (1, 2, 3, 4, 10) OR batch_id NOT IN (SELECT id FROM batches)");
                                self::$pdo->exec("DELETE FROM batch_enrollments WHERE batch_id IN (1, 2, 3, 4, 10) OR batch_id NOT IN (SELECT id FROM batches)");
                                self::$pdo->exec("DELETE FROM class_sessions WHERE batch_id IN (1, 2, 3, 4, 10) OR batch_id NOT IN (SELECT id FROM batches) OR meeting_link LIKE '%xyz-aaroha-lms%' OR meeting_link LIKE '%example.com%' OR meeting_link LIKE '%placeholder%' OR meeting_link LIKE '%dummy%' OR topic LIKE '%Anycast BGP%' OR topic LIKE '%Raft Consensus%' OR topic LIKE '%Triton Server%' OR topic LIKE '%STRIDE Threat%'");
                                self::$pdo->exec("DELETE FROM batches WHERE id IN (1, 2, 3, 4, 10) OR batch_code IN ('DCA-2026-B1', 'DCA-2026-B2', 'AML-2026-B1', 'ECD-2026-B1', 'AWS-2026-B5334') OR is_deleted = 1");

                                // 3. Purge dummy users and profiles (Preserve admin, genuine student ryu@aaroha.in, and test faculty aa@aaroha.in)
                                $dummyEmails = [
                                    'faculty@aaroha-inc.com',
                                    'coordinator@aaroha-inc.com',
                                    'student@aaroha-inc.com',
                                    'placement@aaroha-inc.com',
                                    'priya.sharma@aaroha-inc.com',
                                    'elena.rostova@enterprise.io',
                                    'marcus.vance@aaroha-inc.com',
                                    'aarav.patel@student.aaroha-inc.com',
                                    'sneha.reddy@student.aaroha-inc.com',
                                    'karthik.raman@student.aaroha-inc.com',
                                    'meera.joshi@student.aaroha-inc.com',
                                    'faculty_test@aaroha-inc.com',
                                    'accounts@aaroha-inc.com',
                                    'learner@enterprise.io'
                                ];
                                $inDummy = "'" . implode("','", $dummyEmails) . "'";
                                self::$pdo->exec("DELETE FROM faculty_profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ($inDummy))");
                                self::$pdo->exec("DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ($inDummy))");
                                self::$pdo->exec("DELETE FROM placement_profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ($inDummy))");
                                self::$pdo->exec("DELETE FROM faculty_batch_assignments WHERE faculty_id IN (SELECT id FROM users WHERE email IN ($inDummy))");
                                self::$pdo->exec("DELETE FROM batch_enrollments WHERE user_id IN (SELECT id FROM users WHERE email IN ($inDummy))");
                                self::$pdo->exec("DELETE FROM enrollments WHERE user_id IN (SELECT id FROM users WHERE email IN ($inDummy))");
                                self::$pdo->exec("DELETE FROM attendance_records WHERE user_id IN (SELECT id FROM users WHERE email IN ($inDummy))");
                                self::$pdo->exec("DELETE FROM task_submissions WHERE enrollment_id NOT IN (SELECT id FROM enrollments)");
                                self::$pdo->exec("DELETE FROM users WHERE email IN ($inDummy)");

                                // 4. Clean and fix Administrator account (user 1)
                                self::$pdo->exec("UPDATE users SET full_name = 'Aaroha Admin', title = 'System Administrator', role = 'super_admin' WHERE id = 1 OR email = 'admin@aaroha-inc.com'");
                                self::$pdo->exec("DELETE FROM faculty_profiles WHERE user_id = 1 OR user_id IN (SELECT id FROM users WHERE email = 'admin@aaroha-inc.com')");
                                self::$pdo->exec("DELETE FROM faculty_batch_assignments WHERE faculty_id = 1 OR faculty_id IN (SELECT id FROM users WHERE email = 'admin@aaroha-inc.com')");

                                // 5. Clean dummy degrees, materials, announcements, tickets, placement jobs
                                self::$pdo->exec("DELETE FROM degrees WHERE id IN (1, 2, 3) OR title LIKE '%Distributed Cloud%' OR title LIKE '%Applied AI%'");
                                self::$pdo->exec("DELETE FROM materials WHERE title LIKE '%Cheat Sheet%' OR title LIKE '%Quantization%' OR title LIKE '%Microservices%'");
                                self::$pdo->exec("DELETE FROM announcements WHERE title LIKE '%Campus%' OR title LIKE '%Masterclass%' OR title LIKE '%Maintenance%'");
                                self::$pdo->exec("DELETE FROM support_tickets WHERE subject LIKE '%OAuth%' OR subject LIKE '%GPU%' OR subject LIKE '%VPN%'");
                                self::$pdo->exec("DELETE FROM placement_jobs WHERE company_name LIKE '%Acme%' OR company_name LIKE '%Demo%' OR job_title LIKE '%Dummy%'");
                                self::$pdo->exec("DELETE FROM student_rankings WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'student' AND (is_archived IS NULL OR is_archived = 0))");

                                // 6. Clean orphaned enrollments
                                self::$pdo->exec("DELETE FROM enrollments WHERE course_id NOT IN (SELECT id FROM courses) OR user_id NOT IN (SELECT id FROM users)");
                                self::$pdo->exec("DELETE FROM batch_enrollments WHERE batch_id NOT IN (SELECT id FROM batches) OR user_id NOT IN (SELECT id FROM users)");
                            } catch (Exception $cleanErr) {}
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
                        self::ensureSqliteSchema(self::$pdo);
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

    private static function ensureSqliteSchema(PDO $pdo): void {
        try {
            $colStmt = $pdo->query("PRAGMA table_info(users)");
            $userCols = [];
            while ($r = $colStmt->fetch(PDO::FETCH_ASSOC)) {
                $userCols[] = $r['name'];
            }
            $userColSet = array_flip($userCols);
            $requiredCols = [
                'display_name' => "VARCHAR(120) NULL",
                'phone' => "VARCHAR(50) NULL",
                'timezone' => "VARCHAR(100) DEFAULT 'Asia/Kolkata'",
                'preferred_language' => "VARCHAR(20) DEFAULT 'en'",
                'notification_preferences_json' => "TEXT NULL",
                'security_settings_json' => "TEXT NULL",
                'authorized_roles_json' => "TEXT NULL",
                'status' => "VARCHAR(50) DEFAULT 'active'",
                'is_archived' => "TINYINT(1) DEFAULT 0",
                'deleted_at' => "DATETIME NULL",
                'archived_at' => "DATETIME NULL",
                'archival_reason' => "TEXT NULL",
            ];
            foreach ($requiredCols as $col => $type) {
                if (!isset($userColSet[$col])) {
                    $pdo->exec("ALTER TABLE users ADD COLUMN {$col} {$type}");
                }
            }

            $spStmt = $pdo->query("PRAGMA table_info(student_profiles)");
            $spCols = [];
            while ($r = $spStmt->fetch(PDO::FETCH_ASSOC)) {
                $spCols[] = $r['name'];
            }
            $spColSet = array_flip($spCols);
            $spReq = [
                'skills' => 'TEXT NULL',
                'career_interests' => 'TEXT NULL',
                'resume_url' => 'VARCHAR(500) NULL',
                'portfolio_url' => 'VARCHAR(500) NULL',
                'github_url' => 'VARCHAR(500) NULL',
                'work_experience' => 'TEXT NULL',
                'experience_years' => 'VARCHAR(50) NULL',
                'account_status' => "VARCHAR(50) DEFAULT 'active'",
                'admission_status' => "VARCHAR(50) DEFAULT 'admitted'",
                'enrollment_status' => "VARCHAR(50) DEFAULT 'enrolled'",
                'payment_status' => "VARCHAR(50) DEFAULT 'unpaid'",
                'invitation_token' => 'VARCHAR(100) NULL',
                'invitation_expires_at' => 'DATETIME NULL',
                'invitation_accepted_at' => 'DATETIME NULL',
            ];
            foreach ($spReq as $col => $type) {
                if (!isset($spColSet[$col])) {
                    $pdo->exec("ALTER TABLE student_profiles ADD COLUMN {$col} {$type}");
                }
            }

            $fpStmt = $pdo->query("PRAGMA table_info(faculty_profiles)");
            $fpCols = [];
            while ($r = $fpStmt->fetch(PDO::FETCH_ASSOC)) {
                $fpCols[] = $r['name'];
            }
            $fpColSet = array_flip($fpCols);
            $fpReq = [
                'account_status' => "VARCHAR(50) DEFAULT 'active'",
                'invitation_token' => 'VARCHAR(100) NULL',
                'invitation_expires_at' => 'DATETIME NULL',
                'invitation_accepted_at' => 'DATETIME NULL',
            ];
            foreach ($fpReq as $col => $type) {
                if (!isset($fpColSet[$col])) {
                    $pdo->exec("ALTER TABLE faculty_profiles ADD COLUMN {$col} {$type}");
                }
            }

            $courseStmt = $pdo->query("PRAGMA table_info(courses)");
            $courseCols = [];
            while ($r = $courseStmt->fetch(PDO::FETCH_ASSOC)) {
                $courseCols[] = $r['name'];
            }
            $courseColSet = array_flip($courseCols);
            if (!isset($courseColSet['badge_color'])) {
                $pdo->exec("ALTER TABLE courses ADD COLUMN badge_color VARCHAR(30) NULL DEFAULT NULL");
            }
        } catch (\Throwable $e) {}
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
