import urllib.request
import urllib.error
import json

# 1. Login as Admin
login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

print("=== TESTING SESSION CREATION & DELETION ENDPOINTS ===")

# Create a temporary session
create_data = {
    'batch_id': 9,
    'faculty_id': 61,
    'topic': 'Automated Test Ephemeral Session',
    'description': 'Temporary session to verify deletion lifecycle',
    'start_time': '2026-11-25 10:00:00',
    'end_time': '2026-11-25 12:00:00',
    'session_type': 'Lecture'
}
c_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/admin/schedule',
    data=json.dumps(create_data).encode(),
    headers=headers,
    method='POST'
)

with urllib.request.urlopen(c_req) as resp:
    c_res = json.loads(resp.read().decode())
    print("Create Session Response:", c_res)
    new_sess_id = c_res.get('session_id') or c_res.get('id')

if new_sess_id:
    print(f"Created Session ID: {new_sess_id}")
    
    # Verify it exists in schedule
    s_req = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/schedule', headers=headers)
    with urllib.request.urlopen(s_req) as resp:
        s_data = json.loads(resp.read().decode())
        found = any(s.get('id') == new_sess_id for s in s_data.get('sessions', []))
        print(f"Session {new_sess_id} verified in schedule: {found}")
        
    # Delete the session via DELETE /admin/schedule/{new_sess_id}
    d_req = urllib.request.Request(
        f'https://lms.aaroha-inc.com/api/admin/schedule/{new_sess_id}',
        headers=headers,
        method='DELETE'
    )
    with urllib.request.urlopen(d_req) as resp:
        d_res = json.loads(resp.read().decode())
        print(f"DELETE Session {new_sess_id} Response:", d_res)
        
    # Verify it is no longer in schedule
    with urllib.request.urlopen(s_req) as resp:
        s_data = json.loads(resp.read().decode())
        found_after = any(s.get('id') == new_sess_id for s in s_data.get('sessions', []))
        print(f"Session {new_sess_id} exists after deletion: {found_after} (Expected: False)")
        
    if not found_after:
        print("✓ Backend DELETE /admin/schedule/{id} verified 100% working!")

