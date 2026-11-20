import urllib.request
import json

req = urllib.request.Request('https://lms.aaroha-inc.com/api/auth/login', data=json.dumps({
    'email': 'admin@aaroha-inc.com',
    'password': 'password123'
}).encode(), headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': f'Bearer {token}'}

r = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/users', headers=headers)
with urllib.request.urlopen(r) as res:
    users = json.loads(res.read().decode()).get('users', [])
    for u in users:
        print(f"User ID {u.get('id')}: {u.get('email')} | Role: {u.get('role')} | Authorized Roles: {u.get('authorized_roles_json')} | Name: {u.get('full_name')}")

