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

del_req = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/students/60', headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(del_req) as resp:
        print("DELETE 60 Status:", resp.status, resp.read().decode())
except urllib.error.HTTPError as e:
    print("DELETE 60 HTTPError:", e.code, e.read().decode())
except Exception as e:
    print("DELETE 60 Error:", e)
