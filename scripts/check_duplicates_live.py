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

# 1. Batches and Enrollments
batches_req = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/batches', headers=headers)
with urllib.request.urlopen(batches_req) as resp:
    batches = json.loads(resp.read().decode()).get('batches', [])

print(f"Total Batches: {len(batches)}")
for b in batches:
    bid = b.get('id')
    code = b.get('batch_code')
    title = b.get('title')
    lead_faculty = b.get('lead_faculty_name') or b.get('faculty_name')
    print(f"  Batch {bid} [{code}] - {title} (Lead Faculty: {lead_faculty})")
    
    # Check enrollments for this batch
    enr_req = urllib.request.Request(f'https://lms.aaroha-inc.com/api/admin/batches/{bid}/students', headers=headers)
    try:
        with urllib.request.urlopen(enr_req) as eresp:
            enrs = json.loads(eresp.read().decode()).get('students', [])
            print(f"    Enrolled: {len(enrs)}")
            seen_users = set()
            for enr in enrs:
                uid = enr.get('user_id') or enr.get('id')
                name = enr.get('full_name') or enr.get('name')
                email = enr.get('email')
                if uid in seen_users:
                    print(f"    *** DUPLICATE ENROLLMENT DETECTED: User {uid} ({name}) ***")
                else:
                    seen_users.add(uid)
                    print(f"    - User {uid}: {name} ({email})")
    except Exception as ex:
        print(f"    Enrollment fetch error: {ex}")

# 2. Check Class Sessions and Attendance for Batch 9
sessions_req = urllib.request.Request('https://lms.aaroha-inc.com/api/attendance/sessions', headers=headers)
try:
    with urllib.request.urlopen(sessions_req) as sresp:
        sessions = json.loads(sresp.read().decode()).get('sessions', [])
        print(f"\nTotal Sessions in System: {len(sessions)}")
        for s in sessions:
            sid = s.get('id')
            title = s.get('session_title') or s.get('title')
            b_title = s.get('batch_title')
            fac = s.get('faculty_name')
            print(f"  Session {sid}: {title} | Batch: {b_title} | Faculty: {fac}")
            
            # Check attendance roster
            roster_req = urllib.request.Request(f'https://lms.aaroha-inc.com/api/attendance/sessions/{sid}', headers=headers)
            try:
                with urllib.request.urlopen(roster_req) as rresp:
                    rdata = json.loads(rresp.read().decode())
                    roster = rdata.get('session', {}).get('roster', [])
                    print(f"    Roster count: {len(roster)}")
                    seen_roster_uids = set()
                    for r_item in roster:
                        ruid = r_item.get('user_id') or r_item.get('student_id')
                        rname = r_item.get('student_name') or r_item.get('name')
                        status = r_item.get('status')
                        if ruid in seen_roster_uids:
                            print(f"    *** DUPLICATE ROSTER ENTRY DETECTED: User {ruid} ({rname}) ***")
                        else:
                            seen_roster_uids.add(ruid)
                            print(f"    - Student {ruid}: {rname} [Status: {status}]")
            except Exception as rex:
                print(f"    Roster fetch error: {rex}")
except Exception as sex:
    print(f"Sessions fetch error: {sex}")
