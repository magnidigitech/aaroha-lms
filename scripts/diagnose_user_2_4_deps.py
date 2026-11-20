import urllib.request
import json

login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

# Let's inspect foreign keys or dependencies of user 2 and user 4
# We can check what tables reference user_id 2 or 4
tables_to_check = [
    'audit_logs', 'courses', 'batches', 'class_sessions', 'materials',
    'announcements', 'certificates', 'task_submissions', 'attendance_records',
    'enrollments', 'batch_enrollments', 'student_profiles', 'faculty_profiles',
    'placement_profiles', 'fee_plans', 'student_followups', 'password_resets',
    'faculty_batch_assignments'
]

# We can check via a custom diagnostic endpoint or check student eligibility
for uid in [2, 4]:
    print(f"\n--- Checking User {uid} ---")
    r = urllib.request.Request(f'https://lms.aaroha-inc.com/api/admin/students/{uid}/deletion-eligibility', headers=headers)
    try:
        with urllib.request.urlopen(r) as resp:
            print("Student eligibility:", resp.read().decode())
    except Exception as e:
        print("Student eligibility error:", e)

    r_f = urllib.request.Request(f'https://lms.aaroha-inc.com/api/admin/faculty/{uid}/deletion-eligibility', headers=headers)
    try:
        with urllib.request.urlopen(r_f) as resp:
            print("Faculty eligibility:", resp.read().decode())
    except Exception as e:
        print("Faculty eligibility error:", e)

