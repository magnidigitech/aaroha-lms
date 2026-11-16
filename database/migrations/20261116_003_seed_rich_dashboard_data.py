# Seed realistic rich dashboard data for all roles in Aaroha LMS
import sqlite3
import os
import json

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lms.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Update users with authorized_roles, display_name, phone, timezone, preferences
users_meta = [
    (1, "Dr. Aris", "+91 98450 00001", "Asia/Kolkata", "en", 
     json.dumps(["super_admin", "admin", "coordinator", "faculty", "accounts", "placement_officer", "student"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "announcements": True, "fee_reminders": True, "placement_updates": True})),
    (2, "Prof. Elena", "+91 98450 00002", "Asia/Kolkata", "en",
     json.dumps(["faculty", "student"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "announcements": True})),
    (3, "Marcus", "+91 98450 00003", "Asia/Kolkata", "en",
     json.dumps(["faculty"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "announcements": True})),
    (4, "Priya", "+91 98450 00004", "Asia/Kolkata", "en",
     json.dumps(["coordinator", "faculty"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "announcements": True})),
    (5, "Rajesh", "+91 98450 00005", "Asia/Kolkata", "en",
     json.dumps(["accounts"]),
     json.dumps({"in_app": True, "email": True, "fee_reminders": True, "announcements": True})),
    (6, "Deepa", "+91 98450 00006", "Asia/Kolkata", "en",
     json.dumps(["placement_officer"]),
     json.dumps({"in_app": True, "email": True, "placement_updates": True, "announcements": True})),
    (7, "Aarav", "+91 98450 11223", "Asia/Kolkata", "en",
     json.dumps(["student"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "published_results": True, "announcements": True, "fee_reminders": True, "placement_updates": True})),
    (8, "Sneha", "+91 98765 43210", "Asia/Kolkata", "en",
     json.dumps(["student"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "published_results": True, "announcements": True, "fee_reminders": True, "placement_updates": True})),
    (9, "Karthik", "+91 99123 45678", "Asia/Kolkata", "en",
     json.dumps(["student"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "announcements": True, "fee_reminders": True})),
    (10, "Meera", "+91 97890 12345", "Asia/Kolkata", "en",
     json.dumps(["student"]),
     json.dumps({"in_app": True, "email": True, "class_reminders": True, "assignment_reminders": True, "announcements": True, "fee_reminders": True}))
]

for uid, dname, ph, tz, lang, auth_roles, notif_pref in users_meta:
    cur.execute("""
        UPDATE users 
        SET display_name = ?, phone = ?, timezone = ?, preferred_language = ?, authorized_roles_json = ?, notification_preferences_json = ?
        WHERE id = ?
    """, (dname, ph, tz, lang, auth_roles, notif_pref, uid))

# 2. Update Student Profiles with rich career & portfolio info
cur.execute("""
    UPDATE student_profiles
    SET skills = 'Distributed Systems, Go, Kubernetes, AWS, Raft, Docker, Kafka, PostgreSQL',
        career_interests = 'Cloud Infrastructure Architect, Systems Reliability Engineer',
        resume_url = 'https://storage.aaroha-inc.com/resumes/aarav_patel_cv.pdf',
        portfolio_url = 'https://aaravpatel.dev',
        github_url = 'https://github.com/aaravpatel',
        work_experience = 'Cloud Engineering Intern at Nutanix (2025-2026), Built automated cluster deployment tool with Go'
    WHERE user_id = 7
""")

cur.execute("""
    UPDATE student_profiles
    SET skills = 'Python, Microservices, Docker, Kafka, Terraform, AWS, Prometheus',
        career_interests = 'Backend Systems Engineer, Site Reliability Engineer',
        resume_url = 'https://storage.aaroha-inc.com/resumes/sneha_reddy_cv.pdf',
        portfolio_url = 'https://snehareddy.tech',
        github_url = 'https://github.com/snehareddy',
        work_experience = 'Junior Systems Analyst at Enterprise IO (2025-2026)'
    WHERE user_id = 8
""")

