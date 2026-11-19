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
    avatar LONGTEXT NULL,
    display_name VARCHAR(120) NULL,
    phone VARCHAR(50) NULL,
    timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
    preferred_language VARCHAR(20) DEFAULT 'en',
    notification_preferences_json LONGTEXT NULL,
    security_settings_json LONGTEXT NULL,
    authorized_roles_json LONGTEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL,
    archived_at DATETIME NULL,
    archival_reason TEXT NULL,
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
    badge_color VARCHAR(30) NULL DEFAULT NULL,
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
    access_duration_type VARCHAR(20) NOT NULL DEFAULT 'preset',
    access_duration_value INT UNSIGNED NOT NULL DEFAULT 6,
    access_duration_unit VARCHAR(20) NOT NULL DEFAULT 'months',
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
    storage_key VARCHAR(191) NULL,
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
    batch_id INT UNSIGNED NULL,
    status ENUM('active', 'completed', 'dropped') NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_start_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    access_duration_applied VARCHAR(50) NOT NULL DEFAULT '6 Months',
    access_status ENUM('active', 'expired', 'extended', 'withdrawn') NOT NULL DEFAULT 'active',
    withdrawal_reason TEXT NULL,
    withdrawn_at DATETIME NULL,
    UNIQUE KEY uk_user_course (user_id, course_id),
    CONSTRAINT fk_enroll_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7b. Enrollment Access Extensions Table (Authorized Extension History)
