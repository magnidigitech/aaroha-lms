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

req = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/schedule', headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

sessions = data.get('sessions', [])
print(f"Total Schedule Sessions: {len(sessions)}")
for s in sessions:
    sid = s.get('id')
    topic = s.get('topic')
    b_title = s.get('batch_title')
    faculty_name = s.get('faculty_name')
    print(f"Session {sid}: {topic} | Batch: {b_title} | Faculty: {faculty_name}")
    
    r_req = urllib.request.Request(f'https://lms.aaroha-inc.com/api/admin/attendance/session/{sid}', headers=headers)
    with urllib.request.urlopen(r_req) as r_resp:
        r_data = json.loads(r_resp.read().decode())
        roster = r_data.get('roster', [])
        print(f"  Attendance Roster count: {len(roster)}")
        for r in roster:
            uid = r.get('id') or r.get('user_id')
            name = r.get('full_name') or r.get('name')
            email = r.get('email')
            status = r.get('status')
            print(f"    - Student {uid}: {name} ({email}) | Status: {status}")
