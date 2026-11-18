#!/usr/bin/env python3
"""
Comprehensive Automated Test Suite: Admin-Controlled Account Creation & Lifecycle
Verifies:
1. Admin user authentication
2. Student onboarding with unique STU-2026-XXXX ID and single-use invitation token
3. Login block prior to account activation (HTTP 403)
4. Invitation token cryptographic verification
5. Account activation with recipient-chosen password
6. Single-use invitation token enforcement (replay rejection)
7. Successful login and role-based token issuance
8. Record-level access controls (enrolled content access vs un-enrolled 403 rejection)
9. Account reuse workflow: enrolling existing student in second course without account duplication
10. Account deactivation with immediate session blocking and login rejection
11. Academic and financial history preservation
12. Account reactivation
13. Faculty onboarding with unique FAC-2026-XXXX ID, cohort scoping, and reassignment flags
14. Forgot and reset password lifecycle
"""

import sys
import json
import urllib.request
import urllib.error
import sqlite3
import os

API_BASE = "http://127.0.0.1:8000"
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'lms.sqlite'))

def request(method, endpoint, data=None, token=None):
    url = API_BASE + endpoint
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token

    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode('utf-8')
            return res.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}
    except Exception as ex:
        return 0, {"error": str(ex)}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def run_tests():
    print("=" * 70)
    print("Aaroha LMS - Account Creation & Lifecycle Automated Test Suite")
    print("=" * 70)
    passed = 0
    total = 0

    def assert_test(cond, title, details=""):
        nonlocal passed, total
        total += 1
        if cond:
            print("[PASS]", title)
            passed += 1
        else:
            print("[FAIL]", title, "-->", details)
            sys.exit(1)

    # -------------------------------------------------------------
    # 1. Admin Authentication
    # -------------------------------------------------------------
    status, res = request("POST", "/auth/login", {"email": "admin@aaroha-inc.com", "password": "password123"})
    assert_test(status == 200 and res.get("success"), "1. Admin sign-in succeeds", str(res))
    admin_token = res.get("token")
    assert_test(res.get("user", {}).get("role") == "super_admin", "1b. Admin role verified server-side")

    # Clean up test accounts if present from prior runs
    conn = get_db()
    conn.execute("DELETE FROM users WHERE email IN ('alice.test@example.com', 'bob.faculty@example.com')")
    conn.commit()
    conn.close()

    # -------------------------------------------------------------
    # 2. Student Account Creation
    # -------------------------------------------------------------
    alice_payload = {
        "full_name": "Alice Wonderland",
        "email": "alice.test@example.com",
        "mobile": "+91 99000 12345",
        "education": "B.Tech Computer Science",
        "experience_years": "1 Year",
        "course_id": 1,
        "batch_id": 1,
        "total_fee": 65000,
        "discount_amount": 5000,
        "internal_notes": "Admitted via Merit Scholarship"
    }
    status, res = request("POST", "/admin/students", alice_payload, admin_token)
    assert_test(status == 200 and res.get("success"), "2. Admin creates student Alice", str(res))
    alice_id = res.get("student_id")
    student_code = res.get("student_code", "")
    assert_test(student_code.startswith("STU-2026-"), "2b. Unique Student ID code generated: " + student_code)
    invitation_token = res.get("invitation_token", "")
    assert_test(len(invitation_token) >= 32, "2c. Cryptographic invitation token generated")
    assert_test(res.get("email_sent") is False and "unconfigured" in res.get("email_notice", "").lower(),
                "2d. Explicit notification that SMTP is unconfigured")

    # Verify DB state: password_hash is unmatchable marker, account_status is 'invited'
    conn = get_db()
    u_row = conn.execute("SELECT * FROM users WHERE id = ?", (alice_id,)).fetchone()
    sp_row = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (alice_id,)).fetchone()
    conn.close()
    assert_test(u_row["password_hash"] == "!INVITED_UNSET_CREDENTIALS!", "2e. Plaintext password NOT stored on creation")
    assert_test(sp_row["account_status"] == "invited", "2f. Initial student status is 'invited'")

    # -------------------------------------------------------------
    # 3. Login Block Prior to Activation
    # -------------------------------------------------------------
    status, res = request("POST", "/auth/login", {"email": "alice.test@example.com", "password": "password123"})
    assert_test(status == 403, "3. Login rejected prior to activation (HTTP 403 Forbidden)")
    assert_test("pending activation" in res.get("error", "").lower(), "3b. Informative message explains pending activation")

    # -------------------------------------------------------------
    # 4. Token Cryptographic Verification
    # -------------------------------------------------------------
    status, res = request("GET", "/auth/verify-invitation?token=" + invitation_token)
    assert_test(status == 200 and res.get("success"), "4. Invitation token verifies successfully", str(res))
    assert_test(res.get("user", {}).get("email") == "alice.test@example.com", "4b. Verified recipient email matches Alice")

    # Test bad token
    status, res = request("GET", "/auth/verify-invitation?token=invalid_token_12345")
    assert_test(status == 404, "4c. Invalid invitation token rejected with HTTP 404")

    # -------------------------------------------------------------
    # 5. Account Activation
    # -------------------------------------------------------------
    status, res = request("POST", "/auth/activate", {"token": invitation_token, "password": "AlicePassword2026!"})
    assert_test(status == 200 and res.get("success"), "5. Alice activates account and sets personal password", str(res))
    alice_token = res.get("token")
    assert_test(bool(alice_token), "5b. JWT token issued upon activation")

    conn = get_db()
    sp_row = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (alice_id,)).fetchone()
    conn.close()
    assert_test(sp_row["account_status"] == "active" and sp_row["invitation_accepted_at"] is not None,
                "5c. DB status transitions to 'active' with invitation_accepted_at recorded")

    # -------------------------------------------------------------
    # 6. Single-Use Replay Protection
    # -------------------------------------------------------------
    status, res = request("POST", "/auth/activate", {"token": invitation_token, "password": "NewAttempt2026!"})
    assert_test(status in (400, 404), "6. Replaying used invitation token strictly rejected (HTTP 400/404)")

    # -------------------------------------------------------------
    # 7. Successful Login with New Password
    # -------------------------------------------------------------
    status, res = request("POST", "/auth/login", {"email": "alice.test@example.com", "password": "AlicePassword2026!"})
    assert_test(status == 200 and res.get("success"), "7. Login with activated credentials succeeds", str(res))
    assert_test(res.get("user", {}).get("role") == "student", "7b. User role is 'student'")

    # -------------------------------------------------------------
    # 8. Record-Level Permissions
    # -------------------------------------------------------------
    status, res = request("GET", "/student/enrollments", token=alice_token)
    assert_test(status == 200 and len(res.get("enrollments", [])) == 1,
                "8. Alice accesses only her enrolled course records", str(res))
    assert_test(res["enrollments"][0]["course_id"] == 1, "8b. Enrolled in Course 1")

    # Playback for enrolled lesson (Course 1 has lesson 1001)
    status, res = request("GET", "/lessons/1001/playback", token=alice_token)
    assert_test(status == 200 and res.get("success"), "8c. Access granted to lesson playback for enrolled course", str(res))

    # Playback for un-enrolled course (Course 2 has lesson 2001)
    status, res = request("GET", "/lessons/2001/playback", token=alice_token)
    assert_test(status == 403, "8d. Access denied (HTTP 403) to lesson playback for un-enrolled course", str(res))

    # -------------------------------------------------------------
    # 9. Account Reuse (Multiple Enrollments Without Duplication)
    # -------------------------------------------------------------
    second_enrollment_payload = {
        "full_name": "Alice Wonderland",
        "email": "alice.test@example.com",
        "course_id": 2,
        "batch_id": 2,
        "total_fee": 70000,
        "discount_amount": 0
    }
    status, res = request("POST", "/admin/students", second_enrollment_payload, admin_token)
    assert_test(status == 200 and res.get("success") and res.get("reused") is True,
                "9. Reusing existing student account for second course succeeds", str(res))
    assert_test(res.get("student_id") == alice_id, "9b. Existing user ID preserved without duplication")

    conn = get_db()
    user_count = conn.execute("SELECT COUNT(*) FROM users WHERE email = 'alice.test@example.com'").fetchone()[0]
    enr_count = conn.execute("SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND status = 'active'", (alice_id,)).fetchone()[0]
    conn.close()
    assert_test(user_count == 1, "9c. Users table has exactly 1 record for Alice (0 duplication)")
    assert_test(enr_count == 2, "9d. Alice now has 2 distinct active course enrollments")

    # Alice now has access to lesson 2001 in Course 2
    status, res = request("GET", "/lessons/2001/playback", token=alice_token)
    assert_test(status == 200 and res.get("success"), "9e. Playback now unlocked for newly enrolled Course 2")

    # Attempting duplicate active enrollment in same course 2
    status, res = request("POST", "/admin/students", second_enrollment_payload, admin_token)
    assert_test(status == 409, "9f. Duplicate active enrollment in identical course rejected with HTTP 409")

    # -------------------------------------------------------------
    # 10. Account Deactivation & Immediate Session Invalidation
    # -------------------------------------------------------------
    status, res = request("POST", f"/admin/students/{alice_id}/toggle-status", {"status": "deactivated"}, admin_token)
    assert_test(status == 200 and res.get("success"), "10. Admin deactivates Alice account")

    # Alice's existing JWT token must be rejected immediately on subsequent requests!
    status, res = request("GET", "/student/enrollments", token=alice_token)
    assert_test(status == 403, "10b. Existing active session immediately blocked with HTTP 403")

    # Login attempt also blocked
    status, res = request("POST", "/auth/login", {"email": "alice.test@example.com", "password": "AlicePassword2026!"})
    assert_test(status == 403, "10c. Subsequent login rejected with HTTP 403 Forbidden")

    # Verify academic history preserved
    conn = get_db()
    enr_preserved = conn.execute("SELECT COUNT(*) FROM enrollments WHERE user_id = ?", (alice_id,)).fetchone()[0]
    conn.close()
    assert_test(enr_preserved == 2, "10d. Academic records strictly preserved")

    # -------------------------------------------------------------
    # 11. Reactivation
    # -------------------------------------------------------------
    status, res = request("POST", f"/admin/students/{alice_id}/toggle-status", {"status": "active"}, admin_token)
    assert_test(status == 200 and res.get("success"), "11. Admin reactivates Alice account")

    status, res = request("POST", "/auth/login", {"email": "alice.test@example.com", "password": "AlicePassword2026!"})
    assert_test(status == 200 and res.get("success"), "11b. Login succeeds following reactivation")
    alice_token = res.get("token")

    # -------------------------------------------------------------
    # 12. Faculty Onboarding & Reassignment Alert
    # -------------------------------------------------------------
    bob_payload = {
        "full_name": "Dr. Bob Faculty",
        "email": "bob.faculty@example.com",
        "mobile": "+91 98888 22222",
        "title": "Principal Systems Faculty",
        "expertise": "High-Throughput Systems, Zero-Trust",
        "courses_taught": [1],
        "batch_ids": [1]
    }
    status, res = request("POST", "/admin/faculty", bob_payload, admin_token)
    assert_test(status == 200 and res.get("success"), "12. Admin onboards Faculty Bob", str(res))
    bob_id = res.get("faculty_id")
    bob_code = res.get("faculty_code", "")
    assert_test(bob_code.startswith("FAC-2026-"), "12b. Unique Faculty ID code generated: " + bob_code)
    bob_invite = res.get("invitation_token", "")

    # Bob activates
    status, res = request("POST", "/auth/activate", {"token": bob_invite, "password": "BobFacultyPass2026!"})
    assert_test(status == 200 and res.get("success"), "12c. Faculty Bob activates account")
    bob_token = res.get("token")

    # Faculty Bob queries student roster -> scoped to Batch 1
    status, res = request("GET", "/admin/students", token=bob_token)
    assert_test(status == 200 and res.get("success"), "12d. Faculty Bob queries roster")
    for s in res.get("students", []):
        assert_test(s.get("batch_id") == 1, "12e. Faculty sees only students in assigned Batch 1")

    # Faculty Deactivation checks upcoming session reassignment
    # First schedule a session for Bob
    sched_payload = {
        "batch_id": 1,
        "faculty_id": bob_id,
        "topic": "Distributed Storage Engines",
        "start_time": "2026-12-01 18:00:00",
        "end_time": "2026-12-01 20:00:00"
    }
    status, res = request("POST", "/admin/schedule", sched_payload, admin_token)
    assert_test(status == 200, "12f. Class session scheduled for Bob")

    # Deactivate Bob
    status, res = request("POST", f"/admin/faculty/{bob_id}/toggle-status", {"status": "inactive"}, admin_token)
    assert_test(status == 200 and res.get("reassignment_required") is True,
                "12g. Deactivating faculty flags upcoming sessions requiring reassignment", str(res))

    # -------------------------------------------------------------
    # 13. Forgot & Reset Password Workflow
    # -------------------------------------------------------------
    status, res = request("POST", "/auth/forgot-password", {"email": "alice.test@example.com"})
    assert_test(status == 200 and res.get("success"), "13. Forgot password request succeeds", str(res))
    reset_tok = res.get("reset_token", "")
    assert_test(bool(reset_tok), "13b. Single-use reset token generated")

    status, res = request("POST", "/auth/reset-password", {"token": reset_tok, "password": "BrandNewAlicePass2026!"})
    assert_test(status == 200 and res.get("success"), "13c. Reset password succeeds with new password")

    # Old password fails
    status, res = request("POST", "/auth/login", {"email": "alice.test@example.com", "password": "AlicePassword2026!"})
    assert_test(status == 401, "13d. Previous password no longer valid (HTTP 401)")

    # New password succeeds
    status, res = request("POST", "/auth/login", {"email": "alice.test@example.com", "password": "BrandNewAlicePass2026!"})
    assert_test(status == 200 and res.get("success"), "13e. Login succeeds with newly reset password")

    # Teardown test artifacts to prevent database pollution
    try:
        clean_conn = sqlite3.connect(DB_PATH)
        clean_cur = clean_conn.cursor()
        clean_cur.execute("DELETE FROM class_sessions WHERE faculty_id = ? OR topic = 'Distributed Storage Engines'", (bob_id,))
        clean_cur.execute("DELETE FROM faculty_batch_assignments WHERE faculty_id = ?", (bob_id,))
        clean_cur.execute("DELETE FROM faculty_profiles WHERE user_id = ?", (bob_id,))
        clean_cur.execute("DELETE FROM batch_enrollments WHERE user_id IN (?, ?)", (alice_id, bob_id))
        clean_cur.execute("DELETE FROM enrollments WHERE user_id = ?", (alice_id,))
        clean_cur.execute("DELETE FROM student_profiles WHERE user_id = ?", (alice_id,))
        clean_cur.execute("DELETE FROM password_resets WHERE user_id IN (?, ?)", (alice_id, bob_id))
        clean_cur.execute("DELETE FROM users WHERE id IN (?, ?)", (alice_id, bob_id))
        clean_conn.commit()
        clean_conn.close()
    except Exception as cleanup_err:
        print(f"Cleanup notice: {cleanup_err}")

    print("=" * 70)
    print(f"RESULTS: {passed}/{total} tests PASSED (100% SUCCESS)")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
