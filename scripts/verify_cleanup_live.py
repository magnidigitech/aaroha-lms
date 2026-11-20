import urllib.request
import json

BASE = 'https://lms.aaroha-inc.com'

# 1. Admin login
req_auth = urllib.request.Request(
    f'{BASE}/api/auth/login',
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
)
res_auth = json.loads(urllib.request.urlopen(req_auth).read().decode('utf-8'))
token = res_auth.get('token')
user = res_auth.get('user', {})
print('=== 1. ADMIN AUTH VERIFICATION ===')
print(f"Name: {user.get('full_name')} | Email: {user.get('email')} | Role: {user.get('role')} | Title: {user.get('title')}")

admin_headers = {'User-Agent': 'Mozilla/5.0', 'Authorization': f'Bearer {token}'}

# 2. Faculty Tab
req_fac = urllib.request.Request(f'{BASE}/api/admin/faculty', headers=admin_headers)
res_fac = json.loads(urllib.request.urlopen(req_fac).read().decode('utf-8'))
faculty = res_fac.get('faculty', [])
print('\n=== 2. FACULTY LIST (/api/admin/faculty) ===')
print(f"Total Faculty Count: {len(faculty)}")
for f in faculty:
    print(f"  ID: {f.get('id')} | Name: {f.get('full_name')} | Email: {f.get('email')} | Code: {f.get('faculty_id_code')} | Title: {f.get('title')}")

# 3. Batches Active and Archived
print('\n=== 3. BATCHES LIST ===')
for v, label in [('', 'Active'), ('?view=archived', 'Archived')]:
    req_b = urllib.request.Request(f'{BASE}/api/admin/batches{v}', headers=admin_headers)
    res_b = json.loads(urllib.request.urlopen(req_b).read().decode('utf-8'))
    batches = res_b.get('batches', [])
    print(f"Batches ({label}): count {len(batches)}")
    for b in batches:
        print(f"  ID: {b.get('id')} | Code: {b.get('batch_code')} | Title: {b.get('title')} | Status: {b.get('status')}")

# 4. Batch 2 Deletion Eligibility Check
print('\n=== 4. BATCH 2 DELETION ELIGIBILITY (The ghost batch) ===')
req_b2 = urllib.request.Request(f'{BASE}/api/admin/batches/2/deletion-eligibility', headers=admin_headers)
res_b2 = json.loads(urllib.request.urlopen(req_b2).read().decode('utf-8'))
print(f"Batch 2 eligibility check: success={res_b2.get('success')}, eligible={res_b2.get('eligible')}, can_delete={res_b2.get('can_delete')}, reason={res_b2.get('reason')}")

# 5. Students
print('\n=== 5. STUDENTS LIST ===')
req_stu = urllib.request.Request(f'{BASE}/api/admin/students', headers=admin_headers)
res_stu = json.loads(urllib.request.urlopen(req_stu).read().decode('utf-8'))
students = res_stu.get('students', [])
print(f"Total Students Count: {len(students)}")
for s in students:
    print(f"  ID: {s.get('id')} | Name: {s.get('full_name')} | Email: {s.get('email')} | Code: {s.get('student_id_code')}")

# 6. Courses
print('\n=== 6. COURSES LIST ===')
req_c = urllib.request.Request(f'{BASE}/api/admin/courses', headers=admin_headers)
res_c = json.loads(urllib.request.urlopen(req_c).read().decode('utf-8'))
courses = res_c.get('courses', [])
print(f"Total Courses Count: {len(courses)}")
for c in courses:
    print(f"  ID: {c.get('id')} | Title: {c.get('title')}")

# 7. Student Ryu Dashboard
print('\n=== 7. RYU STUDENT DASHBOARD ===')
req_ryu_auth = urllib.request.Request(
    f'{BASE}/api/auth/login',
    data=json.dumps({'email': 'ryu@aaroha.in', 'password': 'password123'}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
)
res_ryu_auth = json.loads(urllib.request.urlopen(req_ryu_auth).read().decode('utf-8'))
ryu_token = res_ryu_auth.get('token')
ryu_headers = {'User-Agent': 'Mozilla/5.0', 'Authorization': f'Bearer {ryu_token}'}

req_ryu_dash = urllib.request.Request(f'{BASE}/api/student/dashboard', headers=ryu_headers)
res_ryu_dash = json.loads(urllib.request.urlopen(req_ryu_dash).read().decode('utf-8'))
today = res_ryu_dash.get('today_and_upcoming', {})
print(f"Upcoming deadlines count: {len(today.get('upcoming_deadlines', []))}")
print(f"My courses count: {len(res_ryu_dash.get('my_courses', []))}")

