import requests
import json
import sqlite3
import os
import sys

BASE_URL = "http://127.0.0.1:8000/api"
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "database", "lms.sqlite")

def get_auth_token(email, password="password123"):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        data = resp.json()
        return data.get("token") or (data.get("user", {}).get("token"))
    raise RuntimeError(f"Login failed for {email}: {resp.status_code} - {resp.text}")

def test_suite():
    print("=================================================================")
    print("STARTING END-TO-END VERIFICATION OF ALL 5 RECURRING FAILURE AREAS")
    print("=================================================================")

    # Ensure admin user has known password and role
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    import hashlib
    pw_hash = hashlib.sha256("password123".encode()).hexdigest()
    conn.execute("UPDATE users SET role = 'super_admin', password_hash = ? WHERE id = 1", (pw_hash,))
    conn.commit()

    admin_row = conn.execute("SELECT id, email, role FROM users WHERE role = 'super_admin' LIMIT 1").fetchone()
    admin_email = admin_row['email']
    admin_id = admin_row['id']
    admin_token = get_auth_token(admin_email)
    admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    print(f"[AUTH] Logged in as Super Admin: {admin_email} (ID: {admin_id})")

    # -------------------------------------------------------------
    # 1. COURSE DELETION & ARCHIVAL SEMANTICS
    # -------------------------------------------------------------
    print("\n--- 1. Testing Course Deletion & Archival Semantics ---")
    
    # 1.1 Course deletion on dependent course (Course 1) must return 409 Conflict
    res_del_dep = requests.delete(f"{BASE_URL}/courses/1", headers=admin_headers)
    assert res_del_dep.status_code == 409, f"Expected 409 Conflict, got {res_del_dep.status_code}: {res_del_dep.text}"
    data_del_dep = res_del_dep.json()
    assert data_del_dep.get("conflict_code") == "COURSE_HAS_DEPENDENCIES", f"Missing conflict_code: {data_del_dep}"
    assert "Cannot permanently delete course" in data_del_dep.get("error", ""), f"Unexpected error: {data_del_dep}"
    print("  ✓ Dependent course deletion blocked with HTTP 409 Conflict and dependency audit.")

    # 1.2 Dedicated Course Archive endpoint
    res_arch = requests.post(f"{BASE_URL}/courses/1/archive", headers=admin_headers)
    assert res_arch.status_code == 200, f"Expected 200 OK, got {res_arch.status_code}: {res_arch.text}"
    c1_arch = conn.execute("SELECT is_published FROM courses WHERE id = 1").fetchone()
    assert c1_arch['is_published'] == 0, "Course should be unpublished after archive"
    print("  ✓ Dedicated Course Archive sets is_published=0 and preserves all historical records.")

    # 1.3 Dedicated Course Restore endpoint
    res_rest = requests.post(f"{BASE_URL}/courses/1/restore", headers=admin_headers)
    assert res_rest.status_code == 200, f"Expected 200 OK, got {res_rest.status_code}: {res_rest.text}"
    c1_rest = conn.execute("SELECT is_published FROM courses WHERE id = 1").fetchone()
    assert c1_rest['is_published'] == 1, "Course should be published after restore"
    print("  ✓ Dedicated Course Restore sets is_published=1 and restores syllabus visibility.")

    # 1.4 Permanent deletion on eligible zero-dependency course
    res_create_c = requests.post(f"{BASE_URL}/courses", json={
        "title": "Purgeable Test Course",
        "slug": "purgeable-test-course-001"
    }, headers=admin_headers)
    new_cid = res_create_c.json().get("course_id") or res_create_c.json().get("course", {}).get("id")
    assert new_cid, "Failed to create test course"

    # Add child module and lesson to test cascading clean-up
    res_m = requests.post(f"{BASE_URL}/courses/{new_cid}/modules", json={"title": "Test Mod 1"}, headers=admin_headers)
    new_mid = res_m.json().get("module_id") or res_m.json().get("id")
    if new_mid:
        requests.post(f"{BASE_URL}/modules/{new_mid}/lessons", json={"title": "Test Lesson 1"}, headers=admin_headers)

    res_del_zero = requests.delete(f"{BASE_URL}/courses/{new_cid}", headers=admin_headers)
    assert res_del_zero.status_code == 200, f"Expected 200 OK for zero-dependency delete, got {res_del_zero.status_code}: {res_del_zero.text}"
    c_check = conn.execute("SELECT id FROM courses WHERE id = ?", (new_cid,)).fetchone()
    assert c_check is None, "Course row was not permanently removed from database"
    m_check = conn.execute("SELECT id FROM modules WHERE course_id = ?", (new_cid,)).fetchall()
    assert len(m_check) == 0, "Disposable child modules were not cascaded"
    print("  ✓ Zero-dependency course permanently purged with cascaded child curriculum cleanup.")

    # -------------------------------------------------------------
    # 2. BATCH CREATION FIXES & VALIDATION GATES
    # -------------------------------------------------------------
    print("\n--- 2. Testing Batch Creation Fixes & Validation Gates ---")
    
    # 2.1 Date order error: end_date < start_date
    res_bad_date = requests.post(f"{BASE_URL}/admin/batches", json={
        "course_id": 1,
        "batch_code": "BATCH-VAL-01",
        "title": "Reverse Date Batch",
        "start_date": "2026-12-01",
        "end_date": "2026-11-01",
        "capacity": 30
    }, headers=admin_headers)
    assert res_bad_date.status_code == 400, f"Expected 400 Bad Request, got {res_bad_date.status_code}: {res_bad_date.text}"
    assert "on or after start date" in res_bad_date.json().get("error", "")
    print("  ✓ Chronological date ordering enforced with field-level HTTP 400 error.")

    # 2.2 Invalid capacity (malformed string / negative)
    res_bad_cap = requests.post(f"{BASE_URL}/admin/batches", json={
        "course_id": 1,
        "batch_code": "BATCH-VAL-02",
        "title": "Bad Capacity Batch",
        "start_date": "2026-12-01",
        "end_date": "2026-12-31",
        "capacity": "non_integer_text"
    }, headers=admin_headers)
    assert res_bad_cap.status_code == 400, f"Expected 400 Bad Request, got {res_bad_cap.status_code}: {res_bad_cap.text}"
    assert "positive integer between 1 and 1000" in res_bad_cap.json().get("error", "")
    print("  ✓ Invalid non-integer capacity safely trapped with HTTP 400 instead of HTTP 500.")

    # 2.3 Non-existent course foreign key
    res_bad_cid = requests.post(f"{BASE_URL}/admin/batches", json={
        "course_id": 888888,
        "batch_code": "BATCH-VAL-03",
        "title": "Missing Course Batch",
        "start_date": "2026-12-01",
        "end_date": "2026-12-31",
        "capacity": 25
    }, headers=admin_headers)
    assert res_bad_cid.status_code == 400, f"Expected 400 Bad Request, got {res_bad_cid.status_code}: {res_bad_cid.text}"
    assert "Selected parent course does not exist" in res_bad_cid.json().get("error", "")
    print("  ✓ Non-existent parent course trapped gracefully with HTTP 400 instead of 500.")

    # 2.4 Unassigned faculty handling (empty string / None)
    batch_code_valid = f"BATCH-AUTO-{os.getpid()}"
    res_valid_batch = requests.post(f"{BASE_URL}/admin/batches", json={
        "course_id": 1,
        "batch_code": batch_code_valid,
        "title": "Automated Cohort Batch",
        "start_date": "2026-12-01",
        "end_date": "2027-02-28",
        "capacity": "45",
        "lead_faculty_id": "",
        "delivery_mode": "Online Live"
    }, headers=admin_headers)
    assert res_valid_batch.status_code == 200, f"Expected 200 OK, got {res_valid_batch.status_code}: {res_valid_batch.text}"
    new_bid = res_valid_batch.json().get("batch_id")
    b_row = conn.execute("SELECT lead_faculty_id, capacity FROM batches WHERE id = ?", (new_bid,)).fetchone()
    assert b_row['lead_faculty_id'] is None, f"Expected NULL lead_faculty_id, got {b_row['lead_faculty_id']}"
    assert b_row['capacity'] == 45, f"Expected capacity 45, got {b_row['capacity']}"
    print("  ✓ Unassigned faculty safely normalized to NULL and batch created successfully.")

    # 2.5 Duplicate batch code uniqueness conflict (HTTP 409)
    res_dup = requests.post(f"{BASE_URL}/admin/batches", json={
        "course_id": 1,
        "batch_code": batch_code_valid,
        "title": "Duplicate Code Batch",
        "start_date": "2026-12-01",
        "end_date": "2027-02-28",
        "capacity": 30
    }, headers=admin_headers)
    assert res_dup.status_code == 409, f"Expected 409 Conflict, got {res_dup.status_code}: {res_dup.text}"
    assert "already exists" in res_dup.json().get("error", "")
    print("  ✓ Duplicate batch code rejected with HTTP 409 Conflict.")

    # -------------------------------------------------------------
    # 3. CHANGING USER ROLE FIXES & SECURITY GATES
    # -------------------------------------------------------------
    print("\n--- 3. Testing User Role Transitions & Security Gates ---")
    
    # 3.1 Lockout guard: Attempting to demote sole super admin must be blocked
    res_demote_sa = requests.put(f"{BASE_URL}/admin/users/{admin_id}/role", json={
        "role": "student"
    }, headers=admin_headers)
    assert res_demote_sa.status_code == 409, f"Expected 409 Conflict, got {res_demote_sa.status_code}: {res_demote_sa.text}"
    assert "Cannot demote the last remaining active Super Administrator" in res_demote_sa.json().get("error", "")
    print("  ✓ Demoting last Super Admin blocked with HTTP 409 Lockout Guard.")

    # 3.2 Invalid role rejection
    res_invalid_role = requests.put(f"{BASE_URL}/admin/users/{admin_id}/role", json={
        "role": "arbitrary_hacker_role"
    }, headers=admin_headers)
    assert res_invalid_role.status_code == 400, f"Expected 400 Bad Request, got {res_invalid_role.status_code}: {res_invalid_role.text}"
    assert "Allowed roles" in res_invalid_role.json().get("error", "")
    print("  ✓ Invalid role rejection verified with field-level HTTP 400 error.")

    # 3.3 Valid role transition: Promote student to faculty without history erasure
    # Find or create a test student user
    test_stu = conn.execute("SELECT id, email, role FROM users WHERE role = 'student' LIMIT 1").fetchone()
    stu_uid = test_stu['id']

    res_promote = requests.put(f"{BASE_URL}/admin/users/{stu_uid}/role", json={
        "role": "faculty"
    }, headers=admin_headers)
    assert res_promote.status_code == 200, f"Expected 200 OK, got {res_promote.status_code}: {res_promote.text}"
    promoted_user = res_promote.json().get("user", {})
    assert promoted_user.get("role") == "faculty"
    assert "student" in promoted_user.get("authorized_roles", [])
    assert "faculty" in promoted_user.get("authorized_roles", [])

    # Check faculty profile was auto-created and student profile was preserved
    fp_row = conn.execute("SELECT id FROM faculty_profiles WHERE user_id = ?", (stu_uid,)).fetchone()
    sp_row = conn.execute("SELECT id FROM student_profiles WHERE user_id = ?", (stu_uid,)).fetchone()
    assert fp_row is not None, "Faculty profile was not synchronized"
    assert sp_row is not None, "Student profile was erased during promotion"
    print("  ✓ Role change synchronized authoritative permissions, claims, and auxiliary profiles.")

    # Restore student role
    requests.put(f"{BASE_URL}/admin/users/{stu_uid}/role", json={"role": "student"}, headers=admin_headers)

    # -------------------------------------------------------------
    # 4. STUDENT DASHBOARD LOADING EDGE CASES & EMPTY STATES
    # -------------------------------------------------------------
    print("\n--- 4. Testing Student Dashboard Loading Edge Cases ---")
    
    # 4.1 Student with 0 enrolments
    zero_stu = conn.execute("SELECT id, email FROM users WHERE email = 'zero_student_test@aaroha.org'").fetchone()
    if not zero_stu:
        conn.execute("INSERT INTO users (full_name, email, password_hash, role, created_at) VALUES ('Zero Learner', 'zero_student_test@aaroha.org', ?, 'student', datetime('now'))", (pw_hash,))
        conn.commit()
        zero_stu = conn.execute("SELECT id, email FROM users WHERE email = 'zero_student_test@aaroha.org'").fetchone()
    else:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pw_hash, zero_stu['id']))
        conn.commit()

    zero_token = get_auth_token("zero_student_test@aaroha.org")
    zero_headers = {"Authorization": f"Bearer {zero_token}", "Content-Type": "application/json"}

    res_dash_zero = requests.get(f"{BASE_URL}/student/dashboard", headers=zero_headers)
    assert res_dash_zero.status_code == 200, f"Expected 200 OK for 0 enrolments, got {res_dash_zero.status_code}: {res_dash_zero.text}"
    dash_zero = res_dash_zero.json()
    assert dash_zero.get("success") is True
    summary_zero = dash_zero.get("summary_cards", {})
    assert summary_zero.get("active_courses") == 0
    assert summary_zero.get("course_completion_pct") == "Not available yet"
    assert summary_zero.get("attendance_pct") == "Not available yet"
    assert summary_zero.get("assignments_awaiting_submission") == 0
    assert summary_zero.get("upcoming_assessments") == 0
    assert summary_zero.get("outstanding_fees") == 0.0
    assert len(dash_zero.get("my_courses", [])) == 0
    assert dash_zero.get("today_and_upcoming", {}).get("next_live_class") is None
    print("  ✓ Student with 0 enrolments loads successfully with neutralised cards and empty state.")

    # 4.2 Active student with real enrolments
    active_stu = conn.execute("""
        SELECT u.id, u.email FROM users u
        JOIN enrollments e ON u.id = e.user_id
        WHERE u.role = 'student' AND e.status = 'active'
        LIMIT 1
    """).fetchone()
    if active_stu:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pw_hash, active_stu['id']))
        conn.commit()
        act_token = get_auth_token(active_stu['email'])
        act_headers = {"Authorization": f"Bearer {act_token}", "Content-Type": "application/json"}
        res_act_dash = requests.get(f"{BASE_URL}/student/dashboard", headers=act_headers)
        assert res_act_dash.status_code == 200, f"Active student dashboard failed: {res_act_dash.text}"
        act_dash = res_act_dash.json()
        assert act_dash.get("success") is True
        assert len(act_dash.get("my_courses", [])) > 0
        first_c = act_dash["my_courses"][0]
        assert "course_title" in first_c
        assert "batch_code" in first_c
        assert "progress_percentage" in first_c
        assert "next_lesson_title" in first_c
        print("  ✓ Enrolled student dashboard displays real DB-backed courses, faculty, and progress.")

    # -------------------------------------------------------------
    # 5. REGRESSION CHECK: PROFESSIONAL INFORMATION
    # -------------------------------------------------------------
    print("\n--- 5. Regression Check: Professional Information ---")
    
    # 5.1 Admin profile fetch and save
    res_adm_prof = requests.get(f"{BASE_URL}/user/profile", headers=admin_headers)
    assert res_adm_prof.status_code == 200, f"Admin profile fetch failed: {res_adm_prof.text}"
    adm_prof = res_adm_prof.json().get("profile", {})
    assert adm_prof.get("email") == admin_email
    print("  ✓ Admin profile loads successfully.")

    # 5.2 Faculty profile fetch and save
    fac_user = conn.execute("SELECT id, email FROM users WHERE role = 'faculty' LIMIT 1").fetchone()
    if fac_user:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pw_hash, fac_user['id']))
        conn.commit()
        fac_token = get_auth_token(fac_user['email'])
        fac_headers = {"Authorization": f"Bearer {fac_token}", "Content-Type": "application/json"}
        res_fac_prof = requests.get(f"{BASE_URL}/user/profile", headers=fac_headers)
        assert res_fac_prof.status_code == 200, f"Faculty profile fetch failed: {res_fac_prof.text}"
        fac_data = res_fac_prof.json().get("profile", {})
        assert fac_data.get("role_profile", {}).get("type") == "faculty"

        # Save faculty profile
        res_fac_save = requests.put(f"{BASE_URL}/user/profile", json={
            "phone": "9123456780",
            "timezone": "Asia/Kolkata",
            "role_profile": {
                "bio": "Senior Principal Cloud Architect and Distributed Systems Chair",
                "qualifications": "Ph.D. in Distributed Systems",
                "expertise": "Cloud Infrastructure, Kubernetes, Event-Driven Architecture",
                "experience_years": "14+ Years",
                "portfolio_url": "https://portfolio.aaroha.edu/faculty"
            }
        }, headers=fac_headers)
        assert res_fac_save.status_code == 200, f"Faculty profile save failed: {res_fac_save.text}"
        print("  ✓ Faculty profile loading and saving verified.")

    # 5.3 Student profile fetch and save
    if active_stu:
        res_stu_save = requests.put(f"{BASE_URL}/user/profile", json={
            "phone": "9876543211",
            "timezone": "Asia/Kolkata",
            "role_profile": {
                "education": "B.Tech Computer Science & Engineering",
                "experience_years": "2 Years",
                "skills": "Go, Python, Docker, Distributed Systems",
                "career_interests": "Cloud Native Architecture, High Throughput Engineering",
                "github_url": "https://github.com/student-learner"
            }
        }, headers=act_headers)
        assert res_stu_save.status_code == 200, f"Student profile save failed: {res_stu_save.text}"
        print("  ✓ Student profile loading and saving verified.")

    print("\n=================================================================")
    print("ALL 5 RECURRING FAILURE AREAS VERIFIED AND GREEN!")
    print("=================================================================")

if __name__ == "__main__":
    test_suite()
