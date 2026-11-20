import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

def api_post(endpoint, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
        headers['X-Authorization'] = 'Bearer ' + token
        headers['X-Auth-Token'] = token
    req = urllib.request.Request(
        f'https://lms.aaroha-inc.com/api{endpoint}',
        data=json.dumps(data).encode(),
        headers=headers
    )
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read().decode())

def api_get(endpoint, token=None):
    headers = {}
    if token:
        headers['Authorization'] = 'Bearer ' + token
        headers['X-Authorization'] = 'Bearer ' + token
        headers['X-Auth-Token'] = token
    req = urllib.request.Request(
        f'https://lms.aaroha-inc.com/api{endpoint}',
        headers=headers
    )
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read().decode())

print("=== 1. TEST CANONICAL LOGINS ===")
admin_token = None
for em in ['admin@aaroha-inc.com', 'coordinator@aaroha-inc.com', 'faculty@aaroha-inc.com', 'student@aaroha-inc.com', 'placement@aaroha-inc.com', 'ryu@aaroha.in', 'aa@aaroha.in']:
    try:
        res = api_post('/auth/login', {'email': em, 'password': 'password123'})
        u = res.get('user', {})
        t = res.get('token')
        if em == 'admin@aaroha-inc.com':
            admin_token = t
        print(f"  SUCCESS: {em:30} -> id={u.get('id')} role={u.get('role')} name={u.get('name')}")
    except Exception as ex:
        print(f"  FAILED:  {em:30} -> {ex}")

print("\n=== 2. ISSUE 1 & 2: BATCH OPERATIONS & TOKEN AUTH ===")
# Test checking deletion eligibility for batch 9
try:
    del_elig = api_get('/admin/batches/9/deletion-eligibility', admin_token)
    print(f"  Batch 9 Deletion Eligibility: can_delete={del_elig.get('can_delete')} dependencies={del_elig.get('blocking_reasons') or del_elig.get('dependencies')}")
except Exception as ex:
    print(f"  Batch 9 Deletion Eligibility FAIL: {ex}")

print("\n=== 3. ISSUE 3: FACULTY LIST FOR BATCH ASSIGNMENT ===")
try:
    fac_res = api_get('/admin/faculty', admin_token)
    fac_list = fac_res.get('faculty', [])
    print(f"  Faculty Count in System: {len(fac_list)}")
    for f in fac_list:
        print(f"    - ID {f.get('id')}: {f.get('name')} ({f.get('email')}) - Code: {f.get('faculty_code')}")
except Exception as ex:
    print(f"  Faculty List FAIL: {ex}")

print("\n=== 4. ISSUE 5 & 6: SESSIONS & ATTENDANCE ===")
try:
    sched_res = api_get('/admin/schedule', admin_token)
    sessions = sched_res.get('sessions', [])
    print(f"  Live Schedule Sessions Count: {len(sessions)}")
    for s in sessions:
        print(f"    - Session ID {s.get('id')}: {s.get('topic')} link={s.get('meeting_link')}")
except Exception as ex:
    print(f"  Schedule Sessions FAIL: {ex}")

print("\n=== 5. ISSUE 4 & 7: STUDENT DASHBOARD (RYU) ===")
try:
    ryu_login = api_post('/auth/login', {'email': 'ryu@aaroha.in', 'password': 'password123'})
    ryu_token = ryu_login.get('token')
    ryu_dash = api_get('/student/dashboard', ryu_token)
    tu = ryu_dash.get('today_and_upcoming', {})
    next_c = tu.get('next_live_class')
    up_c = tu.get('upcoming_classes', [])
    print(f"  Ryu Dashboard next_live_class: {next_c}")
    print(f"  Ryu Dashboard upcoming_classes count: {len(up_c)}")
except Exception as ex:
    print(f"  Ryu Dashboard FAIL: {ex}")
