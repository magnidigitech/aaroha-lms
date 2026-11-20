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
r = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/attendance/session/1', headers=headers)
with urllib.request.urlopen(r) as resp:
    data = json.loads(resp.read().decode())
    for item in data.get('roster', []):
        print("Student:", item.get('user_id'), item.get('full_name'), "record_id:", item.get('record_id'))

