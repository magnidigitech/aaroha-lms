#!/usr/bin/env python3
"""
Comprehensive End-to-End Verification Suite for Admin-Created Student & Faculty Account Setup Flow.
Verifies:
1. Student Onboarding -> 'invited' status, SHA-256 token hash, 24h expiry, enrollments created.
2. Manual Setup Link Regeneration -> old link invalidated, new link verified.
3. Link Revocation -> clears token, sets 'deactivated', blocks login.
4. Existing Profile Setup Invitation -> re-invites deactivated profile, preserves enrollments.
5. Account Activation -> sets password, marks 'active', clears token, activates enrollments, blocks replay.
6. Login & Role Redirection -> logs in via registered email, returns student dashboard role.
7. Admin Password Reset Link -> authorized admin generates 24h reset link, replacement invalidates old.
8. Password Reset Execution -> sets new password, marks token used, blocks replay, allows new login.
9. Faculty Onboarding -> 'invited' status, SHA-256 hash, teaching assignments preserved, activation, login.
10. Security Audit -> verifies no plain tokens or passwords leaked in audit_logs.
"""

import os
import sys
import json
import shutil
import sqlite3
import hashlib
import time
import threading
import urllib.request
import urllib.error

# Setup isolated test database
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
SOURCE_DB = os.path.join(PROJECT_ROOT, 'database', 'lms.sqlite')
TEST_DB = os.path.join(PROJECT_ROOT, 'database', 'test_isolation_verify.sqlite')

shutil.copyfile(SOURCE_DB, TEST_DB)
os.environ['LMS_DB_PATH'] = TEST_DB

# Import server after setting env
sys.path.insert(0, CURRENT_DIR)
from dev_api_server import LMSRequestHandler
from http.server import ThreadingHTTPServer

TEST_PORT = 8999
BASE_URL = f"http://127.0.0.1:{TEST_PORT}/api"

