import urllib.request
import urllib.error
import json

print("=== STARTING CANONICAL USER PURGE & CONSOLIDATION ON LIVE BACKEND ===")

# 1. Admin login
login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

def api_call(path, method='GET', payload=None):
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request('https://lms.aaroha-inc.com/api' + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_b = e.read().decode()
        return {'error': f"HTTP {e.code}: {err_b}"}
    except Exception as e:
        return {'error': str(e)}

# 2. Delete dummy students
dummy_student_ids = [59, 58, 57, 56, 55, 53, 52, 51, 50, 11, 12]
print("\n--- Deleting Dummy Student Accounts ---")
for sid in dummy_student_ids:
    res = api_call(f"/admin/students/{sid}", method='DELETE')
    print(f"Deleted Student {sid}: {res}")

# 3. Delete dummy faculty
dummy_faculty_ids = [4, 13, 2]
print("\n--- Deleting Dummy Faculty Accounts ---")
for fid in dummy_faculty_ids:
    res = api_call(f"/admin/faculty/{fid}", method='DELETE')
    print(f"Deleted Faculty {fid}: {res}")

# 4. Check / Provision canonical student@aaroha-inc.com
print("\n--- Ensuring Canonical Student Account (student@aaroha-inc.com) ---")
student_res = api_call("/admin/students", method='POST', payload={
    'full_name': 'Student Fellow',
    'email': 'student@aaroha-inc.com',
    'course_id': 9,
    'batch_id': 9,
    'mobile': '9876543210',
    'education': 'Bachelor of Technology in CS',
    'experience_years': '1'
})
print(f"Provisioned Canonical Student: {student_res}")

# Set known password for student@aaroha-inc.com if created
# Login directly to verify or set password
pw_check = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'student@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(pw_check) as resp:
        print("Canonical Student Login Test: SUCCESS (password123)")
except urllib.error.HTTPError as e:
    print(f"Setting password for student@aaroha-inc.com... ({e.code})")
    # Reset password via admin
    reset_res = api_call("/admin/users/generate-reset-link", method='POST', payload={'email': 'student@aaroha-inc.com'})
    print(f"Reset token generated: {reset_res.get('reset_token')}")
    if reset_res.get('reset_token'):
        r_tok = reset_res.get('reset_token')
        pw_reset_req = urllib.request.Request(
            'https://lms.aaroha-inc.com/api/auth/reset-password',
            data=json.dumps({'token': r_tok, 'password': 'password123'}).encode(),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(pw_reset_req) as pw_resp:
            print("Password set to password123:", pw_resp.read().decode())

# 5. Check / Provision canonical placement@aaroha-inc.com
print("\n--- Ensuring Canonical Placement Officer Account (placement@aaroha-inc.com) ---")
plc_create = api_call("/admin/users", method='POST', payload={
    'full_name': 'Deepa Nair',
    'email': 'placement@aaroha-inc.com',
    'password': 'password123',
    'role': 'placement_officer',
    'title': 'Senior Career & Placement Director'
})
print(f"Provisioned Placement User: {plc_create}")
plc_user = plc_create.get('user', {})
plc_id = plc_user.get('id')
if plc_id:
    role_upd = api_call(f"/admin/users/{plc_id}/role", method='PUT', payload={'role': 'placement_officer'})
    print(f"Updated Placement Role: {role_upd}")

# 6. Final Audit of All Live Users
print("\n=== FINAL AUDIT OF LIVE PRODUCTION USERS ===")
users_res = api_call("/admin/users")
for u in users_res.get('users', []):
    print(f"User {u.get('id')}: {u.get('email')} [{u.get('role')}] - {u.get('full_name')}")

print("\n=== FINAL AUDIT OF BATCH 9 STUDENTS ===")
b9_res = api_call("/admin/batches/9/students")
for s in b9_res.get('students', []):
    print(f"Batch 9 Student {s.get('id')}: {s.get('full_name')} ({s.get('email')}) - Code: {s.get('student_id_code')}")

print("\n=== FINAL AUDIT OF ATTENDANCE ROSTER (SESSION 1) ===")
att_res = api_call("/admin/attendance/session/1")
for r in att_res.get('roster', []):
    print(f"Roster Student {r.get('user_id')}: {r.get('full_name')} ({r.get('email')}) - Code: {r.get('student_id_code')}")