# 3. Update Faculty Profiles with bio, qualifications, links, availability
cur.execute("""
    UPDATE faculty_profiles
    SET bio = 'Senior Systems Architect and Distributed Computing Researcher with 14+ years designing fault-tolerant systems, Raft consensus engines, and kernel networking.',
        qualifications = 'Ph.D. in Computer Systems, M.S. in Distributed Networks',
        expertise = 'Distributed Consensus, Linux Kernel Networking, High-Performance Go, Service Mesh Security',
        professional_links_json = '{"linkedin": "https://linkedin.com/in/elena-rostova", "github": "https://github.com/elena-rostova", "scholar": "https://scholar.google.com/citations?user=elena_rostova"}',
        availability_json = '{"preferred_days": ["Monday", "Wednesday", "Friday"], "preferred_slots": ["14:00-16:00", "18:00-20:00"], "max_hours_per_week": 16}'
    WHERE user_id = 2
""")

cur.execute("""
    UPDATE faculty_profiles
    SET bio = 'Distinguished Cybersecurity Fellow and Principal Threat Architect with 16+ years defending global critical infrastructure and enterprise cloud perimeters.',
        qualifications = 'M.Tech in Information Security, CISSP, CEH Master',
        expertise = 'STRIDE Threat Modeling, Zero-Trust Architecture, eBPF Observability, Cryptographic Key Systems',
        professional_links_json = '{"linkedin": "https://linkedin.com/in/marcus-vance", "github": "https://github.com/marcus-vance"}',
        availability_json = '{"preferred_days": ["Tuesday", "Thursday"], "preferred_slots": ["11:00-13:00", "17:00-19:00"], "max_hours_per_week": 12}'
    WHERE user_id = 3
""")

# 4. Insert Lesson Progress
cur.execute("DELETE FROM lesson_progress WHERE enrollment_id IN (501, 502)")
cur.executemany("""
    INSERT INTO lesson_progress (enrollment_id, lesson_id, is_completed, completed_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
""", [
    (501, 1001),
    (501, 1002),
    (501, 1003),
    (502, 1001),
    (502, 1002)
])

# 5. Insert Task Submissions
cur.execute("DELETE FROM task_submissions WHERE enrollment_id IN (501, 502)")
cur.executemany("""
    INSERT INTO task_submissions (task_id, enrollment_id, submission_text, attachment_url, status, score, feedback, graded_by, submitted_at, graded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", [
    (2001, 501, "Comprehensive Ingress architecture with BGP Anycast failover spec and health probes.", "https://storage.aaroha-inc.com/submissions/aarav_task1.pdf", "passed", 94, "Exemplary resilience architecture with precise failover latency analysis.", 1, "2026-11-10 14:00:00", "2026-11-12 11:30:00"),
    (2002, 501, "Raft consensus implementation with term election and log replication testbench.", "https://storage.aaroha-inc.com/submissions/aarav_task2.pdf", "under_review", None, None, None, "2026-11-15 16:30:00", None),
    (2001, 502, "Ingress failover specification and Envoy proxy configuration.", "https://storage.aaroha-inc.com/submissions/sneha_task1.pdf", "passed", 88, "Clear mTLS gateway flow with thorough timeout budgets.", 1, "2026-11-11 10:00:00", "2026-11-13 15:00:00")
])

# 6. Insert Certificate for Aarav Patel
cur.execute("DELETE FROM certificates WHERE user_id = 7")
cur.execute("""
    INSERT INTO certificates (certificate_code, course_id, user_id, recipient_name, recipient_email, course_title, issuer_id, issuer_name, issuer_title, grade, issued_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
    "AAR-CERT-2026-90812", 1, 7, "Aarav Patel", "aarav.patel@student.aaroha-inc.com",
    "Distributed Cloud Architecture & High-Throughput Systems",
    1, "Dr. Aris Thorne", "Director of Curriculum & Technical Operations",
    "Verified Distinction (94%)", "2026-11-14 18:00:00"
))

