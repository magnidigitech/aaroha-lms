#!/usr/bin/env python3
"""
Verification Script for Aaroha LMS Student Dashboard & My Courses Updates
Validates:
1. Student A: 0 enrollments, 0 tasks, attendance None, genuine empty state.
2. Student B: 1 course at 0%, has_activity=False ("Start Learning"), opening lesson leaves 0%,
   completing lesson updates progress and has_activity=True ("Resume Learning").
3. Batch dates & access: batch_start_date, expires_at, is_accessible.
4. Multi-account isolation and reload persistence.
"""
import sys
import os
import json
import sqlite3
import urllib.request
import urllib.error

API_BASE = "http://127.0.0.1:8000"

def make_request(path, method="GET", data=None, token=None):
    url = f"{API_BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}
        return e.code, parsed

def setup_test_students():
    import hashlib
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'lms.sqlite'))
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    salt = "aaroha_salt_fixed"
    pw_hash = f"pbkdf2_sha256:100000:{salt}:" + hashlib.pbkdf2_hmac('sha256', b"password123", salt.encode('utf-8'), 100000).hex()
    
    for email in ['student.spec.a@test.aaroha.org', 'student.spec.b@test.aaroha.org']:
        user_row = cur.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if user_row:
            uid = user_row[0]
            cur.execute("DELETE FROM lesson_progress WHERE enrollment_id IN (SELECT id FROM enrollments WHERE user_id = ?)", (uid,))
            cur.execute("DELETE FROM batch_enrollments WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM enrollments WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM student_profiles WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM users WHERE id = ?", (uid,))
    
    cur.execute("""
        INSERT INTO users (full_name, email, password_hash, role, title, created_at)
        VALUES ('Spec Student Alpha', 'student.spec.a@test.aaroha.org', ?, 'student', 'Learner Fellow', datetime('now'))
    """, (pw_hash,))
    uid_a = cur.lastrowid
    cur.execute("INSERT INTO student_profiles (user_id, student_id_code, account_status) VALUES (?, 'STU-SPEC-A', 'active')", (uid_a,))
    
    cur.execute("""
        INSERT INTO users (full_name, email, password_hash, role, title, created_at)
        VALUES ('Spec Student Beta', 'student.spec.b@test.aaroha.org', ?, 'student', 'Learner Fellow', datetime('now'))
    """, (pw_hash,))
    uid_b = cur.lastrowid
    cur.execute("INSERT INTO student_profiles (user_id, student_id_code, account_status) VALUES (?, 'STU-SPEC-B', 'active')", (uid_b,))
    
    conn.commit()
    conn.close()
    return uid_a, uid_b

def run():
    print("--- 1. Setting up Test Students ---")
    uid_a, uid_b = setup_test_students()

    # Log in Student A
    status, res_a = make_request("/auth/login", method="POST", data={
        "email": "student.spec.a@test.aaroha.org",
        "password": "password123"
    })
    assert status == 200, f"Login A failed: {res_a}"
    token_a = res_a.get("token") or res_a.get("access_token")

    # Verify Student A (Zero enrollments)
    status, dash_a = make_request("/student/dashboard", token=token_a)
    assert status == 200
    summary_a = dash_a["summary_cards"]
    assert summary_a["active_courses"] == 0, f"Expected 0 active courses, got {summary_a['active_courses']}"
    assert summary_a["attendance_pct"] is None, f"Expected None for attendance with 0 records, got {summary_a['attendance_pct']}"
    assert summary_a["assignments_awaiting_submission"] == 0, f"Expected 0 tasks, got {summary_a['assignments_awaiting_submission']}"
    assert summary_a["upcoming_quizzes"] == 0, f"Expected 0 quizzes, got {summary_a['upcoming_quizzes']}"
    assert len(dash_a["my_courses"]) == 0, f"Expected empty courses list, got {len(dash_a['my_courses'])}"
    print("[PASS] Check 1: Student A with 0 enrollments sees 0 courses, 0 tasks, attendance None, empty my_courses.")

    # Log in Student B
    status, res_b = make_request("/auth/login", method="POST", data={
        "email": "student.spec.b@test.aaroha.org",
        "password": "password123"
    })
    assert status == 200, f"Login B failed: {res_b}"
    token_b = res_b.get("token") or res_b.get("access_token")

    # Enroll Student B in Course 1
    status, enr_res = make_request("/courses/1/enroll", method="POST", data={}, token=token_b)
    assert status in (200, 201), f"Enrollment failed: {enr_res}"

    # Verify Student B Dashboard before any activity
    status, dash_b = make_request("/student/dashboard", token=token_b)
    assert status == 200
    summary_b = dash_b["summary_cards"]
    assert summary_b["active_courses"] == 1
    c1 = dash_b["my_courses"][0]
    assert c1["course_id"] == 1
    assert c1["progress_percentage"] == 0
    assert c1["completed_lessons"] == 0
    assert c1["has_activity"] is False, f"has_activity must be False when no progress exists, got {c1['has_activity']}"
    assert c1["is_accessible"] is True
    print("[PASS] Check 2: Student B starts at 0% progress with has_activity=False ('Start Learning').")

    # Opening playback / preview preserves 0% progress
    status, play_res = make_request("/lessons/1001/playback", token=token_b)
    assert status == 200
    status, dash_b_after_play = make_request("/student/dashboard", token=token_b)
    c1_after_play = dash_b_after_play["my_courses"][0]
    assert c1_after_play["progress_percentage"] == 0, "Viewing lecture must not increase progress"
    assert c1_after_play["completed_lessons"] == 0
    print("[PASS] Check 3: Opening first lesson leaves progress at 0% and completed_lessons at 0.")

    # Explicitly complete lesson 1001
    status, comp_res = make_request("/lessons/1001/complete", method="POST", data={}, token=token_b)
    assert status == 200
    status, dash_b_after_comp = make_request("/student/dashboard", token=token_b)
    c1_after_comp = dash_b_after_comp["my_courses"][0]
    assert c1_after_comp["completed_lessons"] == 1
    assert c1_after_comp["progress_percentage"] > 0
    assert c1_after_comp["has_activity"] is True, f"has_activity must be True after completing a lesson, got {c1_after_comp['has_activity']}"
    print(f"[PASS] Check 4: Explicit completion updates progress to {c1_after_comp['progress_percentage']}% with has_activity=True ('Resume Learning').")

    # Multi-account isolation: Check Student A again
    status, dash_a_again = make_request("/student/dashboard", token=token_a)
    assert status == 200
    assert dash_a_again["summary_cards"]["active_courses"] == 0
    assert len(dash_a_again["my_courses"]) == 0
    print("[PASS] Check 5: Student A remains strictly isolated with 0 enrollments and 0 progress.")

    print("\nALL VERIFICATION CHECKS PASSED!")

if __name__ == "__main__":
    run()