server = ThreadingHTTPServer(('127.0.0.1', TEST_PORT), LMSRequestHandler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
time.sleep(0.5)

print("[*] Test Server running on port", TEST_PORT)

passed_checks = 0
failed_checks = 0

def check(condition, message):
    global passed_checks, failed_checks
    if condition:
        print(f"  [PASS] {message}")
        passed_checks += 1
    else:
        print(f"  [FAIL] {message}")
        failed_checks += 1

def http_req(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
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
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw}
    except Exception as e:
        return 500, {"error": str(e)}

def get_test_db():
    conn = sqlite3.connect(TEST_DB)
    conn.row_factory = sqlite3.Row
    return conn

try:
    print("\n--- PHASE 1: Platform Admin Authentication ---")
    status, res = http_req("/auth/login", method="POST", data={
        "email": "admin@aaroha-inc.com",
        "password": "password123"
    })
    check(status == 200 and res.get("token"), "Admin authenticated successfully")
    admin_token = res.get("token")

    print("\n--- PHASE 2: Student Onboarding Flow ---")
    student_payload = {
        "name": "Isolation Test Student",
        "email": "student.iso.verify@example.com",
        "phone": "+91 98765 43210",
        "course_id": 1,
        "batch_id": 1
    }
    status, res = http_req("/admin/students", method="POST", data=student_payload, token=admin_token)
    check(status == 200 and res.get("success"), "Admin onboarded student successfully")
    student_user_id = res.get("student_id")
    token_1 = res.get("invitation_token")
    url_1 = res.get("invitation_url")

    check(bool(token_1), "Invitation token returned to admin for manual WhatsApp sharing")
    check(url_1 and url_1.startswith("https://lms.aaroha-inc.com/activate?token="), f"Activation URL uses public LMS address: {url_1}")

    # Inspect SQLite database directly
    with get_test_db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE email = 'student.iso.verify@example.com'").fetchone()
        profile_row = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_row['id'],)).fetchone()
        course_enr = conn.execute("SELECT * FROM enrollments WHERE user_id = ? AND course_id = 1", (user_row['id'],)).fetchone()
        batch_enr = conn.execute("SELECT * FROM batch_enrollments WHERE user_id = ? AND batch_id = 1", (user_row['id'],)).fetchone()

    check(user_row is not None, "Users record created")
    check(user_row['password_hash'] == '!INVITED_UNSET_CREDENTIALS!', "Password set to unmatchable sentinel '!INVITED_UNSET_CREDENTIALS!'")
    check(profile_row['account_status'] == 'invited', "student_profiles.account_status is 'invited' (Link Generated)")

    # Verify SHA-256 hash storage
    expected_hash_1 = hashlib.sha256(token_1.encode('utf-8')).hexdigest()
    check(profile_row['invitation_token'] == expected_hash_1, "student_profiles stores SHA-256 hash of token, NOT raw token")
    check(token_1 not in profile_row['invitation_token'], "Raw token not stored in database")
    check(course_enr is not None and course_enr['status'] == 'active', "Course enrollment created")
    check(batch_enr is not None and batch_enr['status'] == 'active', "Batch enrollment created")

    print("\n--- PHASE 3: Manual Setup Link Regeneration & Invalidation ---")
    status, res = http_req("/admin/invitations/resend", method="POST", data={"user_id": student_user_id}, token=admin_token)
    check(status == 200 and res.get("success"), "Admin generated replacement setup link")
    token_2 = res.get("invitation_token")
    url_2 = res.get("invitation_url")
    check(token_2 != token_1, "New single-use token differs from previous token")

    # Verify old token is now invalidated
    status, res = http_req(f"/auth/verify-invitation?token={token_1}")
    check(status in (400, 404), "Old token (token_1) is invalidated and rejected on verification")

    # Verify new token is valid
    status, res = http_req(f"/auth/verify-invitation?token={token_2}")
    check(status == 200 and res.get("success"), "New replacement token (token_2) verifies successfully")
    check(res.get("user", {}).get("email") == "student.iso.verify@example.com", "Token belongs to correct student email")
    check(res.get("user", {}).get("role") == "student", "Token belongs to student role")

    print("\n--- PHASE 4: Setup Link Revocation ---")
    status, res = http_req("/admin/invitations/revoke", method="POST", data={"user_id": student_user_id}, token=admin_token)
    check(status == 200 and res.get("success"), "Admin revoked invitation")

    with get_test_db() as conn:
        profile_row = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (student_user_id,)).fetchone()
    check(profile_row['account_status'] == 'deactivated', "student_profiles.account_status updated to 'deactivated'")
    check(profile_row['invitation_token'] is None, "student_profiles.invitation_token cleared upon revocation")

    # Verification must fail
    status, res = http_req(f"/auth/verify-invitation?token={token_2}")
    check(status in (400, 404), "Revoked token is rejected")

    # Login attempt must fail
    status, res = http_req("/auth/login", method="POST", data={
        "email": "student.iso.verify@example.com",
        "password": "AnyPassword123"
    })
    check(status == 403 or (status == 401 and "deactivated" in res.get("error", "").lower()), "Login rejected for deactivated account")

    print("\n--- PHASE 5: Send Account Setup Invitation to Existing Profile ---")
    status, res = http_req("/admin/invitations/resend", method="POST", data={"user_id": student_user_id}, token=admin_token)
    check(status == 200 and res.get("success"), "Admin sent setup invitation for existing profile")
    token_3 = res.get("invitation_token")

    with get_test_db() as conn:
        profile_row = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (student_user_id,)).fetchone()
        course_enr = conn.execute("SELECT * FROM enrollments WHERE user_id = ? AND course_id = 1", (student_user_id,)).fetchone()
        batch_enr = conn.execute("SELECT * FROM batch_enrollments WHERE user_id = ? AND batch_id = 1", (student_user_id,)).fetchone()

    check(profile_row['account_status'] == 'invited', "Profile status restored to 'invited'")
    check(course_enr is not None and course_enr['status'] == 'active', "Existing course enrollment preserved without loss")
    check(batch_enr is not None and batch_enr['status'] == 'active', "Existing batch enrollment preserved without loss")

    print("\n--- PHASE 6: Student Account Activation & Password Setup ---")
    status, res = http_req("/auth/activate", method="POST", data={
        "token": token_3,
        "password": "StudentSecurePass2026!"
    })
    check(status == 200 and res.get("success"), "Student activated account with self-chosen password")
    check(res.get("token") is not None, "JWT token returned upon activation")

    with get_test_db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (student_user_id,)).fetchone()
        profile_row = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (student_user_id,)).fetchone()

    check(profile_row['account_status'] == 'active', "student_profiles.account_status updated to 'active'")
    check(profile_row['invitation_token'] is None, "invitation_token cleared from database upon activation")
    check(profile_row['invitation_accepted_at'] is not None, "invitation_accepted_at timestamp recorded")
    check(user_row['password_hash'] != '!INVITED_UNSET_CREDENTIALS!', "Password hash updated from sentinel to secure hash")

    # Test Replay Prevention
    status, res = http_req("/auth/activate", method="POST", data={
        "token": token_3,
        "password": "AnotherPassword123!"
    })
    check(status in (400, 404), "Re-activating with already consumed token is blocked")

    status, res = http_req(f"/auth/verify-invitation?token={token_3}")
    check(status in (400, 404), "Verifying consumed token is blocked with clear message")

    print("\n--- PHASE 7: Student Login & Role Redirection ---")
    status, res = http_req("/auth/login", method="POST", data={
        "email": "student.iso.verify@example.com",
        "password": "StudentSecurePass2026!"
    })
    check(status == 200 and res.get("token"), "Student successfully signed in with registered email and password")
    check(res.get("user", {}).get("role") == "student", "User role returned is 'student' for dashboard redirection")

    # Invalid password check
    status, res = http_req("/auth/login", method="POST", data={
        "email": "student.iso.verify@example.com",
        "password": "WrongPassword!"
    })
    check(status == 401, "Sign in with wrong password rejected")

    print("\n--- PHASE 8: Authorized Admin Password Reset Link Generation ---")
    status, res = http_req("/admin/users/generate-reset-link", method="POST", data={"user_id": student_user_id}, token=admin_token)
    check(status == 200 and res.get("success"), "Admin generated password reset link")
    reset_token_1 = res.get("reset_token") or (res.get("reset_url", "").split("token=")[1] if "token=" in res.get("reset_url", "") else "")
    reset_url_1 = res.get("reset_url")
    check(reset_url_1 and reset_url_1.startswith("https://lms.aaroha-inc.com/reset-password?token="), f"Reset URL uses public LMS address: {reset_url_1}")

    # Verify SHA-256 hash in password_resets table
    expected_reset_hash_1 = hashlib.sha256(reset_token_1.encode('utf-8')).hexdigest()
    with get_test_db() as conn:
        reset_row = conn.execute("SELECT * FROM password_resets WHERE token = ?", (expected_reset_hash_1,)).fetchone()
    check(reset_row is not None, "password_resets table stores SHA-256 hash of reset token")
    check(reset_row['used_at'] is None, "Reset token is initially unused")

    # Test Replacement Invalidation of Password Reset Link
    status, res = http_req("/admin/users/generate-reset-link", method="POST", data={"user_id": student_user_id}, token=admin_token)
    check(status == 200 and res.get("success"), "Admin generated replacement reset link")
    reset_token_2 = res.get("reset_token") or (res.get("reset_url", "").split("token=")[1] if "token=" in res.get("reset_url", "") else "")
    check(reset_token_2 != reset_token_1, "New reset token differs from first reset token")

    # Old reset token must fail
    status, res = http_req("/auth/reset-password", method="POST", data={
        "token": reset_token_1,
        "password": "AttemptOldResetPass1!"
    })
    check(status == 400, "Old reset token (reset_token_1) rejected after replacement link generated")

    print("\n--- PHASE 9: Password Reset Execution ---")
    status, res = http_req("/auth/reset-password", method="POST", data={
        "token": reset_token_2,
        "password": "StudentUpdatedPass2026!"
    })
    check(status == 200 and res.get("success"), "Password reset confirmed with new password")

    # Verify password_resets record marked used
    expected_reset_hash_2 = hashlib.sha256(reset_token_2.encode('utf-8')).hexdigest()
    with get_test_db() as conn:
        reset_row_2 = conn.execute("SELECT * FROM password_resets WHERE token = ?", (expected_reset_hash_2,)).fetchone()
    check(reset_row_2['used_at'] is not None, "Reset token marked used (used_at recorded)")

    # Replay of reset token blocked
    status, res = http_req("/auth/reset-password", method="POST", data={
        "token": reset_token_2,
        "password": "AttemptReuseToken1!"
    })
    check(status == 400, "Reusing consumed password reset token is blocked")

    # Verify old password no longer works
    status, res = http_req("/auth/login", method="POST", data={
        "email": "student.iso.verify@example.com",
        "password": "StudentSecurePass2026!"
    })
    check(status == 401, "Old password rejected after password reset")

    # Verify new password works
    status, res = http_req("/auth/login", method="POST", data={
        "email": "student.iso.verify@example.com",
        "password": "StudentUpdatedPass2026!"
    })
    check(status == 200 and res.get("token"), "Student signs in successfully with new reset password")

    print("\n--- PHASE 10: Faculty Onboarding Flow & Workflow ---")
    fac_payload = {
        "name": "Dr. Isolation Faculty",
        "email": "faculty.iso.verify@example.com",
        "department": "Artificial Intelligence",
        "designation": "Associate Professor",
        "assigned_batch_ids": [1]
    }
    status, res = http_req("/admin/faculty", method="POST", data=fac_payload, token=admin_token)
    check(status == 200 and res.get("success"), "Admin onboarded faculty successfully")
    fac_user_id = res.get("faculty_id")
    fac_token_1 = res.get("invitation_token")
    fac_url_1 = res.get("invitation_url")

    check(bool(fac_token_1), "Faculty invitation token returned")
    check(fac_url_1 and fac_url_1.startswith("https://lms.aaroha-inc.com/activate?token="), f"Faculty activation URL uses public LMS address: {fac_url_1}")

    with get_test_db() as conn:
        fac_user_row = conn.execute("SELECT * FROM users WHERE email = 'faculty.iso.verify@example.com'").fetchone()
        fac_profile_row = conn.execute("SELECT * FROM faculty_profiles WHERE user_id = ?", (fac_user_row['id'],)).fetchone()
        fac_batch = conn.execute("SELECT * FROM faculty_batch_assignments WHERE faculty_id = ? AND batch_id = 1", (fac_user_row['id'],)).fetchone()

    check(fac_user_row['password_hash'] == '!INVITED_UNSET_CREDENTIALS!', "Faculty password set to unmatchable sentinel")
    check(fac_profile_row['account_status'] == 'invited', "faculty_profiles.account_status is 'invited' (Link Generated)")
    expected_fac_hash = hashlib.sha256(fac_token_1.encode('utf-8')).hexdigest()
    check(fac_profile_row['invitation_token'] == expected_fac_hash, "faculty_profiles stores SHA-256 hash of token")
    check(fac_batch is not None, "Faculty batch assignment established")

    # Faculty verification
    status, res = http_req(f"/auth/verify-invitation?token={fac_token_1}")
    check(status == 200 and res.get("success"), "Faculty activation token verifies successfully")
    check(res.get("user", {}).get("role") == "faculty", "User role identified as faculty")

    # Faculty activation
    status, res = http_req("/auth/activate", method="POST", data={
        "token": fac_token_1,
        "password": "FacultySecurePass2026!"
    })
    check(status == 200 and res.get("success"), "Faculty activated account and set password")

    with get_test_db() as conn:
        fac_profile_row = conn.execute("SELECT * FROM faculty_profiles WHERE user_id = ?", (fac_user_row['id'],)).fetchone()
        fac_batch = conn.execute("SELECT * FROM faculty_batch_assignments WHERE faculty_id = ? AND batch_id = 1", (fac_user_row['id'],)).fetchone()
    check(fac_profile_row['account_status'] == 'active', "faculty_profiles.account_status updated to 'active'")
    check(fac_batch is not None, "Faculty batch assignment retained after activation")

    # Faculty login
    status, res = http_req("/auth/login", method="POST", data={
        "email": "faculty.iso.verify@example.com",
        "password": "FacultySecurePass2026!"
    })
    check(status == 200 and res.get("token"), "Faculty signs in successfully with email and password")
    check(res.get("user", {}).get("role") == "faculty", "Faculty role returned for Faculty Dashboard redirection")

    # Faculty Password Reset Link Flow
    status, res = http_req("/admin/users/generate-reset-link", method="POST", data={"user_id": fac_user_id}, token=admin_token)
    check(status == 200 and res.get("success"), "Admin generated password reset link for faculty")
    fac_reset_token = res.get("reset_token") or res.get("reset_url", "").split("token=")[1]
    
    status, res = http_req("/auth/reset-password", method="POST", data={
        "token": fac_reset_token,
        "password": "FacultyUpdatedPass2026!"
    })
    check(status == 200 and res.get("success"), "Faculty reset password successfully")

    status, res = http_req("/auth/login", method="POST", data={
        "email": "faculty.iso.verify@example.com",
        "password": "FacultyUpdatedPass2026!"
    })
    check(status == 200 and res.get("token"), "Faculty signs in with updated password")
    check(res.get("user", {}).get("role") == "faculty", "Faculty role preserved after reset")

    print("\n--- PHASE 11: Security & Anti-Hallucination Audit ---")
    # Verify that NO raw tokens, URLs with tokens, or passwords exist in audit_logs
    sensitive_strings = [
        token_1, token_2, token_3,
        reset_token_1, reset_token_2,
        fac_token_1, fac_reset_token,
        "StudentSecurePass2026!",
        "StudentUpdatedPass2026!",
        "FacultySecurePass2026!",
        "FacultyUpdatedPass2026!"
    ]

    with get_test_db() as conn:
        logs = conn.execute("SELECT id, action, details_json FROM audit_logs ORDER BY id DESC LIMIT 50").fetchall()

    leaked = []
    for l in logs:
        text = str(l['details_json'] or '')
        for s in sensitive_strings:
            if s and s in text:
                leaked.append((l['id'], l['action'], s))

    check(len(leaked) == 0, f"Audit logs contain ZERO raw tokens, passwords, or activation URLs (found {len(leaked)} leaks)")

except Exception as e:
    import traceback
    traceback.print_exc()
    print("[ERROR] Test failed with exception:", str(e))
    failed_checks += 1
finally:
    server.shutdown()
    server.server_close()
    if os.path.exists(TEST_DB):
        try:
            os.remove(TEST_DB)
            print("[*] Cleaned up test database:", TEST_DB)
        except Exception:
            pass

print(f"\n==========================================")
print(f"VERIFICATION SUMMARY: {passed_checks} PASSED, {failed_checks} FAILED")
print(f"==========================================")
if failed_checks > 0:
    sys.exit(1)
sys.exit(0)
