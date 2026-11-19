import urllib.request
import json

req = urllib.request.Request('https://lms.aaroha-inc.com/api/auth/login', data=json.dumps({
    'email': 'admin@aaroha-inc.com',
    'password': 'password123'
}).encode(), headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        admin_data = json.loads(resp.read().decode())
        admin_token = admin_data.get('token')
        print("[LIVE] Admin Login: SUCCESS")
        
        # Query Ryu's verified student record
        req_stu = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/students/54', headers={'Authorization': 'Bearer ' + admin_token})
        with urllib.request.urlopen(req_stu) as stu_resp:
            stu_data = json.loads(stu_resp.read().decode())
            student = stu_data.get('student', {})
            enrollments = student.get('enrollments', [])
            print(f"[LIVE] Student: {student.get('full_name')} ({student.get('email')}) ID: {student.get('id')}")
            print(f"[LIVE] Verified Genuine Enrollments Count: {len(enrollments)}")
            for enr in enrollments:
                print(f"  - Course ID {enr.get('course_id')}: {enr.get('course_title')}")
                print(f"    Enrollment ID: {enr.get('id')}, Enrolled: {enr.get('enrolled_at')}, Status: {enr.get('status')}")
                print(f"    Batch: {enr.get('batch_title')} (Code: {enr.get('batch_code')}, Start: {enr.get('batch_start_date')})")
except Exception as e:
    print("[LIVE] Error:", e)
