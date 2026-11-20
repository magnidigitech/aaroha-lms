import urllib.request
import json

req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

create_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/admin/users',
    data=json.dumps({
        'full_name': 'Priya Sharma',
        'email': 'coordinator@aaroha-inc.com',
        'password': 'password123',
        'role': 'coordinator',
        'title': 'Academic Operations Coordinator'
    }).encode(),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(create_req) as resp:
        print("Create Coordinator Status:", resp.status, resp.read().decode())
except urllib.error.HTTPError as e:
    print("Create Coordinator HTTPError:", e.code, e.read().decode())
except Exception as e:
    print("Create Coordinator Error:", e)

