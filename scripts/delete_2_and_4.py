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

print("Deleting Student 2...")
req2 = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/students/2', headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(req2) as resp:
        print("DELETE Student 2:", resp.status, resp.read().decode())
except urllib.error.HTTPError as e:
    print("DELETE Student 2 HTTPError:", e.code, e.read().decode())
except Exception as e:
    print("DELETE Student 2 Error:", e)

print("\nDeleting Faculty 4...")
req4 = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/faculty/4', headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(req4) as resp:
        print("DELETE Faculty 4:", resp.status, resp.read().decode())
except urllib.error.HTTPError as e:
    print("DELETE Faculty 4 HTTPError:", e.code, e.read().decode())
except Exception as e:
    print("DELETE Faculty 4 Error:", e)
