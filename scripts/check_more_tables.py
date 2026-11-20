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

endpoints = [
    '/admin/support/tickets',
    '/admin/placement/jobs',
    '/admin/fee-plans',
    '/admin/tasks',
    '/courses/9/tasks'
]

for ep in endpoints:
    r = urllib.request.Request('https://lms.aaroha-inc.com/api' + ep, headers=headers)
    try:
        with urllib.request.urlopen(r) as resp:
            data = json.loads(resp.read().decode())
            print(f"{ep}:", {k: len(v) if isinstance(v, list) else v for k, v in data.items() if k != 'success'})
    except Exception as e:
        print(f"{ep} error:", e)