# 7. Add past completed class session with attendance records
cur.execute("""
    INSERT OR IGNORE INTO class_sessions (id, batch_id, faculty_id, topic, description, start_time, end_time, session_type, meeting_link, status)
    VALUES (101, 1, 1, 'Core Architecture Foundations & Linux Kernel Sockets', 'Initial cohort orientation and network layer foundations', '2026-11-10 18:00:00', '2026-11-10 20:00:00', 'Lecture', 'https://meet.google.com/aar-dca-live', 'completed')
""")
cur.execute("""
    INSERT OR IGNORE INTO class_sessions (id, batch_id, faculty_id, topic, description, start_time, end_time, session_type, meeting_link, status)
    VALUES (102, 1, 1, 'BGP Ingress Peering & Anycast Routing Deep Dive', 'Deep dive into BGP route propagation and edge gateways', '2026-11-12 18:00:00', '2026-11-12 20:00:00', 'Lecture', 'https://meet.google.com/aar-dca-live', 'completed')
""")

cur.execute("INSERT OR IGNORE INTO attendance_records (session_id, enrollment_id, user_id, status, marked_by) VALUES (101, 501, 7, 'present', 1)")
cur.execute("INSERT OR IGNORE INTO attendance_records (session_id, enrollment_id, user_id, status, marked_by) VALUES (101, 502, 8, 'present', 1)")
cur.execute("INSERT OR IGNORE INTO attendance_records (session_id, enrollment_id, user_id, status, marked_by) VALUES (102, 501, 7, 'present', 1)")
cur.execute("INSERT OR IGNORE INTO attendance_records (session_id, enrollment_id, user_id, status, marked_by) VALUES (102, 502, 8, 'late', 1)")

# 8. Add sensitive audit logs for Super Admin
sensitive_audits = [
    (1, "admin@aaroha-inc.com", "super_admin", "user_role_updated", "user", "4", json.dumps({"target_user": "Priya Sharma", "new_role": "coordinator"}), "192.168.1.10"),
    (1, "admin@aaroha-inc.com", "super_admin", "certificate_issued", "certificate", "AAR-CERT-2026-90812", json.dumps({"student": "Aarav Patel", "grade": "Verified Distinction"}), "192.168.1.10"),
    (5, "accounts@aaroha-inc.com", "accounts", "payment_verified", "payment", "REC-2026-00101", json.dumps({"amount": 30000, "currency": "INR", "payer": "Aarav Patel"}), "192.168.1.15"),
    (4, "priya.sharma@aaroha-inc.com", "coordinator", "batch_created", "batch", "DCA-2026-B1", json.dumps({"course": "Distributed Cloud Architecture", "capacity": 30}), "192.168.1.20"),
    (1, "admin@aaroha-inc.com", "super_admin", "system_settings_updated", "system_settings", "timezone", json.dumps({"key": "default_timezone", "val": "Asia/Kolkata"}), "192.168.1.10")
]
cur.executemany("""
    INSERT INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, details_json, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
""", sensitive_audits)

# 9. Update system settings
settings_updates = [
    ("integration_bunny_stream", "connected", "Bunny Stream Video CDN API Status"),
    ("integration_smtp_gateway", "active_simulated", "SMTP Transactional Email Provider"),
    ("integration_payment_gateway", "active_inr", "Razorpay / UPI Payment Gateway Status"),
    ("integration_sms_gateway", "active_simulated", "SMS Notification Gateway Status"),
    ("default_timezone", "Asia/Kolkata", "Default System Timezone"),
    ("currency_symbol", "INR", "System Default Currency Code")
]
for k, v, d in settings_updates:
    cur.execute("""
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES (?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, description = excluded.description
    """, (k, v, d))

conn.commit()
print("Rich realistic seed data inserted successfully.")
conn.close()
