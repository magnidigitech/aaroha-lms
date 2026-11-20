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

role_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/admin/users/62/role',
    data=json.dumps({'role': 'coordinator'}).encode(),
    headers=headers,
    method='PUT'
)

try:
    with urllib.request.urlopen(role_req) as resp:
        print("Update Role Status:", resp.status, resp.read().decode())
except urllib.error.HTTPError as e:
    print("Update Role HTTPError:", e.code, e.read().decode())
except Exception as e:
    print("Update Role Error:", e)
