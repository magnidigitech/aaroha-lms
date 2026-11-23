#!/usr/bin/env python3
import os
import sqlite3
import json

def init_db():
    db_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(db_dir, 'lms.sqlite')
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. Base Core Schema
    cur.executescript("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        title TEXT,
        avatar TEXT,
        display_name TEXT,
        phone TEXT,
        timezone TEXT DEFAULT 'Asia/Kolkata',
        preferred_language TEXT DEFAULT 'en',
        notification_preferences_json TEXT,
        security_settings_json TEXT,
        authorized_roles_json TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        is_archived INTEGER NOT NULL DEFAULT 0,
        deleted_at DATETIME,
        archived_at DATETIME,
        archival_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL DEFAULT 'Cloud Architecture',
        level TEXT NOT NULL DEFAULT 'Advanced Level',
        duration TEXT NOT NULL DEFAULT '8 Weeks',
        partner_type TEXT NOT NULL DEFAULT 'Specialization',
        rating REAL NOT NULL DEFAULT 4.90,
        reviews_count TEXT NOT NULL DEFAULT '2.8K',
        badge_text TEXT,
        badge_color TEXT DEFAULT NULL,
        description TEXT,
        thumbnail_url TEXT,
        skills TEXT,
        what_you_will_learn TEXT,
        prerequisites TEXT,
        about TEXT,
        instructor_name TEXT,
        instructor_title TEXT,
        instructor_department TEXT,
        instructor_bio TEXT,
        instructor_avatar TEXT,
        access_duration_type TEXT NOT NULL DEFAULT 'preset',
        access_duration_value INTEGER NOT NULL DEFAULT 6,
        access_duration_unit TEXT NOT NULL DEFAULT 'months',
        is_published INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
    );

    CREATE TABLE modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        estimated_time TEXT DEFAULT '5 hours to complete',
        description TEXT,
        sequence_order INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    );

    CREATE TABLE lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'article',
        video_provider TEXT DEFAULT 'youtube',
        duration TEXT NOT NULL DEFAULT '15 min',
        content_body TEXT,
        media_url TEXT,
        sequence_order INTEGER NOT NULL DEFAULT 1,
        is_free_preview INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
    );

    CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        instructions TEXT NOT NULL,
        task_type TEXT NOT NULL DEFAULT 'text_response',
        max_score INTEGER NOT NULL DEFAULT 100,
        passing_score INTEGER NOT NULL DEFAULT 75,
        is_mandatory INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
    );

    CREATE TABLE enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        batch_id INTEGER DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_start_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        expires_at DATETIME,
        access_duration_applied TEXT DEFAULT '6 Months',
        access_status TEXT NOT NULL DEFAULT 'active',
        withdrawal_reason TEXT DEFAULT NULL,
        withdrawn_at DATETIME DEFAULT NULL,
        UNIQUE (user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    );

    CREATE TABLE lesson_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        lesson_id INTEGER NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at DATETIME,
        UNIQUE (enrollment_id, lesson_id),
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
    );

    CREATE TABLE task_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        enrollment_id INTEGER NOT NULL,
        submission_text TEXT,
        attachment_url TEXT,
        status TEXT NOT NULL DEFAULT 'submitted',
        score INTEGER,
        feedback TEXT,
        graded_by INTEGER,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        graded_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (graded_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE enrollment_access_extensions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        previous_expires_at DATETIME NOT NULL,
        new_expires_at DATETIME NOT NULL,
        extension_days INTEGER NOT NULL,
        reason TEXT NOT NULL,
        extended_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (extended_by) REFERENCES users (id) ON DELETE RESTRICT
    );

    CREATE TABLE uploaded_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_key TEXT,
        storage_key TEXT,
        original_filename TEXT,
        filename TEXT,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        category TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'private',
        is_public INTEGER NOT NULL DEFAULT 0,
        storage_path TEXT NOT NULL,
        uploaded_by INTEGER,
        uploader_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        certificate_code TEXT NOT NULL UNIQUE,
        course_id INTEGER NOT NULL,
        user_id INTEGER,
        recipient_name TEXT NOT NULL,
        recipient_email TEXT,
        course_title TEXT NOT NULL,
        issuer_id INTEGER,
        issuer_name TEXT NOT NULL,
        issuer_title TEXT,
        grade TEXT NOT NULL DEFAULT 'Verified Completion',
        status TEXT NOT NULL DEFAULT 'valid',
        batch_id INTEGER DEFAULT NULL,
        template_id TEXT NOT NULL DEFAULT 'academic_excellence',
        completion_date TEXT DEFAULT NULL,
        training_hours INTEGER DEFAULT 40,
        signatory_faculty_name TEXT DEFAULT NULL,
        signatory_faculty_title TEXT DEFAULT NULL,
        signatory_dean_name TEXT DEFAULT NULL,
        signatory_dean_title TEXT DEFAULT NULL,
        certificate_data_json TEXT DEFAULT NULL,
        artifact_html TEXT DEFAULT NULL,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reissued_at DATETIME DEFAULT NULL,
        reissue_reason TEXT DEFAULT NULL,
        previous_certificate_code TEXT DEFAULT NULL,
        revoked_at DATETIME DEFAULT NULL,
        revocation_reason TEXT DEFAULT NULL,
        revoked_by INTEGER DEFAULT NULL,
        eligibility_override INTEGER DEFAULT 0,
        override_reason TEXT DEFAULT NULL,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (issuer_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE student_rankings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER,
        rank_position INTEGER NOT NULL DEFAULT 1,
        points INTEGER NOT NULL DEFAULT 0,
        grade_pct REAL NOT NULL DEFAULT 0.00,
        badge_text TEXT DEFAULT 'Top Performer',
        faculty_notes TEXT,
        lessons_completed INTEGER NOT NULL DEFAULT 0,
        tasks_completed INTEGER NOT NULL DEFAULT 0,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL
    );

    -- 2. Extended Admin Portal Entities
    CREATE TABLE student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        student_id_code TEXT NOT NULL UNIQUE,
        mobile TEXT,
        normalized_mobile TEXT,
        education TEXT,
        experience_years TEXT,
        admission_date TEXT,
        coordinator_id INTEGER,
        account_status TEXT NOT NULL DEFAULT 'active',
        admission_status TEXT NOT NULL DEFAULT 'admitted',
        enrollment_status TEXT NOT NULL DEFAULT 'enrolled',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        documents_json TEXT,
        internal_notes TEXT,
        invitation_token TEXT,
        invitation_expires_at DATETIME,
        invitation_accepted_at DATETIME,
        suspension_reason TEXT,
        suspension_end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (coordinator_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE faculty_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        faculty_id_code TEXT NOT NULL UNIQUE,
        mobile TEXT,
        expertise TEXT,
        courses_taught_json TEXT,
        availability_json TEXT,
        account_status TEXT NOT NULL DEFAULT 'active',
        documents_json TEXT,
        internal_notes TEXT,
        invitation_token TEXT,
        invitation_expires_at DATETIME,
        invitation_accepted_at DATETIME,
        suspension_reason TEXT,
        suspension_end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        batch_code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 30,
        delivery_mode TEXT NOT NULL DEFAULT 'Online Live',
        timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        coordinator_id INTEGER,
        lead_faculty_id INTEGER,
        status TEXT NOT NULL DEFAULT 'upcoming',
        is_deleted INTEGER NOT NULL DEFAULT 0,
        archived_at DATETIME,
        archival_reason TEXT,
        is_archived INTEGER DEFAULT 0,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id),
        FOREIGN KEY (coordinator_id) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (lead_faculty_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE batch_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        batch_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        transfer_from_batch_id INTEGER,
        transfer_reason TEXT,
        transferred_at DATETIME,
        withdrawal_reason TEXT,
        withdrawn_at DATETIME,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE
    );

    CREATE TABLE faculty_batch_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_id INTEGER NOT NULL,
        batch_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'Primary Faculty',
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (faculty_id, batch_id),
        FOREIGN KEY (faculty_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE
    );

    CREATE TABLE class_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        faculty_id INTEGER NOT NULL,
        topic TEXT NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        session_type TEXT NOT NULL DEFAULT 'Lecture',
        meeting_link TEXT,
        classroom_location TEXT,
        recording_url TEXT,
        resources_json TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled',
        reschedule_reason TEXT,
        cancel_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        enrollment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'present',
        marked_by INTEGER,
        marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        correction_reason TEXT,
        corrected_by INTEGER,
        corrected_at DATETIME,
        UNIQUE (session_id, user_id),
        FOREIGN KEY (session_id) REFERENCES class_sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (marked_by) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (corrected_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE learning_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        material_type TEXT NOT NULL DEFAULT 'document',
        file_url TEXT,
        external_url TEXT,
        file_size TEXT,
        file_type TEXT,
        course_id INTEGER NOT NULL,
        module_id INTEGER,
        lesson_id INTEGER,
        batch_id INTEGER,
        session_id INTEGER,
        is_published INTEGER NOT NULL DEFAULT 1,
        scheduled_release_at DATETIME,
        uploaded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE SET NULL,
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
    );

    CREATE TABLE fee_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        total_fee REAL NOT NULL DEFAULT 0.00,
        discount_amount REAL NOT NULL DEFAULT 0.00,
        discount_reason TEXT,
        net_fee REAL NOT NULL DEFAULT 0.00,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id)
    );

    CREATE TABLE fee_installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fee_plan_id INTEGER NOT NULL,
        installment_number INTEGER NOT NULL DEFAULT 1,
        amount REAL NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        paid_amount REAL NOT NULL DEFAULT 0.00,
        paid_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fee_plan_id) REFERENCES fee_plans (id) ON DELETE CASCADE
    );

    CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fee_plan_id INTEGER NOT NULL,
        installment_id INTEGER,
        receipt_number TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Bank Transfer (NEFT/RTGS)',
        transaction_reference TEXT,
        payment_date TEXT NOT NULL,
        notes TEXT,
        received_by INTEGER,
        is_refund INTEGER NOT NULL DEFAULT 0,
        refund_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fee_plan_id) REFERENCES fee_plans (id),
        FOREIGN KEY (installment_id) REFERENCES fee_installments (id) ON DELETE SET NULL,
        FOREIGN KEY (received_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE student_followups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        enrollment_id INTEGER,
        batch_id INTEGER,
        reason TEXT NOT NULL,
        description TEXT NOT NULL,
        assigned_to INTEGER,
        priority TEXT NOT NULL DEFAULT 'medium',
        last_followup_at DATETIME,
        next_followup_date TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        resolution_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT 'all_students',
        target_id INTEGER,
        author_id INTEGER NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        send_email INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users (id)
    );

    CREATE TABLE placement_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        resume_url TEXT,
        portfolio_url TEXT,
        github_url TEXT,
        linkedin_url TEXT,
        target_roles TEXT,
        skills TEXT,
        resume_review_status TEXT NOT NULL DEFAULT 'pending',
        readiness_score INTEGER NOT NULL DEFAULT 0,
        readiness_checklist_json TEXT,
        mock_interview_feedback_json TEXT,
        placed_company TEXT,
        package_offered TEXT,
        placement_status TEXT NOT NULL DEFAULT 'training',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE job_openings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        company_logo TEXT,
        job_title TEXT NOT NULL,
        job_description TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT 'Bangalore / Hybrid',
        employment_type TEXT NOT NULL DEFAULT 'Full-time',
        experience_required TEXT NOT NULL DEFAULT '0-2 Years',
        package_range TEXT,
        skills_required TEXT,
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE job_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_opening_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'applied',
        notes TEXT,
        interview_scheduled_at DATETIME,
        feedback TEXT,
        outcome_date DATETIME,
        UNIQUE (job_opening_id, user_id),
        FOREIGN KEY (job_opening_id) REFERENCES job_openings (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL DEFAULT 'academic',
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_internal_note INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users (id)
    );

    CREATE TABLE feedback_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        batch_id INTEGER,
        faculty_id INTEGER,
        student_id INTEGER NOT NULL,
        rating REAL NOT NULL DEFAULT 5.0,
        content_rating INTEGER NOT NULL DEFAULT 5,
        faculty_rating INTEGER NOT NULL DEFAULT 5,
        facilities_rating INTEGER NOT NULL DEFAULT 5,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT,
        user_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details_json TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE system_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)

    # 3. Canonical Test Users Baseline Setup (All matching password123)
    pw_hash = '$2y$12$fC/ALkID7616YWIOvrOYxO6kECCip3LILoAPJ4nVVYQFxAQtQQy5y' # Verified Bcrypt hash for 'password123'
    canonical_users = [
        (1, 'Aaroha Admin', 'admin@aaroha-inc.com', pw_hash, 'super_admin', 'System Administrator', '/avatars/3d/memo_1.png', '["super_admin","admin"]'),
        (2, 'Priya Sharma', 'coordinator@aaroha-inc.com', pw_hash, 'coordinator', 'Academic Operations Coordinator', '/avatars/3d/memo_2.png', '["coordinator"]'),
        (3, 'Elena Rostova', 'faculty@aaroha-inc.com', pw_hash, 'faculty', 'Lead Systems & AI Faculty', '/avatars/3d/memo_3.png', '["faculty"]'),
        (4, 'Ryu', 'ryu@aaroha.in', pw_hash, 'super_admin', 'Platform Architect', '/avatars/3d/memo_13.png', '["super_admin","admin","faculty","student"]'),
        (5, 'Student Fellow', 'student@aaroha-inc.com', pw_hash, 'student', 'Enrolled Fellow', '/avatars/3d/memo_4.png', '["student"]'),
        (6, 'Deepa Nair', 'placement@aaroha-inc.com', pw_hash, 'placement_officer', 'Head of Corporate Relations', '/avatars/3d/memo_5.png', '["placement_officer"]'),
        (7, 'Priya Sharma', 'priya.sharma@aaroha-inc.com', pw_hash, 'coordinator', 'Senior Academic Coordinator', '/avatars/3d/memo_2.png', '["coordinator"]'),
        (8, 'Elena Rostova', 'elena.rostova@enterprise.io', pw_hash, 'faculty', 'Lead Systems & AI Faculty', '/avatars/3d/memo_3.png', '["faculty"]'),
        (9, 'Aarav Patel', 'aarav.patel@student.aaroha-inc.com', pw_hash, 'student', 'Enrolled Fellow (Cloud Architecture)', '/avatars/3d/memo_6.png', '["student"]'),
        (10, 'Finance Officer', 'accounts@aaroha-inc.com', pw_hash, 'accounts', 'Finance & Bursar Officer', '/avatars/3d/memo_7.png', '["accounts"]')
    ]

    for uid, name, email, phash, role, title, avatar, roles_json in canonical_users:
        cur.execute('''
            INSERT INTO users (id, full_name, email, password_hash, role, title, avatar, status, is_archived, authorized_roles_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)
        ''', (uid, name, email, phash, role, title, avatar, roles_json))

    # Profiles
    cur.execute("INSERT INTO student_profiles (user_id, student_id_code, account_status, admission_status, enrollment_status) VALUES (4, 'STU-2026-0004', 'active', 'admitted', 'enrolled')")
    cur.execute("INSERT INTO student_profiles (user_id, student_id_code, account_status, admission_status, enrollment_status) VALUES (5, 'STU-2026-0005', 'active', 'admitted', 'enrolled')")
    cur.execute("INSERT INTO student_profiles (user_id, student_id_code, account_status, admission_status, enrollment_status) VALUES (9, 'STU-2026-0009', 'active', 'admitted', 'enrolled')")
    cur.execute("INSERT INTO faculty_profiles (user_id, faculty_id_code, account_status) VALUES (3, 'FAC-2026-0003', 'active')")
    cur.execute("INSERT INTO faculty_profiles (user_id, faculty_id_code, account_status) VALUES (8, 'FAC-2026-0008', 'active')")

    courses_seed = [
        (1, 'NLP', 'nlp-specialization', 'Applied AI', 'Advanced Level', '8 Weeks', 'Specialization', 4.90, '0', 'New',
         'Natural Language Processing fundamentals and advanced architectures.',
         'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
         '["Transformers", "Attention", "BERT"]', 1),
        (2, 'Distributed Cloud Architecture & High-Throughput Systems', 'distributed-cloud-architecture', 'Cloud Architecture', 'Advanced Level', '10 Weeks', 'Specialization', 4.90, '28', 'Recently updated',
         'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets.',
         'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
         '["Distributed Systems", "Raft Consensus", "Cloud Architecture"]', 1),
        (3, 'Applied Machine Learning Engineering & Model Serving', 'applied-ml-engineering', 'Applied AI', 'Advanced Level', '6 Weeks', 'Professional Certificate', 4.95, '19', 'Top AI program',
         'Bridge the gap between model weights and production inference.',
         'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80',
         '["PyTorch", "Model Serving", "MLOps"]', 1),
        (4, 'Enterprise Cyber Defense & Zero-Day Threat Modeling', 'enterprise-cyber-defense', 'Cybersecurity', 'Advanced Level', '8 Weeks', 'Specialization', 4.88, '14', 'New',
         'Proactive threat modeling, attack surface reduction, and intrusion detection.',
         'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
         '["Threat Modeling", "Zero-Day Analysis", "SIEM"]', 1),
        (5, 'ddd', 'ddd-masters', 'Applied AI', 'Advanced Level', '12 Weeks', "Master's Program", 4.90, '2.8K', 'new',
         'Advanced engineering program track.',
         'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
         '["Systems Design"]', 1),
        (6, 'SS', 'ss-degree-track', 'Cloud Architecture', 'Advanced Level', '12 Weeks', 'Degree Track', 4.80, '2.8K', 'new',
         'Specialized degree track for scalable engineering.',
         'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
         '["High Throughput"]', 1)
    ]

    for cid, title, slug, cat, lvl, dur, ptype, rating, revs, badge, desc, thumb, skills, cby in courses_seed:
        cur.execute('''
            INSERT INTO courses (id, title, slug, category, level, duration, partner_type, rating, reviews_count, badge_text, description, thumbnail_url, skills, created_by, is_published, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
        ''', (cid, title, slug, cat, lvl, dur, ptype, rating, revs, badge, desc, thumb, skills, cby))

    # Enrollments for students (must be inserted after courses)
    cur.execute("INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at) VALUES (501, 4, 1, 'active', datetime('now'))")
    cur.execute("INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at) VALUES (502, 5, 1, 'active', datetime('now'))")
    cur.execute("INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at) VALUES (503, 9, 1, 'active', datetime('now'))")

    # 4. System Settings Baseline
    cur.executemany("INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)", [
        ('institute_name', 'Aaroha Academy & Technologies Inc.', 'Legal brand and academy entity title'),
        ('support_email', 'admissions@aaroha-inc.com', 'Primary support and communications inbox'),
        ('default_timezone', 'Asia/Kolkata', 'Global operational timezone'),
        ('currency_symbol', 'INR', 'Default transaction currency ISO code'),
        ('low_attendance_threshold_pct', '80', 'Threshold percentage triggering academic follow-up'),
        ('assignment_passing_pct', '75', 'Minimum deliverable grade for course completion'),
        ('email_delivery_provider', 'Direct Link Activation', 'Account activation and invitation dispatch mechanism')
    ])

    conn.commit()
    conn.close()
    print(f"SQLite database initialized successfully at: {db_path} ({os.path.getsize(db_path)} bytes)")

if __name__ == '__main__':
    init_db()
