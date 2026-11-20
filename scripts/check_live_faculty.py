import urllib.request
import urllib.error
import json

# Log in as admin
req = urllib.request.Request('https://lms.aaroha-inc.com/api/auth/login', data=json.dumps({
    'email': 'admin@aaroha-inc.com',
    'password': 'password123'
}).encode(), headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    token = data.get('token')

headers = {'Authorization': f'Bearer {token}'}

# Check faculty endpoints
endpoints = [
    '/api/admin/faculty',
    '/api/admin/faculty-members',
    '/api/admin/users?role=faculty',
    '/api/admin/users'
]

for ep in endpoints:
    try:
        r = urllib.request.Request(f'https://lms.aaroha-inc.com{ep}', headers=headers)
        with urllib.request.urlopen(r) as res:
            res_data = json.loads(res.read().decode())
            print(f"=== {ep} ===")
            if isinstance(res_data, dict):
                for k, v in res_data.items():
                    if isinstance(v, list):
                        print(f"  Key '{k}': {len(v)} items")
                        for item in v[:5]:
                            print(f"    - ID: {item.get('id')}, Email: {item.get('email')}, Role: {item.get('role')}, Status: {item.get('account_status') or item.get('status')}, Name: {item.get('full_name') or item.get('name')}")
                    else:
                        print(f"  Key '{k}': {v}")
            elif isinstance(res_data, list):
                print(f"  List of {len(res_data)} items")
                for item in res_data[:5]:
                    print(f"    - ID: {item.get('id')}, Email: {item.get('email')}, Role: {item.get('role')}, Status: {item.get('account_status') or item.get('status')}, Name: {item.get('full_name') or item.get('name')}")
    except urllib.error.HTTPError as e:
        print(f"=== {ep} === HTTP {e.code}: {e.read().decode()[:100]}")
    except Exception as e:
        print(f"=== {ep} === ERROR: {e}")

