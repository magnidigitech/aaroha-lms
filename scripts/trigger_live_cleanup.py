import urllib.request
import urllib.error
import json
import time

print("Waiting for deployment to land and triggering /api/admin/cleanup-dummy-data...")

# 1. Login to live production
login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)

for attempt in range(25):
    try:
        with urllib.request.urlopen(login_req) as resp:
            token = json.loads(resp.read().decode())['token']

        headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
        cleanup_req = urllib.request.Request(
            'https://lms.aaroha-inc.com/api/admin/cleanup-dummy-data',
            data=json.dumps({}).encode(),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(cleanup_req) as resp:
            data = json.loads(resp.read().decode())
            print(f"ATTEMPT {attempt + 1}: SUCCESS!", data)
            break
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"Attempt {attempt + 1}: endpoint not deployed yet (404), retrying in 10s...")
            time.sleep(10)
        else:
            print(f"Attempt {attempt + 1}: HTTP {e.code}: {e.read().decode()}")
            time.sleep(10)
    except Exception as e:
        print(f"Attempt {attempt + 1}: Error: {e}, retrying in 10s...")
        time.sleep(10)

# Final audit of users
print("\n=== FINAL AUDIT OF LIVE PRODUCTION USERS AFTER PURGE ===")
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token}
r = urllib.request.Request('https://lms.aaroha-inc.com/api/admin/users', headers=headers)
with urllib.request.urlopen(r) as resp:
    users = json.loads(resp.read().decode()).get('users', [])
    print(f"Total Users Remaining: {len(users)}")
    for u in users:
        print(f"User {u.get('id')}: {u.get('email')} [{u.get('role')}] - {u.get('full_name')}")

