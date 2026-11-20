import urllib.request
import urllib.error
import json
import time

print("Waiting for deployment ba41ed0 to complete on Hostinger...")

login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)

# Polling loop to wait for deploy and trigger cleanup
cleaned = False
for attempt in range(30):
    time.sleep(12)
    try:
        with urllib.request.urlopen(login_req) as resp:
            token = json.loads(resp.read().decode())['token']

        headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
        req = urllib.request.Request(
            'https://lms.aaroha-inc.com/api/admin/cleanup-dummy-data',
            data=json.dumps({}).encode(),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"Triggered /admin/cleanup-dummy-data: {data}")
            cleaned = True
            break
    except urllib.error.HTTPError as e:
        print(f"Attempt {attempt + 1}: HTTP {e.code}")
    except Exception as e:
        print(f"Attempt {attempt + 1}: {e}")

# Perform Full Empirical Audit
print("\n" + "="*60)
print("COMPREHENSIVE AUDIT OF LIVE PRODUCTION CANONICAL ACCOUNTS")
print("="*60)

with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token}

def get(path):
    r = urllib.request.Request('https://lms.aaroha-inc.com/api' + path, headers=headers)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'error': str(e)}

# 1. Users Directory
users_data = get('/admin/users')
users = users_data.get('users', [])
print(f"\n1. User Directory (Total: {len(users)})")
for u in users:
    print(f"   - User ID {u.get('id')}: {u.get('email')} [{u.get('role')}] — {u.get('full_name')}")

# 2. Students Directory
students_data = get('/admin/students')
students = students_data.get('students', [])
print(f"\n2. Student Directory (Total: {len(students)})")
for s in students:
    print(f"   - Student ID {s.get('id')}: {s.get('email')} — {s.get('full_name')} (Code: {s.get('student_id_code')})")

# 3. Faculty Directory
faculty_data = get('/admin/faculty')
faculty = faculty_data.get('faculty', [])
print(f"\n3. Faculty Directory (Total: {len(faculty)})")
for f in faculty:
    print(f"   - Faculty ID {f.get('id')}: {f.get('email')} — {f.get('full_name')} (Code: {f.get('faculty_id_code')})")

# 4. Batch 9 Enrolled Fellows
b9_data = get('/admin/batches/9/students')
b9_students = b9_data.get('students', [])
print(f"\n4. Batch 9 Enrolled Fellows (Total: {len(b9_students)})")
for b in b9_students:
    print(f"   - Enrolled: {b.get('full_name')} ({b.get('email')}) — Code: {b.get('student_id_code')}")

# 5. Session 1 Attendance Roster
att_data = get('/admin/attendance/session/1')
att_roster = att_data.get('roster', [])
print(f"\n5. Session 1 Attendance Roster (Total: {len(att_roster)})")
for r in att_roster:
    print(f"   - Roster Student {r.get('user_id')}: {r.get('full_name')} ({r.get('email')}) — Code: {r.get('student_id_code')}")

# 6. Test Login across all 5 canonical test roles + genuine accounts
test_credentials = [
    ('admin@aaroha-inc.com', 'password123', 'super_admin'),
    ('coordinator@aaroha-inc.com', 'password123', 'coordinator'),
    ('faculty@aaroha-inc.com', 'password123', 'faculty'),
    ('student@aaroha-inc.com', 'password123', 'student'),
    ('placement@aaroha-inc.com', 'password123', 'placement_officer'),
    ('ryu@aaroha.in', 'password123', 'student'),
    ('aa@aaroha.in', 'password123', 'faculty')
]

print("\n6. Authentication Verification Across All Canonical Test & Genuine Accounts:")
for email, pw, expected_role in test_credentials:
    auth_req = urllib.request.Request(
        'https://lms.aaroha-inc.com/api/auth/login',
        data=json.dumps({'email': email, 'password': pw}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(auth_req) as resp:
            data = json.loads(resp.read().decode())
            u = data.get('user', {})
            print(f"   ✓ {email} -> SUCCESS: {u.get('full_name')} (Role: {u.get('role')})")
    except urllib.error.HTTPError as e:
        print(f"   ✗ {email} -> FAILED: HTTP {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"   ✗ {email} -> ERROR: {e}")

print("\n" + "="*60)

