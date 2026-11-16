-- Migration: 20261116_001_comprehensive_admin_portal_schema.sql
-- Description: Complete schema for Aaroha Enterprise LMS Admin Portal
-- Supports: Batches, Schedule, Attendance, Materials, Fees, Announcements, Follow-ups, Placement, Support, Audit Logs, Settings

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Extend Users table if needed
-- Users table already has id, full_name, email, password_hash, role, title, avatar, created_at, updated_at

-- 2. Student Profiles
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
    payment_status ENUM('unpaid', 'partially_paid', 'paid', 'overdue', 'refunded') NOT NULL DEFAULT 'unpaid',
    documents_json LONGTEXT NULL,
    internal_notes TEXT NULL,
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

-- 3. Faculty Profiles
CREATE TABLE IF NOT EXISTS faculty_profiles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    faculty_id_code VARCHAR(50) NOT NULL UNIQUE,
    mobile VARCHAR(30) NULL,
    expertise TEXT NULL,
    courses_taught_json LONGTEXT NULL,
    availability_json LONGTEXT NULL,
    account_status ENUM('active', 'inactive', 'on_leave') NOT NULL DEFAULT 'active',
    documents_json LONGTEXT NULL,
    internal_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fp_user (user_id),
    INDEX idx_fp_code (faculty_id_code),
    CONSTRAINT fk_fp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    capacity INT UNSIGNED NOT NULL DEFAULT 30,
    delivery_mode ENUM('Online Live', 'Classroom', 'Hybrid') NOT NULL DEFAULT 'Online Live',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    coordinator_id INT UNSIGNED NULL,
    lead_faculty_id INT UNSIGNED NULL,
    status ENUM('upcoming', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_batch_course (course_id),
    INDEX idx_batch_status (status),
    CONSTRAINT fk_batch_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE RESTRICT,
    CONSTRAINT fk_batch_coord FOREIGN KEY (coordinator_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_batch_faculty FOREIGN KEY (lead_faculty_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Batch Enrolments (Students to Batches)
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

-- 6. Faculty Batch Assignments
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

-- 7. Class Sessions (Schedules)
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

-- 8. Attendance Records
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

-- 9. Learning Materials
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
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    scheduled_release_at DATETIME NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mat_course (course_id),
    INDEX idx_mat_batch (batch_id),
    CONSTRAINT fk_mat_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_mat_batch FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE SET NULL,
    CONSTRAINT fk_mat_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Fee Plans
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

-- 11. Fee Installments
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

-- 12. Payments & Receipts
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

-- 13. Student Follow-ups
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

-- 14. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_type ENUM('all_students', 'course', 'batch', 'faculty', 'individual') NOT NULL DEFAULT 'all_students',
    target_id INT UNSIGNED NULL,
    author_id INT UNSIGNED NOT NULL,
    priority ENUM('normal', 'important', 'urgent') NOT NULL DEFAULT 'normal',
    send_email TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ann_target (target_type, target_id),
    CONSTRAINT fk_ann_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Placement Profiles & Tracking
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

-- 16. Job Openings
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

-- 17. Job Applications
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

-- 18. Support Tickets & Feedback
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

-- 19. Audit Logs
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

-- 20. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default System Settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('institute_name', 'Aaroha Academy & Technologies', 'Legal brand and academy entity title'),
('support_email', 'admissions@aaroha-inc.com', 'Primary support and communications inbox'),
('default_timezone', 'Asia/Kolkata', 'Global operational timezone'),
('currency_symbol', 'INR', 'Default transaction currency ISO code'),
('low_attendance_threshold_pct', '80', 'Threshold percentage triggering academic follow-up'),
('assignment_passing_pct', '75', 'Minimum deliverable grade for course completion'),
('email_delivery_provider', 'Not Configured (Simulated Live Preview)', 'External SMTP or transactional mail provider status');

-- Register migration in tracking table
INSERT IGNORE INTO schema_migrations (version) VALUES ('20261116_001_comprehensive_admin_portal_schema');

SET FOREIGN_KEY_CHECKS = 1;

