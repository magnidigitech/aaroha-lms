import urllib.request
import json

req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token}

def get(path):
    r = urllib.request.Request('https://lms.aaroha-inc.com/api' + path, headers=headers)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'error': str(e)}

print("=== LIVE PRODUCTION USERS AUDIT ===")
users_res = get('/admin/users')
users = users_res.get('users', [])
print(f"Total Users: {len(users)}")
for u in users:
    uid = u.get('id')
    email = u.get('email')
    role = u.get('role')
    name = u.get('full_name')
    print(f"User {uid}: {email} [{role}] - {name}")

print("\n=== STUDENTS DETAILS & ENROLLMENTS ===")
students_res = get('/admin/students')
students = students_res.get('students', [])
print(f"Total Students: {len(students)}")
for s in students:
    sid = s.get('id')
    print(f"Student {sid}: {s.get('full_name')} ({s.get('email')}) | Batch: {s.get('batch_title')} ({s.get('batch_code')})")

print("\n=== BATCHES AUDIT ===")
batches_res = get('/admin/batches')
batches = batches_res.get('batches', [])
print(f"Total Batches: {len(batches)}")
for b in batches:
    bid = b.get('id')
    print(f"Batch {bid}: [{b.get('batch_code')}] {b.get('title')} | Students: {b.get('enrolled_count')}")

print("\n=== SESSIONS AUDIT ===")
schedule_res = get('/admin/schedule')
sessions = schedule_res.get('sessions', [])
print(f"Total Sessions: {len(sessions)}")
for sess in sessions:
    print(f"Session {sess.get('id')}: [{sess.get('batch_code')}] {sess.get('topic')}")

print("\n=== COURSES AUDIT ===")
courses_res = get('/admin/courses')
courses = courses_res.get('courses', [])
print(f"Total Courses: {len(courses)}")
for c in courses:
    print(f"Course {c.get('id')}: {c.get('title')} ({c.get('code')}) | Batches: {c.get('batches_count')}")
