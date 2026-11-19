#!/usr/bin/env python3
"""
Test Suite: Student Enrollment, Progress Isolation, and Defaults Verification
Tests Aaroha LMS backend API contracts for:
1. Fresh student with 0 enrollments seeing genuine empty state (my_courses = [])
2. Unenrolled lesson completion blocking (HTTP 403)
3. New enrollment starting at 0% with 0 completed lessons
4. Lecture viewing/playback preserving 0% progress without auto-awarding completion
5. Explicit completion marking lesson 1 and updating progress idempotently without double-counting
6. Multi-student account isolation (Student A remains at 0 enrollments when Student B progresses)
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
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}
        return e.code, parsed

def setup_fresh_students():
    # Insert two test students into database/lms.sqlite if they don't exist
    import hashlib
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'lms.sqlite'))
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    salt = "aaroha_salt_fixed"
    pw_hash = f"pbkdf2_sha256:100000:{salt}:" + hashlib.pbkdf2_hmac('sha256', b"password123", salt.encode('utf-8'), 100000).hex()
    
    # Clean previous test run data
    for email in ['fresh.student.a@test.aaroha.org', 'fresh.student.b@test.aaroha.org']:
        user_row = cur.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if user_row:
            uid = user_row[0]
            cur.execute("DELETE FROM lesson_progress WHERE enrollment_id IN (SELECT id FROM enrollments WHERE user_id = ?)", (uid,))
            cur.execute("DELETE FROM batch_enrollments WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM enrollments WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM student_profiles WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM users WHERE id = ?", (uid,))
    
    # Insert Student A
    cur.execute("""
        INSERT INTO users (full_name, email, password_hash, role, title, created_at)
        VALUES ('Fresh Student Alpha', 'fresh.student.a@test.aaroha.org', ?, 'student', 'Student Fellow', datetime('now'))
    """, (pw_hash,))
    uid_a = cur.lastrowid
    cur.execute("INSERT INTO student_profiles (user_id, student_id_code, account_status) VALUES (?, 'STU-ALPHA', 'active')", (uid_a,))
    
    # Insert Student B
    cur.execute("""
        INSERT INTO users (full_name, email, password_hash, role, title, created_at)
        VALUES ('Fresh Student Beta', 'fresh.student.b@test.aaroha.org', ?, 'student', 'Student Fellow', datetime('now'))
    """, (pw_hash,))
    uid_b = cur.lastrowid
    cur.execute("INSERT INTO student_profiles (user_id, student_id_code, account_status) VALUES (?, 'STU-BETA', 'active')", (uid_b,))
    
    conn.commit()
    conn.close()
    return uid_a, uid_b

def run_tests():
    print("=== STARTING STUDENT ENROLLMENT & PROGRESS VERIFICATION ===")
    setup_fresh_students()

    # 1. Sign in Student A (fresh account, 0 enrollments)
    status, res_a = make_request("/auth/login", method="POST", data={
        "email": "fresh.student.a@test.aaroha.org",
        "password": "password123"
    })
    assert status == 200, f"Student A login failed: {res_a}"
    token_a = res_a.get("token") or res_a.get("access_token")
    user_a = res_a["user"]
    print(f"[PASS] Student A logged in: {user_a['email']} (ID {user_a['id']})")

    # 1.1 Verify Student A has 0 enrollments
    status, enr_a = make_request("/student/enrollments", token=token_a)
    assert status == 200, f"Get enrollments failed: {enr_a}"
    enrollments_a = enr_a.get("enrollments", [])
    assert len(enrollments_a) == 0, f"Fresh student A must have 0 enrollments, got: {enrollments_a}"
    print(f"[PASS] Student A has genuine 0 enrollments: {enrollments_a}")

    # 1.2 Verify Student A dashboard shows genuine empty state
    status, dash_a = make_request("/student/dashboard", token=token_a)
    assert status == 200, f"Get dashboard failed: {dash_a}"
    assert len(dash_a.get("my_courses", [])) == 0, f"Expected empty my_courses, got: {dash_a.get('my_courses')}"
    assert dash_a["summary_cards"]["active_courses"] == 0
    assert dash_a["summary_cards"]["course_completion_pct"] == "Not available yet"
    print("[PASS] Student A dashboard accurately returns empty my_courses and 'Not available yet'")

    # 1.3 Verify Student A cannot complete lesson 1001 without enrollment
    status, comp_err = make_request("/lessons/1001/complete", method="POST", data={}, token=token_a)
    assert status == 403, f"Expected HTTP 403 for unenrolled lesson complete, got {status}: {comp_err}"
    print(f"[PASS] Unenrolled lesson completion properly rejected with HTTP 403: {comp_err.get('error')}")

    # 2. Sign in Student B (separate fresh account, 0 enrollments)
    status, res_b = make_request("/auth/login", method="POST", data={
        "email": "fresh.student.b@test.aaroha.org",
        "password": "password123"
    })
    assert status == 200, f"Student B login failed: {res_b}"
    token_b = res_b.get("token") or res_b.get("access_token")
    user_b = res_b["user"]
    print(f"[PASS] Student B logged in: {user_b['email']} (ID {user_b['id']})")

    # 2.1 Enroll Student B in Course 1
    status, enr_res = make_request("/courses/1/enroll", method="POST", data={}, token=token_b)
    assert status in (200, 201), f"Enroll failed: {enr_res}"
    eid_b = enr_res.get("enrollment_id")
    assert eid_b, f"Missing enrollment_id: {enr_res}"
    print(f"[PASS] Student B enrolled in Course 1 (Enrollment ID {eid_b})")

    # 2.2 Verify Student B sees Course 1 in my_courses at 0%
    status, dash_b = make_request("/student/dashboard", token=token_b)
    assert status == 200
    my_courses_b = dash_b.get("my_courses", [])
    assert len(my_courses_b) == 1, f"Expected 1 enrolled course, got {len(my_courses_b)}"
    c1_dash = my_courses_b[0]
    assert c1_dash["course_id"] == 1
    assert c1_dash["completed_lessons"] == 0, f"Completed lessons must start at 0, got {c1_dash['completed_lessons']}"
    assert c1_dash["progress_percentage"] == 0, f"Progress must start at 0%, got {c1_dash['progress_percentage']}%"
    print(f"[PASS] Student B dashboard reflects exactly Course 1 at 0% progress (0/{c1_dash['total_lessons']} lessons)")

    # 2.3 Verify Course 1 details for Student B: starts at 0% progress, 0 completed lessons
    status, c_details = make_request("/courses/1", token=token_b)
    assert status == 200, f"Get course details failed: {c_details}"
    course = c_details["course"]
    assert course["is_enrolled"] is True, "Course should show is_enrolled = True"
    assert course.get("progress_percentage", 0) == 0, f"New enrollment must start at 0%, got {course.get('progress_percentage')}%"
    assert len(course.get("completed_lesson_ids", [])) == 0, f"New enrollment must have 0 completed lessons, got {course.get('completed_lesson_ids')}"
    
    # Check that individual lessons are all uncompleted
    for mod in course.get("modules", []):
        for les in mod.get("lessons", []):
            assert les.get("is_completed") is False, f"Lesson {les.get('id')} ({les.get('title')}) falsely marked completed!"
    print("[PASS] Course 1 details verified at 0% progress with all lessons uncompleted")

    # 2.4 Verify video playback / viewing does NOT silently mark lesson complete
    status, play_res = make_request("/lessons/1001/playback", token=token_b)
    assert status == 200, f"Playback failed: {play_res}"
    status, c_after_play = make_request("/courses/1", token=token_b)
    assert c_after_play["course"].get("progress_percentage", 0) == 0, "Viewing playback must NOT auto-complete lesson!"
    assert len(c_after_play["course"].get("completed_lesson_ids", [])) == 0, "completed_lesson_ids must remain empty after playback"
    print("[PASS] Lesson viewing / playback preserves 0% progress without awarding completion")

    # 2.5 Explicitly complete Lesson 1001
    status, comp_res = make_request("/lessons/1001/complete", method="POST", data={}, token=token_b)
    assert status == 200, f"Lesson completion failed: {comp_res}"
    assert 1001 in comp_res.get("completed_lesson_ids", []), f"Lesson 1001 missing from completed_lesson_ids: {comp_res}"
    assert comp_res.get("completed_lessons_count") == 1, f"Expected completed_lessons_count = 1, got {comp_res.get('completed_lessons_count')}"
    assert comp_res.get("progress_percentage") > 0, f"Progress should be > 0%, got {comp_res.get('progress_percentage')}%"
    print(f"[PASS] Lesson 1001 completed. Progress updated to {comp_res.get('progress_percentage')}% ({comp_res.get('completed_lessons_count')}/{comp_res.get('total_lessons_count')} lessons)")

    # 2.6 Idempotency: completing lesson 1001 a second time must NOT award progress twice
    status, comp_res2 = make_request("/lessons/1001/complete", method="POST", data={}, token=token_b)
    assert status == 200, f"Second completion failed: {comp_res2}"
    assert comp_res2.get("completed_lessons_count") == 1, f"Double-completion detected! Count was {comp_res2.get('completed_lessons_count')}"
    assert comp_res2.get("progress_percentage") == comp_res.get("progress_percentage"), "Double-completion increased progress %"
    print("[PASS] Re-completing lesson preserves progress idempotently without double-awarding")

    # 2.7 Verify Course 1 reflects exactly 1 completed lesson
    status, c_updated = make_request("/courses/1", token=token_b)
    assert 1001 in c_updated["course"].get("completed_lesson_ids", [])
    assert c_updated["course"].get("completed_lessons_count") == 1
    found_1001 = False
    for mod in c_updated["course"].get("modules", []):
        for les in mod.get("lessons", []):
            if les["id"] == 1001:
                assert les["is_completed"] is True, "Lesson 1001 should be completed"
                found_1001 = True
            else:
                assert les["is_completed"] is False, f"Lesson {les['id']} should remain uncompleted"
    assert found_1001, "Lesson 1001 not found in modules"
    print("[PASS] Course 1 lesson tree reflects exactly lesson 1001 completed")

    # 3. Multi-Account Isolation: Check Student A again
    status, dash_a_again = make_request("/student/dashboard", token=token_a)
    assert status == 200
    assert len(dash_a_again.get("my_courses", [])) == 0, "Student A must NOT see Student B's courses"
    assert dash_a_again["summary_cards"]["active_courses"] == 0
    print("[PASS] Multi-account isolation verified: Student A has not inherited Student B's course or progress")

    print("\n=== ALL TEST CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
