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

users_res = get('/admin/users')
users = users_res.get('users', [])

print("=== CHECKING USER DELETION ELIGIBILITY ===")
for u in users:
    uid = u.get('id')
    role = u.get('role')
    email = u.get('email')
    name = u.get('full_name')

    if role == 'student':
        elig = get(f"/admin/students/{uid}/deletion-eligibility")
        is_elig = elig.get('eligible')
        deps = elig.get('dependencies', [])
        print(f"Student {uid} ({email}): eligible={is_elig}, deps={deps}")
    elif role == 'faculty':
        elig = get(f"/admin/faculty/{uid}/deletion-eligibility")
        is_elig = elig.get('eligible')
        deps = elig.get('dependencies', [])
        print(f"Faculty {uid} ({email}): eligible={is_elig}, deps={deps}")
    else:
        print(f"Admin/Other {uid} ({email}): role={role}")

