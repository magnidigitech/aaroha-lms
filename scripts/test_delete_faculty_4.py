import urllib.request
import json

login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

del_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/admin/faculty/4',
    headers=headers,
    method='DELETE'
)
try:
    with urllib.request.urlopen(del_req) as resp:
        print("DELETE Response:", resp.status, resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)

