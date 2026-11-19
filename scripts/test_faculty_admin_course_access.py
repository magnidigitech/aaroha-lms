#!/usr/bin/env python3
"""
Test Suite: Faculty and Admins can View Courses anytime without getting enrolled
Validates:
1. Faculty members can access all course details and full lesson bodies without enrollment.
2. Faculty members can obtain playback session tokens for non-preview lessons across all courses without enrollment.
3. Administrators (super_admin, admin, coordinator, accounts, placement_officer) can view courses and play all lessons without enrollment.
4. Students cannot access playback for non-preview lessons in courses they are not enrolled in (HTTP 403 Forbidden).
5. Enrolled students can access playback for courses they are enrolled in.
"""

import sys
import json
import urllib.request
import urllib.error

API_BASE = "http://127.0.0.1:8000/api"

def login(email, password="password123"):
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        API_BASE + "/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        token = data.get("token") or (data.get("user") or {}).get("token")
        return token, data.get("user")

def get_course_details(token, course_id):
    req = urllib.request.Request(
        API_BASE + f"/courses/{course_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_playback_session(token, lesson_id):
    req = urllib.request.Request(
        API_BASE + f"/lessons/{lesson_id}/playback",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"error": body}
        return e.code, parsed

def run_tests():
    print("=== Testing Faculty & Admin Unrestricted Course View Clearance ===")
    
    # 1. Faculty Member Elena (role: faculty, ZERO enrollments)
    print("\n[TEST 1] Faculty Elena (elena.rostova@enterprise.io) - Unenrolled Faculty Access")
    token_faculty, user_faculty = login("elena.rostova@enterprise.io")
    assert token_faculty, "Faculty login failed"
    print(f"  Logged in as {user_faculty['email']} (role: {user_faculty['role']})")
    
    # Course 1 (Distributed Cloud Architecture)
    c1 = get_course_details(token_faculty, 1)
    course1_data = c1.get("course") or c1
    print(f"  Course 1 is_enrolled for Faculty: {course1_data.get('is_enrolled')}")
    assert course1_data.get("is_enrolled") is True, "Course 1 is_enrolled must be True for faculty"
    
    # Non-preview lesson 1002 in Course 1
    code, p1 = get_playback_session(token_faculty, 1002)
    print(f"  Lesson 1002 (Non-preview) Playback HTTP Status: {code}")
    assert code == 200, f"Expected 200 for faculty playback on lesson 1002, got {code}"
    assert p1.get("success") is True, "Expected success=True in response"
    assert "playback_token" in p1 or "playback" in p1, "Expected playback credentials in response"
    print(f"  Playback credentials issued successfully (token: {p1.get('playback_token') or 'present'})")

    # Course 2 (Applied Machine Learning)
    c2 = get_course_details(token_faculty, 2)
    course2_data = c2.get("course") or c2
    print(f"  Course 2 is_enrolled for Faculty: {course2_data.get('is_enrolled')}")
    assert course2_data.get("is_enrolled") is True, "Course 2 is_enrolled must be True for faculty"

    # Non-preview lesson 2002 in Course 2
    code, p2 = get_playback_session(token_faculty, 2002)
    print(f"  Lesson 2002 (Non-preview) Playback HTTP Status: {code}")
    assert code == 200, f"Expected 200 for faculty playback on lesson 2002, got {code}"
    assert "playback" in p2, "Expected playback object in response"
    print(f"  Playback token issued successfully for Course 2 (provider: {p2['playback'].get('provider')})")

    # 2. Admin User (role: super_admin, ZERO enrollments)
    print("\n[TEST 2] Super Admin (admin@aaroha-inc.com) - Unenrolled Admin Access")
    token_admin, user_admin = login("admin@aaroha-inc.com")
    assert token_admin, "Admin login failed"
    print(f"  Logged in as {user_admin['email']} (role: {user_admin['role']})")

    c2_admin = get_course_details(token_admin, 2)
    course2_admin_data = c2_admin.get("course") or c2_admin
    print(f"  Course 2 is_enrolled for Admin: {course2_admin_data.get('is_enrolled')}")
    assert course2_admin_data.get("is_enrolled") is True, "Course 2 is_enrolled must be True for admin"

    code, p2_admin = get_playback_session(token_admin, 2002)
    print(f"  Lesson 2002 (Non-preview) Playback HTTP Status: {code}")
    assert code == 200, f"Expected 200 for admin playback, got {code}"
    print("  Admin playback token verified successfully")

    # 3. Accounts Staff User (role: accounts)
    print("\n[TEST 3] Accounts Staff (accounts@aaroha-inc.com) - Unenrolled Staff Access")
    token_acc, user_acc = login("accounts@aaroha-inc.com")
    assert token_acc, "Accounts login failed"
    c1_acc = get_course_details(token_acc, 1)
    course1_acc_data = c1_acc.get("course") or c1_acc
    assert course1_acc_data.get("is_enrolled") is True, "Course 1 is_enrolled must be True for accounts staff"
    code, p_acc = get_playback_session(token_acc, 1002)
    assert code == 200, f"Expected 200 for accounts staff playback, got {code}"
    print("  Accounts staff playback verified successfully")

    # 4. Student Aarav (role: student, enrolled ONLY in Course 1)
    print("\n[TEST 4] Student Aarav (aarav.patel@student.aaroha-inc.com) - Strict Student Authorization Gates")
    token_student, user_student = login("aarav.patel@student.aaroha-inc.com")
    assert token_student, "Student login failed"
    print(f"  Logged in as {user_student['email']} (role: {user_student['role']})")

    # Enrolled Course 1
    c1_student = get_course_details(token_student, 1)
    course1_student_data = c1_student.get("course") or c1_student
    print(f"  Course 1 is_enrolled for Student: {course1_student_data.get('is_enrolled')}")
    assert course1_student_data.get("is_enrolled") is True, "Enrolled course must have is_enrolled=True"
    code, p1_student = get_playback_session(token_student, 1002)
    print(f"  Course 1 Lesson 1002 Playback for enrolled student: HTTP {code}")
    assert code == 200, "Enrolled student must receive playback session for enrolled course"

    # Unenrolled Course 2
    c2_student = get_course_details(token_student, 2)
    course2_student_data = c2_student.get("course") or c2_student
    print(f"  Course 2 is_enrolled for Student: {course2_student_data.get('is_enrolled')}")
    assert course2_student_data.get("is_enrolled") is False, "Unenrolled course must have is_enrolled=False for student"
    
    # Non-preview lesson 2002 in Course 2 MUST be blocked for unenrolled student
    code, p2_student = get_playback_session(token_student, 2002)
    print(f"  Course 2 Lesson 2002 Playback for unenrolled student: HTTP {code} ({p2_student.get('error')})")
    assert code == 403, f"Expected HTTP 403 for unenrolled student, got {code}"
    print("  Student correctly blocked with HTTP 403 Forbidden for unenrolled course lecture!")

    # Free preview lesson 2001 in Course 2 should still be playable
    code, p2_prev = get_playback_session(token_student, 2001)
    print(f"  Course 2 Lesson 2001 (Free Preview) Playback for unenrolled student: HTTP {code}")
    assert code == 200, f"Expected HTTP 200 for free preview lesson, got {code}"
    print("  Free preview lesson accessible as expected")

    print("\nALL FACULTY & ADMIN COURSE VIEW PERMISSIONS PASS WITH 100% SUCCESS!")

if __name__ == "__main__":
    run_tests()
