import urllib.request
import urllib.error
import json

emails = [
    'elena.rostova@enterprise.io',
    'marcus.vance@aaroha-inc.com',
    'faculty@aaroha-inc.com',
    'instructor@aaroha-inc.com'
]

print("=== CHECKING LIVE PRODUCTION ===")
for em in emails:
    req = urllib.request.Request('https://lms.aaroha-inc.com/api/auth/login', data=json.dumps({
        'email': em,
        'password': 'password123'
    }).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            u = data.get('user', {})
            print(f"SUCCESS: {em} -> ID: {u.get('id')}, Name: {u.get('full_name')}, Role: {u.get('role')}")
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"FAILED: {em} -> HTTP {e.code}: {err_msg}")
    except Exception as e:
        print(f"ERROR: {em} -> {e}")
