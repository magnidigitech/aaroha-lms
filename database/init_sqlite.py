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

    # 3. Seed Realistic Enterprise LMS Data
    pw_hash = '$2y$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' # 'password123'
    cur.executemany("INSERT INTO users (id, full_name, email, password_hash, role, title, avatar, status, is_archived, authorized_roles_json) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)", [
        (1, 'Dr. Aris Thorne', 'admin@aaroha-inc.com', pw_hash, 'super_admin', 'Director of Curriculum & Technical Operations', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', '["super_admin","admin"]'),
        (2, 'Elena Rostova', 'elena.rostova@enterprise.io', pw_hash, 'faculty', 'Lead Systems & AI Faculty', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', '["faculty"]'),
        (3, 'Marcus Vance', 'marcus.vance@aaroha-inc.com', pw_hash, 'faculty', 'Chief Cyber Defense Architect', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', '["faculty"]'),
        (4, 'Priya Sharma', 'priya.sharma@aaroha-inc.com', pw_hash, 'coordinator', 'Senior Academic Coordinator & Operations Lead', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', '["coordinator"]'),
        (5, 'Rajesh Kulkarni', 'accounts@aaroha-inc.com', pw_hash, 'accounts', 'Finance & Bursar Officer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', '["accounts"]'),
        (6, 'Deepa Nair', 'placement@aaroha-inc.com', pw_hash, 'placement_officer', 'Head of Corporate Relations & Placements', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', '["placement_officer"]'),
        (7, 'Aarav Patel', 'aarav.patel@student.aaroha-inc.com', pw_hash, 'student', 'Associate Cloud Engineer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', '["student"]'),
        (8, 'Sneha Reddy', 'sneha.reddy@student.aaroha-inc.com', pw_hash, 'student', 'Systems Analyst Fellow', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', '["student"]'),
        (9, 'Karthik Raman', 'karthik.raman@student.aaroha-inc.com', pw_hash, 'student', 'DevOps Trainee Fellow', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80', '["student"]'),
        (10, 'Meera Joshi', 'meera.joshi@student.aaroha-inc.com', pw_hash, 'student', 'Cyber Security Apprentice', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', '["student"]')
    ])

    cur.executemany("""
    INSERT INTO courses (
        id, title, slug, category, level, duration, partner_type, rating, reviews_count,
        badge_text, description, thumbnail_url, skills, what_you_will_learn,
        prerequisites, about, instructor_name, instructor_title, instructor_department, instructor_bio, instructor_avatar,
        is_published, is_deleted, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, [
        (
            1,
            'Distributed Cloud Architecture & High-Throughput Systems',
            'distributed-cloud-architecture',
            'Cloud Architecture',
            'Advanced Level',
            '8 Weeks',
            'Specialization',
            4.90,
            '2.8K',
            'Best Seller',
            'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets.',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
            json.dumps(['Distributed Systems', 'Raft Consensus', 'BGP Anycast', 'mTLS & Zero-Trust', 'Kafka & CDC']),
            json.dumps(['Architect multi-region ingress gateways', 'Implement fault-tolerant state machines', 'Tune write-heavy storage engines']),
            'Distributed Systems Foundations & Linux kernel basics',
            'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets, Raft consensus, and transactional integrity.',
            'Dr. Aris Thorne',
            'Director of Curriculum & Distributed Systems Faculty',
            'Distributed Systems Group, Aaroha Institute',
            'Former Infrastructure Architect with 18+ years designing Tier-1 high-throughput hyper-scale services, distributed consensus engines, and kernel networking.',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            1,
            0,
            1
        ),
        (
            2,
            'Applied Machine Learning Engineering & Model Serving',
            'applied-ml-engineering',
            'Applied AI',
            'Advanced Level',
            '6 Weeks',
            'Professional Certificate',
            4.95,
            '1.9K',
            'Top Rated',
            'Bridge the gap between model weights and production inference with GPU optimization, quantization, and real-time monitoring.',
            'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80',
            json.dumps(['PyTorch', 'vLLM', 'Triton Server', 'TensorRT', 'Model Quantization (AWQ/GPTQ)']),
            json.dumps(['Optimize GPU inference kernels', 'Deploy dynamic batching on Triton', 'Quantize LLMs to 4-bit precision']),
            'Python, PyTorch & Basic Linear Algebra',
            'Build low-latency GPU serving pipelines, dynamic batching, AWQ quantization, and drift monitoring.',
            'Elena Rostova',
            'Senior Systems Architect & Applied AI Faculty',
            'Applied Intelligence Laboratory, Aaroha Institute',
            'Machine learning infrastructure engineer specializing in GPU kernel optimization and high-scale model serving.',
            'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
            1,
            0,
            1
        ),
        (
            3,
            'Enterprise Cyber Defense & Zero-Day Threat Modeling',
            'enterprise-cyber-defense',
            'Cybersecurity',
            'Advanced Level',
            '10 Weeks',
            'Specialization',
            4.88,
            '1.4K',
            'New',
            'Master application security and infrastructure defense against zero-day attack vectors.',
            'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
            json.dumps(['STRIDE Threat Modeling', 'Zero-Trust', 'eBPF Security Observability', 'Memory Safety']),
            json.dumps(['Execute enterprise-wide threat assessments', 'Build eBPF security monitors', 'Secure CI/CD supply chains']),
            'TCP/IP Networking & Linux Security Basics',
            'Master application security and infrastructure defense: threat modeling, memory-safe migration, cryptographic supply-chain security, and real-time incident triage.',
            'Marcus Vance',
            'Chief Information Security Architect & Faculty Chair',
            'Cyber Defense Center, Aaroha Institute',
            'Principal security researcher specializing in threat modeling, memory safety, and zero-trust cryptography.',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            1,
            0,
            1
        )
    ])

    cur.executemany("INSERT INTO modules (id, course_id, title, estimated_time, description, sequence_order) VALUES (?, ?, ?, ?, ?, ?)", [
        (101, 1, 'Module 1: Global Edge Routing & Zero-Trust Boundaries', '5 hours to complete', 'Explore ingress topology and Anycast BGP routing.', 1),
        (102, 1, 'Module 2: Distributed Consensus & State Storage', '6 hours to complete', 'Master Raft leader election and commit log safety.', 2),
        (103, 1, 'Module 3: Event Sourcing & High-Throughput Streaming', '5 hours to complete', 'Build change-data-capture pipelines and Kafka stream processors.', 3),
        (201, 2, 'Module 1: Kernel Optimization & Quantization Dynamics', '6 hours to complete', 'Analyze post-training quantization.', 1),
        (301, 3, 'Module 1: Threat Modeling & Supply-Chain Attestation', '6 hours to complete', 'Understand STRIDE risk modeling.', 1)
    ])

    cur.executemany("INSERT INTO lessons (id, module_id, title, content_type, duration, content_body, media_url, sequence_order, is_free_preview) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1001, 101, 'Multi-Region Anycast Topology & BGP Ingress Routing', 'video', '22 min', 'An in-depth analysis of global edge ingress networks.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1),
        (1002, 101, 'Mutual TLS (mTLS) & Ephemeral Identity in Microservices', 'article', '14 min read', 'Perimeter-only security models fail once an adversary establishes lateral mobility.', None, 2, 0),
        (1003, 102, 'Raft Consensus Protocol & Split-Brain Mitigation', 'video', '28 min', 'Stateful services require unambiguous truth. We unpack the Raft consensus algorithm with secure streaming video.', 'https://www.youtube.com/embed/R2-9sDYtOt4', 1, 0),
        (1004, 102, 'LSM Trees vs B-Trees in Modern Storage Engines', 'article', '18 min read', 'Choosing between Log-Structured Merge trees and traditional B+Trees.', None, 2, 0),
        (1005, 103, 'Transactional Outbox Pattern & CDC Stream Pipelines', 'article', '16 min read', 'Dual-write operations between a relational database and a message broker.', None, 1, 0),
        (2001, 201, 'FP16, INT8 & INT4 Quantization Dynamics', 'video', '25 min', 'Techniques for compressing deep neural network weights.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1),
        (2002, 201, 'KV-Cache Eviction & Paged Attention Mechanics', 'video', '20 min', 'Optimizing memory footprint during autoregressive decoding in LLM inference engines.', 'https://video.bunnycdn.com/play/312456/7b243b7e-9762-42fe-bd35-123456789abc', 2, 0),
        (3001, 301, 'STRIDE Threat Modeling for Cloud-Native Microservices', 'video', '24 min', 'Deconstructing real-world attack vectors against containerized microservices.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1)
    ])

    cur.executemany("INSERT INTO tasks (id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        (2001, 101, 'Assignment 1: Ingress Gateway Resiliency & Failover Specification', 'Draft an architectural RFC detailing a dual-region active-active ingress routing plan with health checks.', 'text_response', 100, 75, 1),
        (2002, 102, 'Assignment 2: Distributed State Machine & Consensus Implementation', 'Submit your benchmark repository link or technical report demonstrating a Raft cluster under split-brain test.', 'file_upload', 100, 80, 1)
    ])

    # 4. Batches
    cur.executemany("INSERT INTO batches (id, course_id, batch_code, title, start_date, end_date, capacity, delivery_mode, timezone, coordinator_id, lead_faculty_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 1, 'DCA-2026-B1', 'DCA Winter 2026 Live Cohort', '2026-01-10', '2026-03-15', 35, 'Online Live', 'Asia/Kolkata', 4, 1, 'active'),
        (2, 1, 'DCA-2026-B2', 'DCA Spring 2026 Weekend Cohort', '2026-04-05', '2026-06-10', 30, 'Hybrid', 'Asia/Kolkata', 4, 1, 'upcoming'),
        (3, 2, 'AML-2026-B1', 'Applied AI/ML Engineering Cohort A', '2026-02-01', '2026-04-15', 25, 'Online Live', 'Asia/Kolkata', 4, 2, 'active'),
        (4, 3, 'ECD-2026-B1', 'Cyber Defense Intensive Executive Cohort', '2026-02-15', '2026-05-01', 20, 'Classroom', 'Asia/Kolkata', 4, 3, 'active')
    ])

    # 5. Enrollments & Batch Enrolments
    cur.executemany("INSERT INTO enrollments (id, user_id, course_id, batch_id, status, enrolled_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", [
        (501, 7, 1, 1, 'active'),
        (502, 8, 1, 1, 'active'),
        (503, 9, 2, 3, 'active'),
        (504, 10, 3, 4, 'active')
    ])

    cur.executemany("INSERT INTO batch_enrollments (id, enrollment_id, user_id, batch_id, status) VALUES (?, ?, ?, ?, ?)", [
        (1, 501, 7, 1, 'active'),
        (2, 502, 8, 1, 'active'),
        (3, 503, 9, 3, 'active'),
        (4, 504, 10, 4, 'active')
    ])

    # 6. Faculty Batch Assignments
    cur.executemany("INSERT INTO faculty_batch_assignments (id, faculty_id, batch_id, role) VALUES (?, ?, ?, ?)", [
        (1, 1, 1, 'Lead Faculty'),
        (2, 2, 1, 'Systems Mentor'),
        (3, 2, 3, 'Lead Faculty'),
        (4, 3, 4, 'Lead Faculty')
    ])

    # 7. Student Profiles
    cur.executemany("INSERT INTO student_profiles (user_id, student_id_code, mobile, normalized_mobile, education, experience_years, admission_date, coordinator_id, account_status, admission_status, enrollment_status, payment_status, internal_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (7, 'STU-2026-001', '+91 98450 11223', '9845011223', 'B.Tech Computer Science, NIT Karnataka', '2.5 Years', '2026-01-05', 4, 'active', 'admitted', 'enrolled', 'paid', 'Strong background in Go and Linux containers. Eligible for fast-track placement.'),
        (8, 'STU-2026-002', '+91 98765 43210', '9876543210', 'B.E. Information Technology, Anna University', '3 Years', '2026-01-06', 4, 'active', 'admitted', 'enrolled', 'partially_paid', 'First installment received. Second installment pending next week.'),
        (9, 'STU-2026-003', '+91 99123 45678', '9912345678', 'M.Sc Data Science, University of Hyderabad', '1.5 Years', '2026-01-28', 4, 'active', 'admitted', 'enrolled', 'overdue', 'Attendance is below 75%. Follow-up call logged by coordinator.'),
        (10, 'STU-2026-004', '+91 97890 12345', '9789012345', 'B.Tech Electronics, VTU', '2 Years', '2026-02-10', 4, 'active', 'admitted', 'enrolled', 'paid', 'Interested in red team operations and cloud penetration testing.')
    ])

    # 8. Faculty Profiles
    cur.executemany("INSERT INTO faculty_profiles (user_id, faculty_id_code, mobile, expertise, courses_taught_json, availability_json, account_status, internal_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 'FAC-001', '+91 98111 22233', 'Distributed Systems, Raft Consensus, Linux Networking', json.dumps(['Distributed Cloud Architecture', 'High-Throughput Systems']), json.dumps(['Mon 18:00-21:00', 'Wed 18:00-21:00', 'Sat 10:00-14:00']), 'active', 'Founding faculty chair.'),
        (2, 'FAC-002', '+91 98222 33344', 'GPU Computing, Triton, PyTorch, LLM Quantization', json.dumps(['Applied Machine Learning', 'Model Serving']), json.dumps(['Tue 18:00-21:00', 'Thu 18:00-21:00', 'Sun 10:00-14:00']), 'active', 'Available for industry guest masterclasses.'),
        (3, 'FAC-003', '+91 98333 44455', 'Zero-Trust Networks, STRIDE, Kernel Security, eBPF', json.dumps(['Enterprise Cyber Defense', 'Zero-Day Threat Modeling']), json.dumps(['Fri 18:00-21:00', 'Sat 15:00-19:00']), 'active', 'Principal defensive security mentor.')
    ])

    # 9. Class Sessions
    cur.executemany("INSERT INTO class_sessions (id, batch_id, faculty_id, topic, description, start_time, end_time, session_type, meeting_link, classroom_location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 1, 1, 'Deep Dive: Anycast BGP Peering & Ingress Gateways', 'Live interactive lab on BGP router simulation and DNS failover.', '2026-11-16 10:00:00', '2026-11-16 12:00:00', 'Lecture', 'https://meet.google.com/aar-dca-live', 'Online Live Room 1', 'scheduled'),
        (2, 1, 1, 'Hands-on Lab: Raft Consensus Split-Brain Simulation', 'Injecting network partitions to test leader lease safety invariants.', '2026-11-16 14:00:00', '2026-11-16 16:30:00', 'Lab', 'https://meet.google.com/aar-dca-lab', 'Online Live Lab 2', 'scheduled'),
        (3, 3, 2, 'Triton Server Architecture & Dynamic Batching', 'Configuring ensemble models and low-latency concurrency pipelines.', '2026-11-16 17:00:00', '2026-11-16 19:00:00', 'Lecture', 'https://meet.google.com/aar-aml-live', 'Virtual Stage A', 'scheduled'),
        (4, 4, 3, 'STRIDE Threat Modeling on Real Microservices', 'Deconstructing authorization flaws and privilege escalation vectors.', '2026-11-17 11:00:00', '2026-11-17 13:00:00', 'Lecture', 'https://meet.google.com/aar-ecd-live', 'Security Lab 101', 'scheduled')
    ])

    # 10. Attendance Records
    cur.executemany("INSERT INTO attendance_records (id, session_id, enrollment_id, user_id, status, marked_by) VALUES (?, ?, ?, ?, ?, ?)", [
        (1, 1, 501, 7, 'present', 1),
        (2, 1, 502, 8, 'present', 1)
    ])

    # 11. Learning Materials
    cur.executemany("INSERT INTO learning_materials (id, title, description, material_type, file_url, external_url, file_size, file_type, course_id, batch_id, is_published, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 'DCA Reference Architecture Handbook v2.4', 'Comprehensive 120-page blueprint on distributed consensus and high-throughput topologies.', 'document', 'https://assets.aaroha-inc.com/materials/dca_handbook_v2.pdf', None, '4.2 MB', 'PDF', 1, 1, 1, 1),
        (2, 'Multi-Region Ingress Envoy Proxy Config Template', 'Production-tested Envoy configuration repository with mTLS filters.', 'link', None, 'https://github.com/aaroha-academy/envoy-multiregion-blueprint', 'Link', 'GitHub Repo', 1, 1, 1, 1),
        (3, 'Triton Model Serving Production Benchmark Dataset', 'Synthetic request distribution logs for stress-testing GPU inference queues.', 'document', 'https://assets.aaroha-inc.com/materials/triton_benchmarks.tar.gz', None, '18.5 MB', 'Archive', 2, 3, 1, 2)
    ])

    # 12. Fee Plans, Installments, Payments
    cur.executemany("INSERT INTO fee_plans (id, enrollment_id, user_id, course_id, total_fee, discount_amount, discount_reason, net_fee, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 501, 7, 1, 65000.00, 5000.00, 'Early Enrollment Merit Scholarship', 60000.00, 'INR', 'paid'),
        (2, 502, 8, 1, 65000.00, 0.00, None, 65000.00, 'INR', 'partially_paid'),
        (3, 503, 9, 2, 75000.00, 10000.00, 'Corporate Partner Subsidy', 65000.00, 'INR', 'overdue'),
        (4, 504, 10, 3, 70000.00, 0.00, None, 70000.00, 'INR', 'paid')
    ])

    cur.executemany("INSERT INTO fee_installments (id, fee_plan_id, installment_number, amount, due_date, status, paid_amount, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 1, 1, 30000.00, '2026-01-05', 'paid', 30000.00, '2026-01-05 11:20:00'),
        (2, 1, 2, 30000.00, '2026-02-05', 'paid', 30000.00, '2026-02-04 14:15:00'),
        (3, 2, 1, 35000.00, '2026-01-06', 'paid', 35000.00, '2026-01-06 09:30:00'),
        (4, 2, 2, 30000.00, '2026-02-28', 'pending', 0.00, None),
        (5, 3, 1, 35000.00, '2026-01-28', 'paid', 35000.00, '2026-01-28 16:40:00'),
        (6, 3, 2, 30000.00, '2026-02-15', 'overdue', 0.00, None),
        (7, 4, 1, 70000.00, '2026-02-10', 'paid', 70000.00, '2026-02-10 10:00:00')
    ])

    cur.executemany("INSERT INTO payments (id, fee_plan_id, installment_id, receipt_number, amount, payment_method, transaction_reference, payment_date, notes, received_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 1, 1, 'REC-2026-00101', 30000.00, 'Bank Transfer (NEFT/RTGS)', 'HDFC-NEFT-99238471', '2026-01-05', 'Full installment 1 cleared.', 5),
        (2, 1, 2, 'REC-2026-00142', 30000.00, 'UPI / QR', 'UPI-9845011223@okaxis', '2026-02-04', 'Course fee 100% fulfilled.', 5),
        (3, 2, 3, 'REC-2026-00108', 35000.00, 'Bank Transfer (NEFT/RTGS)', 'ICICI-NEFT-44120982', '2026-01-06', 'Seat reservation advance paid.', 5),
        (4, 3, 5, 'REC-2026-00122', 35000.00, 'Credit/Debit Card', 'CC-STRIPE-TXN-88124', '2026-01-28', 'Installment 1 paid.', 5),
        (5, 4, 7, 'REC-2026-00135', 70000.00, 'Bank Transfer (NEFT/RTGS)', 'SBI-RTGS-55410981', '2026-02-10', 'One-time upfront payment in full.', 5)
    ])

    # 13. Student Follow-ups
    cur.executemany("INSERT INTO student_followups (id, user_id, enrollment_id, batch_id, reason, description, assigned_to, priority, next_followup_date, status, resolution_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 9, 503, 3, 'overdue_fees', 'Installment 2 of INR 30,000 is 10 days past due. Sent reminder notice.', 5, 'high', '2026-11-18', 'open', None),
        (2, 9, 503, 3, 'low_attendance', 'Missed 3 consecutive live sessions on GPU dynamics. Student reported hospital leave.', 4, 'medium', '2026-11-19', 'in_progress', 'Coordinator shared recorded session links with student.'),
        (3, 8, 502, 1, 'missing_assignments', 'Assignment 2 deadline expired. Student requested 48-hour extension due to project release.', 4, 'low', '2026-11-20', 'in_progress', 'Granted 48h extension approved by Dr. Thorne.')
    ])

    # 14. Announcements
    cur.executemany("INSERT INTO announcements (id, title, content, target_type, target_id, author_id, priority, send_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 'Welcome to Aaroha Academy Winter 2026 Cohorts', 'All fellows are requested to review your syllabus and verify your development environment before today live sessions.', 'all_students', None, 1, 'important', 1, 'published'),
        (2, 'Masterclass: Kernel BPF Observability in Production', 'Guest masterclass featuring Brendan Gregg former colleague on Linux eBPF systems tracing this Saturday at 11:00 AM IST.', 'course', 1, 1, 'normal', 1, 'published'),
        (3, 'Faculty Sync: Mid-Term Evaluation Guidelines', 'Faculty mentors are requested to submit graded project rubrics for DCA Batch 1 by Friday evening.', 'faculty', None, 4, 'important', 0, 'published')
    ])

    # 15. Placement Profiles & Job Openings
    cur.executemany("INSERT INTO placement_profiles (user_id, resume_url, portfolio_url, github_url, linkedin_url, target_roles, skills, resume_review_status, readiness_score, readiness_checklist_json, mock_interview_feedback_json, placed_company, package_offered, placement_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (7, 'https://storage.aaroha-inc.com/resumes/aarav_patel.pdf', 'https://aaravpatel.dev', 'https://github.com/aaravpatel-cloud', 'https://linkedin.com/in/aarav-patel-cloud', 'Site Reliability Engineer, Cloud Infrastructure Architect', 'Go, Kubernetes, Terraform, Raft, AWS, Linux Kernel', 'approved', 92, json.dumps({'resume_reviewed': True, 'portfolio_verified': True, 'mock_interview_passed': True, 'capstone_completed': True}), json.dumps({'technical_rating': 9, 'communication_rating': 8, 'remarks': 'Excellent command over Raft consensus and Anycast edge networking.'}), 'Nutanix Cloud Systems', '24 LPA', 'placed'),
        (8, 'https://storage.aaroha-inc.com/resumes/sneha_reddy.pdf', 'https://snehareddy.tech', 'https://github.com/snehareddy', 'https://linkedin.com/in/sneha-reddy-sys', 'Distributed Systems Engineer, Backend Architect', 'Java, Distributed Caching, Kafka, Docker, GCP', 'approved', 85, json.dumps({'resume_reviewed': True, 'portfolio_verified': True, 'mock_interview_passed': True, 'capstone_completed': False}), json.dumps({'technical_rating': 8, 'communication_rating': 9, 'remarks': 'Clear explanations of transactional outbox pattern and CDC.'}), None, None, 'ready_for_interviews'),
        (9, 'https://storage.aaroha-inc.com/resumes/karthik_raman.pdf', None, 'https://github.com/karthik-ai', 'https://linkedin.com/in/karthik-raman-ml', 'ML Platform Engineer, Inference Optimization Engineer', 'PyTorch, Triton, CUDA, Python, Docker', 'needs_revision', 65, json.dumps({'resume_reviewed': False, 'portfolio_verified': False, 'mock_interview_passed': False, 'capstone_completed': False}), json.dumps({'technical_rating': 6, 'communication_rating': 7, 'remarks': 'Needs to add concrete benchmark metrics for AWQ quantization.'}), None, None, 'training')
    ])

    cur.executemany("INSERT INTO job_openings (id, company_name, company_logo, job_title, job_description, location, employment_type, experience_required, package_range, skills_required, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 'Razorpay Engineering', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80', 'Platform Infrastructure Engineer', 'Architect resilient multi-region payment routing gateways with 99.999% SLA.', 'Bangalore (Hybrid)', 'Full-time', '1-3 Years', '18 - 26 LPA', 'Distributed Systems, Go, Kubernetes, Kafka, Linux', '2026-12-15', 'active'),
        (2, 'Swiggy Tech', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=100&q=80', 'Senior Systems Software Fellow', 'Optimize low-latency dispatch and routing engines across 500+ microservices.', 'Bangalore (On-site)', 'Full-time', '2-4 Years', '22 - 32 LPA', 'Java, Go, High-Throughput Caching, gRPC, Redis', '2026-12-20', 'active'),
        (3, 'Atlassian Cloud R&D', 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=100&q=80', 'AI Model Serving Engineer', 'Deploy and monitor large-scale generative AI agents and inference clusters.', 'Remote / Bangalore', 'Full-time', '1-3 Years', '25 - 35 LPA', 'PyTorch, vLLM, TensorRT, Triton, Kubernetes', '2026-12-30', 'active')
    ])

    cur.executemany("INSERT INTO job_applications (id, job_opening_id, user_id, status, notes, interview_scheduled_at, feedback) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        (1, 1, 7, 'offered', 'Cleared 3 technical rounds and system design interview.', '2026-02-14 15:00:00', 'Candidate demonstrated remarkable grasp on Raft consensus.'),
        (2, 2, 8, 'technical_round', 'Online assessment passed with 95%. System design interview scheduled.', '2026-11-20 14:00:00', 'Coding test score: 100/100.')
    ])

    # 16. Support Tickets
    cur.executemany("INSERT INTO support_tickets (id, ticket_number, user_id, category, subject, description, priority, status, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 'TCK-2026-0041', 8, 'academic', 'Clarification on LSM Tree compaction in Module 2', 'In lecture 4, Dr. Thorne discussed Size-Tiered vs Leveled compaction. Could we have an example YAML for RocksDB tuning?', 'medium', 'in_progress', 1),
        (2, 'TCK-2026-0042', 9, 'technical', 'Unable to access Bunny Stream authenticated playback', 'Video player displays token verification error when entering from mobile safari.', 'high', 'resolved', 4)
    ])

    cur.executemany("INSERT INTO ticket_messages (id, ticket_id, sender_id, message, is_internal_note) VALUES (?, ?, ?, ?, ?)", [
        (1, 1, 8, 'In lecture 4, Dr. Thorne discussed Size-Tiered vs Leveled compaction. Could we have an example YAML for RocksDB tuning?', 0),
        (2, 1, 1, 'Investigating. I will upload a production RocksDB benchmark config to Learning Materials under DCA Batch 1.', 0),
        (3, 1, 4, 'Internal note: Dr. Thorne will cover this in doubt clearing session on Wednesday.', 1),
        (4, 2, 9, 'Video player displays token verification error when entering from mobile safari.', 0),
        (5, 2, 4, 'Resolved: We regenerated the signed token parameters with 24-hour expiration window. Please refresh.', 0)
    ])

    # 17. Audit Logs
    cur.executemany("INSERT INTO audit_logs (id, user_id, user_email, user_role, action, entity_type, entity_id, details_json, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1, 1, 'admin@aaroha-inc.com', 'super_admin', 'SYSTEM_INIT', 'system', '0', json.dumps({'message': 'Aaroha Academy LMS Enterprise Portal initialized.'}), '127.0.0.1'),
        (2, 1, 'admin@aaroha-inc.com', 'super_admin', 'CREATE_BATCH', 'batch', '1', json.dumps({'batch_code': 'DCA-2026-B1', 'capacity': 35}), '127.0.0.1'),
        (3, 4, 'priya.sharma@aaroha-inc.com', 'coordinator', 'ENROLL_STUDENT', 'enrollment', '501', json.dumps({'student': 'Aarav Patel', 'course_id': 1, 'batch_id': 1}), '127.0.0.1'),
        (4, 5, 'accounts@aaroha-inc.com', 'accounts', 'RECORD_PAYMENT', 'payment', '1', json.dumps({'receipt_number': 'REC-2026-00101', 'amount': 30000.00}), '127.0.0.1')
    ])

    # 18. System Settings
    cur.executemany("INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)", [
        ('institute_name', 'Aaroha Academy & Technologies Inc.', 'Legal brand and academy entity title'),
        ('support_email', 'admissions@aaroha-inc.com', 'Primary support and communications inbox'),
        ('default_timezone', 'Asia/Kolkata', 'Global operational timezone'),
        ('currency_symbol', 'INR', 'Default transaction currency ISO code'),
        ('low_attendance_threshold_pct', '80', 'Threshold percentage triggering academic follow-up'),
        ('assignment_passing_pct', '75', 'Minimum deliverable grade for course completion'),
        ('email_delivery_provider', 'Not Configured (Simulated Live Preview)', 'External SMTP or transactional mail provider status')
    ])

    conn.commit()
    conn.close()
    print(f"SQLite database initialized successfully at: {db_path} ({os.path.getsize(db_path)} bytes)")

if __name__ == '__main__':
    init_db()
