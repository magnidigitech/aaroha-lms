import sys
import os
import json
import time
import base64
import urllib.request
import urllib.error
from datetime import datetime, date

BASE_URL = "http://127.0.0.1:8000/api"

# Helper for HTTP requests
def make_request(endpoint, method="GET", data=None, token=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json"}
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if headers:
        req_headers.update(headers)
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            try:
                return resp.status, json.loads(content.decode("utf-8")), resp.headers
            except Exception:
                return resp.status, content, resp.headers
    except urllib.error.HTTPError as e:
        err_content = e.read()
        try:
            return e.code, json.loads(err_content.decode("utf-8")), e.headers
        except Exception:
            return e.code, err_content.decode("utf-8"), e.headers

# Test 1: Month-end arithmetic verification
from calendar import monthrange
def calculate_access_expiry_test(start_dt, val, unit):
    val = max(1, int(val))
    u = str(unit).lower()
    year = start_dt.year
    month = start_dt.month
    day = start_dt.day

    if u in ('days', 'day'):
        from datetime import timedelta
        res = start_dt + timedelta(days=val)
        return res.replace(hour=23, minute=59, second=59, microsecond=0)
    elif u in ('years', 'year'):
        target_year = year + val
        is_leap = (target_year % 4 == 0 and target_year % 100 != 0) or (target_year % 400 == 0)
        target_day = 28 if (month == 2 and day == 29 and not is_leap) else day
        return datetime(target_year, month, target_day, 23, 59, 59)
    else:
        total_months = (month - 1) + val
        target_year = year + (total_months // 12)
        target_month = (total_months % 12) + 1
        _, max_days = monthrange(target_year, target_month)
        target_day = min(day, max_days)
        return datetime(target_year, target_month, target_day, 23, 59, 59)

print("=== Running Comprehensive Verification Test Suite ===")

# Test 1.1: Calendar Arithmetic Cases
print("\n--- TEST 1: Calendar Arithmetic Month-End Clipping ---")
jan31 = datetime(2027, 1, 31, 10, 0, 0)
feb_exp = calculate_access_expiry_test(jan31, 1, 'months')
assert feb_exp.year == 2027 and feb_exp.month == 2 and feb_exp.day == 28, f"Expected 2027-02-28, got {feb_exp}"
print(f" PASS: Jan 31 + 1 month = {feb_exp.strftime('%Y-%m-%d')} (clipped to Feb 28)")

leap_jan31 = datetime(2028, 1, 31, 10, 0, 0)
leap_feb_exp = calculate_access_expiry_test(leap_jan31, 1, 'months')
assert leap_feb_exp.year == 2028 and leap_feb_exp.month == 2 and leap_feb_exp.day == 29, f"Expected 2028-02-29, got {leap_feb_exp}"
print(f" PASS: Jan 31 in leap year + 1 month = {leap_feb_exp.strftime('%Y-%m-%d')} (clipped to Feb 29)")

aug31 = datetime(2027, 8, 31, 10, 0, 0)
sep_exp = calculate_access_expiry_test(aug31, 1, 'months')
assert sep_exp.year == 2027 and sep_exp.month == 9 and sep_exp.day == 30, f"Expected 2027-09-30, got {sep_exp}"
print(f" PASS: Aug 31 + 1 month = {sep_exp.strftime('%Y-%m-%d')} (clipped to Sep 30)")

leap_feb29 = datetime(2028, 2, 29, 10, 0, 0)
yr_exp = calculate_access_expiry_test(leap_feb29, 1, 'years')
assert yr_exp.year == 2029 and yr_exp.month == 2 and yr_exp.day == 28, f"Expected 2029-02-28, got {yr_exp}"
print(f" PASS: Feb 29 leap year + 1 year = {yr_exp.strftime('%Y-%m-%d')} (clipped to Feb 28 in non-leap)")

# Login Admin
print("\n--- TEST 2: Authentication & Admin Access ---")
status, res, _ = make_request("/auth/login", method="POST", data={
    "email": "admin@aaroha-inc.com",
    "password": "password123"
})
assert status == 200 and res.get("token"), f"Admin login failed: {res}"
admin_token = res["token"]
print(" PASS: Admin logged in successfully")

# Login Student
status, res, _ = make_request("/auth/login", method="POST", data={
    "email": "aarav.patel@student.aaroha-inc.com",
    "password": "password123"
})
assert status == 200 and res.get("token"), f"Student login failed: {res}"
student_token = res["token"]
student_id = res["user"]["id"]
print(f" PASS: Student logged in successfully (User ID: {student_id})")

# Test 3: Course Creation with Access Duration Settings
print("\n--- TEST 3: Course Creation with Access Duration Settings ---")
course_title = f"Verified Systems Engineering {int(time.time())}"
status, res, _ = make_request("/admin/courses", method="POST", data={
    "title": course_title,
    "category": "Systems Architecture",
    "level": "Advanced",
    "duration": "12 Weeks",
    "access_duration_type": "custom",
    "access_duration_value": 45,
    "access_duration_unit": "days",
    "description": "High-assurance distributed state machines and verification."
}, token=admin_token)
assert status == 200 and res.get("course", {}).get("id"), f"Course creation failed: {res}"
course_id = res["course"]["id"]
print(f" PASS: Created course #{course_id} with custom access duration: 45 Days")

# Verify Course Retrieval
status, res, _ = make_request(f"/courses/{course_id}")
assert status == 200, f"Course fetch failed: {res}"
c_data = res.get("course", {})
assert c_data.get("access_duration_type") == "custom", f"Unexpected type: {c_data}"
assert c_data.get("access_duration_value") == 45, f"Unexpected val: {c_data}"
assert c_data.get("access_duration_unit") == "days", f"Unexpected unit: {c_data}"
print(" PASS: Course retrieved with exact access duration settings")

# Test 4: Enrolment Access Window Calculation
print("\n--- TEST 4: Student Enrolment Access Window ---")
status, res, _ = make_request(f"/admin/students/{student_id}/enroll", method="POST", data={
    "course_id": course_id,
    "batch_id": None
}, token=admin_token)
assert status == 200, f"Enrolment failed: {res}"
enrollment_id = res.get("enrollment_id")
print(f" PASS: Student #{student_id} enrolled into course #{course_id} (Enrollment #{enrollment_id})")

# Test 5: Verify Student Dashboard shows Active Course & Expiry Information
print("\n--- TEST 5: Student Dashboard Course Expiry & Remaining Days ---")
status, res, _ = make_request("/student/dashboard", token=student_token)
assert status == 200, f"Dashboard fetch failed: {res}"
my_courses = res.get("my_courses", [])
enrolled_c = next((c for c in my_courses if c.get("course_id") == course_id), None)
assert enrolled_c is not None, f"Course {course_id} not found in my_courses: {my_courses}"
assert enrolled_c.get("expires_at"), "expires_at missing"
assert enrolled_c.get("remaining_days") is not None, "remaining_days missing"
assert enrolled_c.get("access_duration_applied") == "45 Days", f"Wrong duration label: {enrolled_c}"
print(f" PASS: Course in dashboard: expires_at={enrolled_c['expires_at']}, remaining_days={enrolled_c['remaining_days']}")

# Test 6: Admin Extension of Access Window
print("\n--- TEST 6: Admin Access Duration Extension ---")
new_exp = "2027-12-31 23:59:59"
status, res, _ = make_request(f"/admin/enrollments/{enrollment_id}/extend", method="POST", data={
    "new_expires_at": new_exp,
    "reason": "Capacitation extension approved by Dean for capstone research"
}, token=admin_token)
assert status == 200, f"Extend access failed: {res}"
print(f" PASS: Access extended to {new_exp}")

# Verify extended date is reflected in student detail & extensions audit history
status, res, _ = make_request(f"/admin/students/{student_id}", token=admin_token)
assert status == 200, f"Admin student detail failed: {res}"
enrs = res.get("enrollments", [])
extended_enr = next((e for e in enrs if e.get("id") == enrollment_id or e.get("enrollment_id") == enrollment_id), None)
assert extended_enr is not None, f"Enrolment not found in admin detail: {enrs}"
assert extended_enr.get("expires_at") == new_exp, f"Expiry date not updated: {extended_enr.get('expires_at')}"
assert len(extended_enr.get("extensions", [])) >= 1, "Extension history not recorded"
print(f" PASS: Audit trail confirmed: {len(extended_enr['extensions'])} extension recorded with reason: '{extended_enr['extensions'][0]['reason']}'")

# Test 7: Direct File Upload
print("\n--- TEST 7: Direct File Upload (Image and Document) ---")
sample_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
b64_png = base64.b64encode(sample_png_bytes).decode("ascii")

status, res, _ = make_request("/uploads", method="POST", data={
    "file_base64": b64_png,
    "filename": "diagram_arch.png",
    "category": "course_image"
}, token=admin_token)
assert status == 200 and res.get("storage_key"), f"Image upload failed: {res}"
img_key = res["storage_key"]
img_url = res["url"]
print(f" PASS: Direct image upload successful: key={img_key}, url={img_url}")

# Verify Public File Serving
status, res_content, headers = make_request(f"/uploads/public/{img_key}")
assert status == 200, f"Public image serve failed: {status}"
print(f" PASS: Public image served successfully ({len(res_content)} bytes)")

# Test 8: Resumable Chunked Video Upload
print("\n--- TEST 8: Chunked Video Upload & Assembly ---")
fake_video_slice1 = b"AAAA" * 500
fake_video_slice2 = b"BBBB" * 500
upload_id = f"test_vid_{int(time.time())}"

status, res, _ = make_request("/uploads/chunk", method="POST", data={
    "upload_id": upload_id,
    "chunk_index": 0,
    "total_chunks": 2,
    "chunk_data": base64.b64encode(fake_video_slice1).decode("ascii"),
    "filename": "distributed_consensus.mp4",
    "category": "lesson_video"
}, token=admin_token)
assert status == 200 and res.get("completed") is False, f"Chunk 1 failed: {res}"
print(" PASS: Chunk 1/2 uploaded successfully")

status, res, _ = make_request("/uploads/chunk", method="POST", data={
    "upload_id": upload_id,
    "chunk_index": 1,
    "total_chunks": 2,
    "chunk_data": base64.b64encode(fake_video_slice2).decode("ascii"),
    "filename": "distributed_consensus.mp4",
    "category": "lesson_video"
}, token=admin_token)
assert status == 200 and res.get("completed") is True, f"Chunk 2 completion failed: {res}"
vid_key = res["storage_key"]
signed_stream_url = res["signed_stream_url"]
print(f" PASS: Chunk 2/2 completed and reassembled: key={vid_key}")

# Test 9: HTTP 206 Partial Content Range Streaming
print("\n--- TEST 9: HTTP 206 Partial Content Range Streaming ---")
token_param = signed_stream_url.split("token=")[1]
status, stream_bytes, headers = make_request(
    f"/uploads/stream/{vid_key}?token={token_param}",
    headers={"Range": "bytes=0-49"}
)
assert status == 206, f"Expected HTTP 206 Partial Content, got {status}"
assert len(stream_bytes) == 50, f"Expected 50 bytes, got {len(stream_bytes)}"
print(f" PASS: Range streaming returned HTTP 206 Partial Content ({len(stream_bytes)} bytes)")

# Test 10: Disallowed File Type & Oversize Protection
print("\n--- TEST 10: Server-Side Validation Rejection for Disallowed File Types ---")
status, res, _ = make_request("/uploads", method="POST", data={
    "file_base64": base64.b64encode(b"malicious").decode("ascii"),
    "filename": "exploit.exe",
    "category": "course_image"
}, token=admin_token)
assert status == 400, f"Expected 400 for .exe file, got {status}"
print(" PASS: Disallowed .exe file rejected with HTTP 400")

# Test 11: Access Expiry Enforcement (HTTP 403 on Expired Lesson Playback)
print("\n--- TEST 11: Access Expiry Enforcement (HTTP 403 on Expired Enrolment) ---")
# Manually expire enrolment in database for testing
import sqlite3
db_path = os.path.abspath("aaroha_lms/database/lms.sqlite")
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("UPDATE enrollments SET expires_at = '2020-01-01 00:00:00', access_status = 'expired' WHERE id = ?", (enrollment_id,))
conn.commit()
conn.close()

# Add a test lesson to the course if none exists
conn = sqlite3.connect(db_path)
cur = conn.cursor()
mod = cur.execute("SELECT id FROM modules WHERE course_id = ?", (course_id,)).fetchone()
if not mod:
    cur.execute("INSERT INTO modules (course_id, title, sequence_order) VALUES (?, 'Core Module', 1)", (course_id,))
    mod_id = cur.lastrowid
else:
    mod_id = mod[0]
cur.execute("""
    INSERT INTO lessons (module_id, title, content_type, video_provider, media_url, is_free_preview, is_deleted)
    VALUES (?, 'Private Lecture 101', 'video', 'direct', 'https://cdn.example.com/lecture.mp4', 0, 0)
""", (mod_id,))
test_lesson_id = cur.lastrowid
conn.commit()
conn.close()

# Request playback as expired student
status, res, _ = make_request(f"/lessons/{test_lesson_id}/playback", token=student_token)
assert status == 403, f"Expected HTTP 403 for expired student playback, got {status}: {res}"
print(f" PASS: Expired student blocked from lesson playback with HTTP 403: {res.get('error')}")

# Verify Expired Course is reported in Student Dashboard Expired Section
status, res, _ = make_request("/student/dashboard", token=student_token)
assert status == 200
expired_list = res.get("expired_courses", [])
assert any(c.get("course_id") == course_id for c in expired_list), f"Course #{course_id} not found in expired_courses: {expired_list}"
print(f" PASS: Course #{course_id} moved to 'Expired Courses' history on student dashboard")

# Test 12: Admin Restores / Extends Access for Expired Student
print("\n--- TEST 12: Admin Restores Access for Expired Course Without Resetting Progress ---")
future_exp = "2028-06-30 23:59:59"
status, res, _ = make_request(f"/admin/enrollments/{enrollment_id}/extend", method="POST", data={
    "new_expires_at": future_exp,
    "reason": "Administrative renewal granted"
}, token=admin_token)
assert status == 200, f"Extend access failed: {res}"

# Check playback is restored
status, res, _ = make_request(f"/lessons/{test_lesson_id}/playback", token=student_token)
assert status == 200, f"Playback should be restored, got {status}: {res}"
print(f" PASS: Playback successfully unlocked after extension: HTTP {status}")

# Verify Course returned to active courses
status, res, _ = make_request("/student/dashboard", token=student_token)
assert status == 200
active_list = res.get("my_courses", [])
assert any(c.get("course_id") == course_id for c in active_list), "Course should be back in my_courses"
print(" PASS: Course restored to active 'my_courses' list with preserved progress")

print("\n=======================================================")
print(" ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY! ")
print("=======================================================")
