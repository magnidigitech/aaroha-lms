-- Aaroha LMS Clean Production Database Schema
-- Target: MySQL 8.0+ / MariaDB via phpMyAdmin or CLI on Hostinger Shared Hosting
-- Target Domain: lms.aaroha-inc.com
-- Roles: 'admin' and 'student' (Guests are unauthenticated visitors)
-- Contains clean DDL only. Seed/test data is strictly excluded.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Schema Migrations Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(191) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    title VARCHAR(150) NULL,
    avatar VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(191) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL DEFAULT 'Cloud Architecture',
    level VARCHAR(60) NOT NULL DEFAULT 'Advanced Level',
    duration VARCHAR(60) NOT NULL DEFAULT '8 Weeks',
    partner_type VARCHAR(60) NOT NULL DEFAULT 'Specialization',
    rating DECIMAL(3,2) NOT NULL DEFAULT 4.90,
    reviews_count VARCHAR(50) NOT NULL DEFAULT '0',
    badge_text VARCHAR(50) NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    skills TEXT NULL,
    what_you_will_learn TEXT NULL,
    prerequisites TEXT NULL,
    about TEXT NULL,
    instructor_name VARCHAR(150) NULL,
    instructor_title VARCHAR(150) NULL,
    instructor_department VARCHAR(150) NULL,
    instructor_bio TEXT NULL,
    instructor_avatar VARCHAR(500) NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL DEFAULT NULL,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Modules Table
CREATE TABLE IF NOT EXISTS modules (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    estimated_time VARCHAR(60) NULL DEFAULT '5 hours to complete',
    description TEXT NULL,
    sequence_order INT UNSIGNED NOT NULL DEFAULT 1,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_module_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type ENUM('video', 'article', 'resource') NOT NULL DEFAULT 'article',
    video_provider VARCHAR(50) NULL DEFAULT NULL,
    duration VARCHAR(50) NOT NULL DEFAULT '15 min',
    content_body LONGTEXT,
    media_url VARCHAR(500),
    sequence_order INT UNSIGNED NOT NULL DEFAULT 1,
    is_free_preview TINYINT(1) NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lesson_module FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tasks Table (Assignments & Evaluated Projects)
CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    task_type ENUM('text_response', 'file_upload', 'quiz') NOT NULL DEFAULT 'text_response',
    max_score INT UNSIGNED NOT NULL DEFAULT 100,
    passing_score INT UNSIGNED NOT NULL DEFAULT 75,
    is_mandatory TINYINT(1) NOT NULL DEFAULT 1,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_module FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    status ENUM('active', 'completed', 'dropped') NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uk_user_course (user_id, course_id),
    CONSTRAINT fk_enroll_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT UNSIGNED NOT NULL,
    lesson_id INT UNSIGNED NOT NULL,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uk_enroll_lesson (enrollment_id, lesson_id),
    CONSTRAINT fk_prog_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_prog_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Task Submissions Table
CREATE TABLE IF NOT EXISTS task_submissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id INT UNSIGNED NOT NULL,
    enrollment_id INT UNSIGNED NOT NULL,
    submission_text TEXT,
    attachment_url VARCHAR(500),
    status ENUM('submitted', 'under_review', 'passed', 'failed', 'resubmit_required') NOT NULL DEFAULT 'submitted',
    score INT UNSIGNED NULL DEFAULT NULL,
    feedback TEXT,
    graded_by INT UNSIGNED NULL DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_sub_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_grader FOREIGN KEY (graded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Certificates Table (Accredited Digital Credentials)
CREATE TABLE IF NOT EXISTS certificates (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cert_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_cert_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_cert_issuer FOREIGN KEY (issuer_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- PERFORMANCE INDEXES
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_enrollment_user_course_status ON enrollments (user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_certificates_user_course ON certificates (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates (certificate_code);
CREATE INDEX IF NOT EXISTS idx_lessons_module_published ON lessons (module_id, is_published, is_deleted);
CREATE INDEX IF NOT EXISTS idx_modules_course_deleted ON modules (course_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_courses_published_deleted ON courses (is_published, is_deleted);

-- Record baseline migrations as incorporated into base schema
INSERT IGNORE INTO schema_migrations (version) VALUES
('20261113_001_add_bunny_stream_columns'),
('20261113_002_add_soft_delete_and_video_provider');

SET FOREIGN_KEY_CHECKS = 1;
