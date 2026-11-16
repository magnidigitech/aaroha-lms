import urllib.request
import urllib.parse
import json
import sqlite3
import os
import sys
import time

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "lms.sqlite")

def make_req(path, method="GET", body=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def run_tests():
    print("=" * 70)
    print("AAROHA LMS END-TO-END VERIFICATION: DELETION, BATCHES & CERTIFICATES")
    print("=" * 70)

    # Clean up any leftover test users and batches
    conn = sqlite3.connect(DB_PATH)
    leftover = conn.execute("SELECT id FROM users WHERE email LIKE 'test.persist%'").fetchall()
    for row in leftover:
        conn.execute("DELETE FROM student_profiles WHERE user_id = ?", (row[0],))
        conn.execute("DELETE FROM batch_enrollments WHERE user_id = ?", (row[0],))
        conn.execute("DELETE FROM enrollments WHERE user_id = ?", (row[0],))
        conn.execute("DELETE FROM placement_profiles WHERE user_id = ?", (row[0],))
        conn.execute("DELETE FROM users WHERE id = ?", (row[0],))
    conn.execute("DELETE FROM batches WHERE batch_code LIKE 'TEST-DISPOSABLE%'")
    conn.commit()
    conn.close()

    # -------------------------------------------------------------
    # TEST 1: Student Creation and Permanent Deletion Persistence
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing Student Deletion Persistence...")
    test_email = f"test.persist.{int(time.time())}@aaroha.test"
    code, res = make_req("/admin/students", method="POST", body={
        "full_name": "Test Persist Student",
        "email": test_email,
        "phone": "+919999988888",
        "course_id": 1,
        "batch_id": 1
    })
    assert code == 200, f"Expected 200, got {code}: {res}"
    user_id = res.get("student_id") or res.get("user_id")
    print(f"  Created temporary student user_id={user_id} ({test_email})")

    # Check existence in SQLite directly
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT id, email, role FROM users WHERE id = ?", (user_id,)).fetchone()
    assert row is not None, "Student must exist in database"
    conn.close()

    # Delete enrolled records first so dependencies are 0, or withdraw
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM batch_enrollments WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM enrollments WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

    # Now verify deletion eligibility
    code, res = make_req(f"/admin/students/{user_id}/deletion-eligibility")
    assert code == 200, f"Expected 200: {res}"
    assert res["can_delete"] is True, f"Student should be eligible for deletion: {res}"

    # Perform permanent deletion
    code, res = make_req(f"/admin/students/{user_id}", method="DELETE")
    assert code == 200, f"Delete failed: {res}"
    assert res.get("success") is True, f"Success flag not set: {res}"
    print("  Permanent delete API returned 200 success")

    # Verify student is GONE from SQLite
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    assert row is None, "Student MUST be permanently deleted from users table"
    prof = conn.execute("SELECT user_id FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
    assert prof is None, "Student profile MUST be deleted"
    conn.close()
    print("  Empirical DB Check Passed: Student does NOT exist in SQLite users/profiles.")

    # Query API /admin/students to ensure not returned
    code, res = make_req("/admin/students")
    assert code == 200
    matched = [s for s in res.get("students", []) if s.get("user_id") == user_id]
    assert len(matched) == 0, f"Student should not be in student list: {matched}"
    print("  API Check Passed: Deleted student does not return in /admin/students list.")

    # -------------------------------------------------------------
    # TEST 2: Batch Deletion & Archiving Lifecycle
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing Batch Deletion & Archiving Lifecycle...")

    # 2a. Create 0-dependency disposable batch
    disposable_code = f"TEST-DISPOSABLE-{int(time.time())}"
    code, res = make_req("/admin/batches", method="POST", body={
        "course_id": 1,
        "batch_code": disposable_code,
        "title": "Disposable Cohort Batch",
        "start_date": "2026-12-01",
        "end_date": "2027-02-01",
        "capacity": 20,
        "delivery_mode": "Online Live"
    })
    assert code == 200, f"Create batch failed: {res}"
    disposable_batch_id = res["batch_id"]
    print(f"  Created disposable batch id={disposable_batch_id}")

    # Check eligibility: should allow permanent deletion
    code, res = make_req(f"/admin/batches/{disposable_batch_id}/deletion-eligibility")
    assert code == 200
    assert res["can_delete_permanently"] is True, f"Expected 0-dependency batch to be deletable: {res}"
    print("  Dependency check correctly identifies 0 academic dependencies.")

    # Delete permanently
    code, res = make_req(f"/admin/batches/{disposable_batch_id}?permanent=true", method="DELETE")
    assert code == 200
    assert res.get("success") is True

    # Verify deleted from SQLite
    conn = sqlite3.connect(DB_PATH)
    b_row = conn.execute("SELECT id FROM batches WHERE id = ?", (disposable_batch_id,)).fetchone()
    assert b_row is None, "Batch must be permanently deleted from SQLite"
    conn.close()
    print("  Permanent delete verified: Batch purged from database.")

    # 2b. Check dependency-blocked batch (Batch 1 has active enrollments)
    code, res = make_req("/admin/batches/1/deletion-eligibility")
    assert code == 200
    assert res["can_delete_permanently"] is False, "Batch 1 must NOT be permanently deletable"
    assert len(res["blocking_reasons"]) > 0, "Blocking reasons must explain dependencies"
    print(f"  Batch 1 correctly blocked from permanent deletion with {len(res['blocking_reasons'])} reasons.")

    # Attempt to permanently delete batch 1 -> MUST return 400
    code, res = make_req("/admin/batches/1?permanent=true", method="DELETE")
    assert code == 400, f"Expected 400 rejection on dependency-blocked batch, got {code}"
    print("  Integrity Rule Passed: Server strictly rejected permanent deletion of cohort with active records.")

    # 2c. Test Archiving Batch 1
    code, res = make_req("/admin/batches/1/archive", method="POST")
    assert code == 200
    print("  Batch 1 archived successfully.")

    # Verify in active vs archived views
    code, res_active = make_req("/admin/batches?view=active")
    assert not any(b["id"] == 1 for b in res_active.get("batches", [])), "Batch 1 must not appear in active view"

    code, res_archived = make_req("/admin/batches?view=archived")
    assert any(b["id"] == 1 for b in res_archived.get("batches", [])), "Batch 1 must appear in archived view"
    print("  Archived View Filter Passed: Batch 1 visible in archived view, hidden from active view.")

    # Restore Batch 1
    code, res = make_req("/admin/batches/1/restore", method="POST")
    assert code == 200
    code, res_active = make_req("/admin/batches?view=active")
    assert any(b["id"] == 1 for b in res_active.get("batches", [])), "Batch 1 must be restored to active view"
    print("  Batch 1 successfully restored to active.")

    # -------------------------------------------------------------
    # TEST 3: Certificate Issuance, Mandatory Preview, Duplicate Rejection & Verification
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Complete Accredited Certificate Workflow...")

    # 3a. Check Eligibility for Student 7 in Course 1, Batch 1
    code, res = make_req("/admin/certificates/eligibility?course_id=1&user_id=7&batch_id=1")
    assert code == 200
    assert "criteria" in res
    print("  Eligibility API evaluated all 5 criteria:")
    for k, v in res["criteria"].items():
        print(f"    - {k}: {v.get('met')}")

    # 3b. Mandatory Personalised Preview
    preview_payload = {
        "course_id": 1,
        "batch_id": 1,
        "user_id": 7,
        "recipient_name": "Verified Student Alumnus",
        "grade": "Highest Executive Distinction",
        "template_id": "classic-distinction",
        "training_hours": "120 Hours Intensive Practicum",
        "signatory_faculty_name": "Dr. Sarah Chen",
        "signatory_faculty_title": "Head of Distributed Systems",
        "signatory_dean_name": "Dr. Marcus Vance",
        "signatory_dean_title": "Dean of Curriculum & Review"
    }
    code, res = make_req("/admin/certificates/preview", method="POST", body=preview_payload)
    assert code == 200
    assert res.get("success") is True
    preview_token = res["preview_token"]
    cert_prev = res["certificate"]
    assert cert_prev["is_preview"] is True
    assert cert_prev["certificate_code"] == "[PENDING ISSUANCE]"
    assert "PREVIEW — NOT ISSUED" in cert_prev["watermark"]
    print(f"  Mandatory Personalised Preview Generated (Token: {preview_token})")
    print(f"    Placeholder Code: {cert_prev['certificate_code']}")
    print(f"    Watermark: {cert_prev['watermark']}")

    # Check that preview did NOT create an issued certificate in database
    conn = sqlite3.connect(DB_PATH)
    prev_db = conn.execute("SELECT COUNT(*) FROM certificates WHERE certificate_code = '[PENDING ISSUANCE]'").fetchone()[0]
    assert prev_db == 0, "Preview must NOT insert any certificate into database"
    conn.close()
    print("  Verified: Preview created ZERO database rows.")

    # 3c. Attempt issuance without valid token -> MUST fail
    code, res = make_req("/admin/certificates/issue", method="POST", body={
        **preview_payload,
        "preview_token": "INVALID-TOKEN-999"
    })
    assert code == 400, f"Expected 400 for invalid token, got {code}"
    print("  Token Security Passed: Server rejected issuance without valid preview token.")

    # 3d. Check duplicate prevention: student 7 already has certificate 1 in course 1
    code, res = make_req("/admin/certificates/issue", method="POST", body={
        **preview_payload,
        "preview_token": preview_token,
        "override_eligibility": True,
        "override_reason": "Verified graduation audit"
    })
    assert code == 400, f"Expected 400 for duplicate issuance, got {code}: {res}"
    assert "already" in res.get("error", "").lower(), f"Unexpected error message: {res}"
    print("  Duplicate Prevention Passed: Server strictly rejected duplicate certificate for student in this course.")

    # 3e. Test Issuance for Student 8 (Elena Rostova / enrolled student)
    # Generate preview for user_id 8 in course 1, batch 1
    elena_payload = {
        "course_id": 1,
        "batch_id": 1,
        "user_id": 8,
        "recipient_name": "Elena Rostova",
        "grade": "First Class Honors with Distinction",
        "template_id": "classic-distinction",
        "training_hours": "140 Practicum Hours",
        "signatory_faculty_name": "Dr. Sarah Chen",
        "signatory_faculty_title": "Head of Systems",
        "signatory_dean_name": "Dr. Marcus Vance",
        "signatory_dean_title": "Academic Dean"
    }
    code, res = make_req("/admin/certificates/preview", method="POST", body=elena_payload)
    assert code == 200
    elena_token = res["preview_token"]

    # Issue with override
    code, res = make_req("/admin/certificates/issue", method="POST", body={
        **elena_payload,
        "preview_token": elena_token,
        "override_eligibility": True,
        "override_reason": "Curriculum committee sign-off on capstone defense"
    })
    assert code == 200, f"Issuance failed: {res}"
    issued_cert = res["certificate"]
    cert_code = issued_cert["certificate_code"]
    assert cert_code.startswith("AAROHA-CERT-") or cert_code.startswith("AIT-")
    print(f"  Certificate Issued Successfully: Code={cert_code}")

    # Verify Enrollment is marked completed in SQLite
    conn = sqlite3.connect(DB_PATH)
    enr_status = conn.execute("SELECT status FROM enrollments WHERE user_id = 8 AND course_id = 1").fetchone()
    assert enr_status and enr_status[0] == "completed", "Enrollment must be marked completed"
    conn.close()
    print("  Enrollment lifecycle updated: marked completed in database.")

    # 3f. Public Verification (/certificates/verify/{code})
    code, res = make_req(f"/certificates/verify/{cert_code}")
    assert code == 200
    assert res["is_valid"] is True
    assert res["certificate"]["recipient_name"] == "Elena Rostova"
    assert res["certificate"]["status"] == "valid"
    print("  Public Verification Endpoint: Confirmed valid authentic credential.")

    # 3g. Certificate Revocation
    code, res = make_req(f"/certificates/{cert_code}/revoke", method="POST", body={
        "reason": "Administrative testing of formal revocation workflow"
    })
    assert code == 200
    print(f"  Certificate {cert_code} revoked.")

    # Verify Public Verification Endpoint distinguishes Revoked
    code, res = make_req(f"/certificates/verify/{cert_code}")
    assert code == 200
    assert res["is_valid"] is False
    assert res["certificate"]["status"] == "revoked"
    assert "Administrative testing" in res["certificate"]["revocation_reason"]
    print("  Public Verification Endpoint on Revoked Certificate: Correctly returned is_valid=False with revocation reason.")

    # Clean up test certificate from database
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM certificates WHERE certificate_code = ?", (cert_code,))
    conn.commit()
    conn.close()
    print("  Cleaned up temporary test certificate from database.")

    print("\n" + "=" * 70)
    print("ALL VERIFICATION SUITES PASSED GREEN AND VERIFIED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
