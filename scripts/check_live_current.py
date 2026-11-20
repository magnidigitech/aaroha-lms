import urllib.request
import json

login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token}

def check(endpoint, label):
    req = urllib.request.Request('https://lms.aaroha-inc.com/api' + endpoint, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    print(f"\n=== {label} ===")
    items = data.get('users') or data.get('students') or data.get('faculty') or data.get('data') or []
    print(f"Total count: {len(items)}")
    for item in items:
        uid = item.get('id') or item.get('user_id')
        name = item.get('full_name') or item.get('name')
        email = item.get('email')
        role = item.get('role')
        code = item.get('student_code') or item.get('faculty_code')
        print(f"  ID {uid}: {email} ({role}) - {name} [Code: {code}]")

check('/admin/users', 'ALL USERS DIRECTORY')
check('/admin/students', 'STUDENTS DIRECTORY')
check('/admin/faculty', 'FACULTY DIRECTORY')