CREATE TABLE IF NOT EXISTS enrollment_access_extensions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT UNSIGNED NOT NULL,
    previous_expires_at DATETIME NOT NULL,
    new_expires_at DATETIME NOT NULL,
    extension_days INT NOT NULL,
    reason TEXT NOT NULL,
    extended_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_eae_enrollment (enrollment_id),
    CONSTRAINT fk_eae_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_eae_extended_by FOREIGN KEY (extended_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7c. Uploaded Files Table (Durable Storage & Protected Media Registry)
CREATE TABLE IF NOT EXISTS uploaded_files (
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
    storage_key VARCHAR(191) NULL,
    source_type VARCHAR(50) DEFAULT 'file',
    file_name VARCHAR(255) NULL,
    file_size BIGINT UNSIGNED NULL,
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

-- 11. Student Rankings Table (Academic Leaderboard)
CREATE TABLE IF NOT EXISTS student_rankings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NULL,
    rank_position INT UNSIGNED NOT NULL DEFAULT 1,
    points INT UNSIGNED NOT NULL DEFAULT 0,
    grade_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    badge_text VARCHAR(100) NULL DEFAULT 'Top Performer',
    faculty_notes TEXT NULL,
    lessons_completed INT UNSIGNED NOT NULL DEFAULT 0,
    tasks_completed INT UNSIGNED NOT NULL DEFAULT 0,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sr_user_course (user_id, course_id),
    INDEX idx_sr_rank (rank_position, points),
    CONSTRAINT fk_sr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_sr_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL,
    CONSTRAINT fk_sr_updater FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    student_id_code VARCHAR(50) NOT NULL UNIQUE,
    mobile VARCHAR(30) NULL,
    normalized_mobile VARCHAR(30) NULL,
    education VARCHAR(200) NULL,
    experience_years VARCHAR(50) NULL,
    admission_date DATE NULL,
    coordinator_id INT UNSIGNED NULL,
    account_status ENUM('invited', 'active', 'deactivated', 'suspended') NOT NULL DEFAULT 'active',
    admission_status ENUM('applied', 'verified', 'admitted', 'deferred', 'withdrawn') NOT NULL DEFAULT 'admitted',
    enrollment_status ENUM('enrolled', 'in_progress', 'completed', 'dropped') NOT NULL DEFAULT 'enrolled',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    documents_json LONGTEXT NULL,
    internal_notes TEXT NULL,
    skills TEXT NULL,
    career_interests TEXT NULL,
    resume_url VARCHAR(500) NULL,
    portfolio_url VARCHAR(500) NULL,
    github_url VARCHAR(500) NULL,
    work_experience TEXT NULL,
    suspension_reason TEXT NULL,
    suspension_end_date DATETIME NULL,
    invitation_token VARCHAR(100) NULL,
    invitation_expires_at DATETIME NULL,
    invitation_accepted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sp_user (user_id),
    INDEX idx_sp_code (student_id_code),
    INDEX idx_sp_status (account_status, admission_status),
    CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_sp_coord FOREIGN KEY (coordinator_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Faculty Profiles
CREATE TABLE IF NOT EXISTS faculty_profiles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    faculty_id_code VARCHAR(50) NOT NULL UNIQUE,
    mobile VARCHAR(30) NULL,
    expertise TEXT NULL,
    courses_taught_json LONGTEXT NULL,
    availability_json LONGTEXT NULL,
    account_status ENUM('invited', 'active', 'inactive', 'on_leave', 'deactivated', 'suspended') NOT NULL DEFAULT 'active',
    documents_json LONGTEXT NULL,
    internal_notes TEXT NULL,
    bio TEXT NULL,
    qualifications TEXT NULL,
    experience_years VARCHAR(50) NULL,
    professional_links_json LONGTEXT NULL,
    suspension_reason TEXT NULL,
    suspension_end_date DATETIME NULL,
    invitation_token VARCHAR(100) NULL,
    invitation_expires_at DATETIME NULL,
    invitation_accepted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fp_user (user_id),
    INDEX idx_fp_code (faculty_id_code),
    CONSTRAINT fk_fp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    capacity INT UNSIGNED NOT NULL DEFAULT 30,
    delivery_mode VARCHAR(50) NOT NULL DEFAULT 'Online Live',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    coordinator_id INT UNSIGNED NULL,
    lead_faculty_id INT UNSIGNED NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    archived_at DATETIME NULL,
    archival_reason TEXT NULL,
    is_archived TINYINT(1) DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_batch_course (course_id),
    INDEX idx_batch_status (status),
    CONSTRAINT fk_batch_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE RESTRICT,
    CONSTRAINT fk_batch_coord FOREIGN KEY (coordinator_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_batch_faculty FOREIGN KEY (lead_faculty_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Batch Enrolments
CREATE TABLE IF NOT EXISTS batch_enrollments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    batch_id INT UNSIGNED NOT NULL,
    status ENUM('active', 'transferred', 'withdrawn', 'completed') NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transfer_from_batch_id INT UNSIGNED NULL,
    transfer_reason TEXT NULL,
    transferred_at DATETIME NULL,
    withdrawal_reason TEXT NULL,
    withdrawn_at DATETIME NULL,
    INDEX idx_be_user_batch (user_id, batch_id),
    INDEX idx_be_batch_status (batch_id, status),
    CONSTRAINT fk_be_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_be_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_be_batch FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Faculty Batch Assignments
CREATE TABLE IF NOT EXISTS faculty_batch_assignments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT UNSIGNED NOT NULL,
    batch_id INT UNSIGNED NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Primary Faculty',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_fac_batch (faculty_id, batch_id),
    CONSTRAINT fk_fba_faculty FOREIGN KEY (faculty_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_fba_batch FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Class Sessions
CREATE TABLE IF NOT EXISTS class_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_id INT UNSIGNED NOT NULL,
    faculty_id INT UNSIGNED NOT NULL,
    topic VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    session_type ENUM('Lecture', 'Lab', 'Doubt Clearing', 'Mentor Connect', 'Project Review') NOT NULL DEFAULT 'Lecture',
    meeting_link VARCHAR(500) NULL,
    classroom_location VARCHAR(200) NULL,
    recording_url VARCHAR(500) NULL,
    resources_json LONGTEXT NULL,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled') NOT NULL DEFAULT 'scheduled',
    reschedule_reason TEXT NULL,
    cancel_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cs_batch_time (batch_id, start_time),
    INDEX idx_cs_faculty_time (faculty_id, start_time),
    INDEX idx_cs_status (status),
    CONSTRAINT fk_cs_batch FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE,
    CONSTRAINT fk_cs_faculty FOREIGN KEY (faculty_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id INT UNSIGNED NOT NULL,
    enrollment_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
    marked_by INT UNSIGNED NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    correction_reason TEXT NULL,
    corrected_by INT UNSIGNED NULL,
    corrected_at DATETIME NULL,
    UNIQUE KEY uk_att_session_user (session_id, user_id),
    INDEX idx_att_enroll (enrollment_id),
    INDEX idx_att_status (status),
    CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES class_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_marker FOREIGN KEY (marked_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_att_corrector FOREIGN KEY (corrected_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Learning Materials
CREATE TABLE IF NOT EXISTS learning_materials (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    material_type ENUM('document', 'video', 'link', 'recording') NOT NULL DEFAULT 'document',
    file_url VARCHAR(500) NULL,
    external_url VARCHAR(500) NULL,
    file_size VARCHAR(50) NULL,
    file_type VARCHAR(50) NULL,
    course_id INT UNSIGNED NOT NULL,
    module_id INT UNSIGNED NULL,
    lesson_id INT UNSIGNED NULL,
    batch_id INT UNSIGNED NULL,
    session_id INT UNSIGNED NULL,
    destination ENUM('private_lms', 'public_website', 'both') NOT NULL DEFAULT 'private_lms',
    status ENUM('draft', 'pending_review', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'published',
    approval_status ENUM('draft', 'pending_review', 'approved', 'changes_requested', 'rejected') NOT NULL DEFAULT 'approved',
    approved_by INT UNSIGNED NULL,
    approved_at DATETIME NULL,
    review_notes TEXT NULL,
    audience_type ENUM('all_students', 'all_faculty', 'course_enrolled', 'batch_enrolled', 'individual') NOT NULL DEFAULT 'course_enrolled',
    audience_id INT UNSIGNED NULL,
    recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
    live_version_data LONGTEXT NULL,
    notify_audience TINYINT(1) NOT NULL DEFAULT 0,
    notification_status ENUM('none', 'queued', 'sent', 'failed') NOT NULL DEFAULT 'none',
    notified_at DATETIME NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    scheduled_release_at DATETIME NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mat_course (course_id),
    INDEX idx_mat_batch (batch_id),
    INDEX idx_mat_dest (destination),
    INDEX idx_mat_status (status),
    CONSTRAINT fk_mat_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_mat_batch FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE SET NULL,
    CONSTRAINT fk_mat_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Fee Plans
CREATE TABLE IF NOT EXISTS fee_plans (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT UNSIGNED NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    total_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_reason VARCHAR(255) NULL,
    net_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status ENUM('pending', 'partially_paid', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fp_user (user_id),
    INDEX idx_fp_status (status),
    CONSTRAINT fk_fp_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_fp_user_ref FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_fp_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Fee Installments
CREATE TABLE IF NOT EXISTS fee_installments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fee_plan_id INT UNSIGNED NOT NULL,
    installment_number INT UNSIGNED NOT NULL DEFAULT 1,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'partially_paid', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fi_plan (fee_plan_id),
    INDEX idx_fi_due (due_date, status),
    CONSTRAINT fk_fi_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plans (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Payments & Receipts
CREATE TABLE IF NOT EXISTS payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fee_plan_id INT UNSIGNED NOT NULL,
    installment_id INT UNSIGNED NULL,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('Bank Transfer (NEFT/RTGS)', 'UPI / QR', 'Credit/Debit Card', 'Cheque', 'Cash', 'Online Gateway') NOT NULL DEFAULT 'Bank Transfer (NEFT/RTGS)',
    transaction_reference VARCHAR(150) NULL,
    payment_date DATE NOT NULL,
    notes TEXT NULL,
    received_by INT UNSIGNED NULL,
    is_refund TINYINT(1) NOT NULL DEFAULT 0,
    refund_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pay_plan (fee_plan_id),
    INDEX idx_pay_receipt (receipt_number),
    CONSTRAINT fk_pay_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plans (id) ON DELETE RESTRICT,
    CONSTRAINT fk_pay_inst FOREIGN KEY (installment_id) REFERENCES fee_installments (id) ON DELETE SET NULL,
    CONSTRAINT fk_pay_receiver FOREIGN KEY (received_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Student Follow-ups
CREATE TABLE IF NOT EXISTS student_followups (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    enrollment_id INT UNSIGNED NULL,
    batch_id INT UNSIGNED NULL,
    reason ENUM('low_attendance', 'missing_assignments', 'prolonged_inactivity', 'overdue_fees', 'incomplete_onboarding', 'academic_difficulty') NOT NULL,
    description TEXT NOT NULL,
    assigned_to INT UNSIGNED NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    last_followup_at DATETIME NULL,
    next_followup_date DATE NULL,
    status ENUM('open', 'in_progress', 'resolved') NOT NULL DEFAULT 'open',
    resolution_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sfu_user (user_id),
    INDEX idx_sfu_status (status),
    INDEX idx_sfu_assigned (assigned_to),
    CONSTRAINT fk_sfu_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_sfu_assignee FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_type ENUM('all_students', 'course', 'batch', 'faculty', 'individual') NOT NULL DEFAULT 'all_students',
    target_id INT UNSIGNED NULL,
    author_id INT UNSIGNED NOT NULL,
    priority ENUM('normal', 'important', 'urgent') NOT NULL DEFAULT 'normal',
    destination ENUM('private_lms', 'public_website', 'both') NOT NULL DEFAULT 'private_lms',
    approval_status ENUM('draft', 'pending_review', 'approved', 'changes_requested', 'rejected') NOT NULL DEFAULT 'approved',
    scheduled_at DATETIME NULL,
    send_email TINYINT(1) NOT NULL DEFAULT 0,
    notify_audience TINYINT(1) NOT NULL DEFAULT 1,
    notification_status ENUM('none', 'queued', 'sent', 'failed') NOT NULL DEFAULT 'queued',
    notified_at DATETIME NULL,
    recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
    live_version_data LONGTEXT NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ann_target (target_type, target_id),
    INDEX idx_ann_dest (destination),
    CONSTRAINT fk_ann_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24b. Public Website Content (Articles, Showcases, Resources, Events)
CREATE TABLE IF NOT EXISTS public_website_content (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content_type ENUM('article', 'project_showcase', 'resource', 'news_event', 'testimonial') NOT NULL DEFAULT 'article',
    summary TEXT NULL,
    body LONGTEXT NULL,
    author_id INT UNSIGNED NOT NULL,
    destination ENUM('public_website', 'both') NOT NULL DEFAULT 'public_website',
    status ENUM('draft', 'pending_review', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft',
    approval_status ENUM('draft', 'pending_review', 'approved', 'changes_requested', 'rejected') NOT NULL DEFAULT 'draft',
    reviewed_by INT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    review_notes TEXT NULL,
    consent_given TINYINT(1) NOT NULL DEFAULT 1,
    media_url VARCHAR(500) NULL,
    external_url VARCHAR(500) NULL,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    live_version_data LONGTEXT NULL,
    scheduled_at DATETIME NULL,
    published_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pwc_slug (slug),
    INDEX idx_pwc_type (content_type),
    INDEX idx_pwc_status (status),
    INDEX idx_pwc_approval (approval_status),
    CONSTRAINT fk_pwc_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_pwc_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Placement Profiles & Tracking
CREATE TABLE IF NOT EXISTS placement_profiles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    resume_url VARCHAR(500) NULL,
    portfolio_url VARCHAR(500) NULL,
    github_url VARCHAR(500) NULL,
    linkedin_url VARCHAR(500) NULL,
    target_roles TEXT NULL,
    skills TEXT NULL,
    resume_review_status ENUM('pending', 'needs_revision', 'approved') NOT NULL DEFAULT 'pending',
    readiness_score INT UNSIGNED NOT NULL DEFAULT 0,
    readiness_checklist_json LONGTEXT NULL,
    mock_interview_feedback_json LONGTEXT NULL,
    placed_company VARCHAR(150) NULL,
    package_offered VARCHAR(100) NULL,
    placement_status ENUM('training', 'ready_for_interviews', 'actively_interviewing', 'placed', 'opted_out') NOT NULL DEFAULT 'training',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Job Openings
CREATE TABLE IF NOT EXISTS job_openings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    company_logo VARCHAR(500) NULL,
    job_title VARCHAR(150) NOT NULL,
    job_description TEXT NOT NULL,
    location VARCHAR(100) NOT NULL DEFAULT 'Bangalore / Hybrid',
    employment_type ENUM('Full-time', 'Contract', 'Internship') NOT NULL DEFAULT 'Full-time',
    experience_required VARCHAR(50) NOT NULL DEFAULT '0-2 Years',
    package_range VARCHAR(100) NULL,
    skills_required TEXT NULL,
    deadline DATE NULL,
    status ENUM('active', 'closed', 'draft') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_opening_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('applied', 'shortlisted', 'technical_round', 'hr_round', 'offered', 'rejected', 'accepted') NOT NULL DEFAULT 'applied',
    notes TEXT NULL,
    interview_scheduled_at DATETIME NULL,
    feedback TEXT NULL,
    outcome_date DATETIME NULL,
    UNIQUE KEY uk_job_user (job_opening_id, user_id),
    CONSTRAINT fk_ja_job FOREIGN KEY (job_opening_id) REFERENCES job_openings (id) ON DELETE CASCADE,
    CONSTRAINT fk_ja_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Support Tickets & Feedback
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    category ENUM('academic', 'technical', 'fees', 'scheduling', 'placement', 'other') NOT NULL DEFAULT 'academic',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    assigned_to INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_st_user (user_id),
    INDEX idx_st_status (status),
    CONSTRAINT fk_st_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_st_assignee FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    sender_id INT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    is_internal_note TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tm_ticket (ticket_id),
    CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback_submissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    batch_id INT UNSIGNED NULL,
    faculty_id INT UNSIGNED NULL,
    student_id INT UNSIGNED NOT NULL,
    rating DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    content_rating INT UNSIGNED NOT NULL DEFAULT 5,
    faculty_rating INT UNSIGNED NOT NULL DEFAULT 5,
    facilities_rating INT UNSIGNED NOT NULL DEFAULT 5,
    comments TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fb_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_fb_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. Audit Logs & System Settings
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    user_email VARCHAR(191) NULL,
    user_role VARCHAR(50) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NULL,
    details_json LONGTEXT NULL,
    ip_address VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pwd_res_token (token),
    CONSTRAINT fk_pwd_res_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('institute_name', 'Aaroha Academy & Technologies', 'Legal brand and academy entity title'),
('support_email', 'admissions@aaroha-inc.com', 'Primary support and communications inbox'),
('default_timezone', 'Asia/Kolkata', 'Global operational timezone'),
('currency_symbol', 'INR', 'Default transaction currency ISO code'),
('low_attendance_threshold_pct', '80', 'Threshold percentage triggering academic follow-up'),
('assignment_passing_pct', '75', 'Minimum deliverable grade for course completion'),
('email_delivery_provider', 'Not Configured (Simulated Live Preview)', 'External SMTP or transactional mail provider status');

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
('20261113_002_add_soft_delete_and_video_provider'),
('20261116_001_comprehensive_admin_portal_schema');

SET FOREIGN_KEY_CHECKS = 1;
