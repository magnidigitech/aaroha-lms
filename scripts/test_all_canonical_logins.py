import urllib.request
import json

test_accounts = [
    ('admin@aaroha-inc.com', 'admin'),
    ('coordinator@aaroha-inc.com', 'coordinator'),
    ('faculty@aaroha-inc.com', 'faculty'),
    ('student@aaroha-inc.com', 'student'),
    ('placement@aaroha-inc.com', 'placement_officer')
]

print("=== AUTHENTICATION VERIFICATION ACROSS ALL CANONICAL TEST ACCOUNTS ===")
all_ok = True
for email, expected_role in test_accounts:
    req = urllib.request.Request(
        'https://lms.aaroha-inc.com/api/auth/login',
        data=json.dumps({'email': email, 'password': 'password123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            user = data.get('user', {})
            token = data.get('token')
            role = user.get('role')
            name = user.get('full_name')
            has_token = bool(token)
            print(f"[PASS] {email} -> Name: {name} | Role: {role} (Expected: {expected_role}) | Token: {has_token}")
            if role != expected_role:
                print(f"  *** Role mismatch: got {role}, expected {expected_role} ***")
                all_ok = False
    except Exception as e:
        print(f"[FAIL] {email} -> Error: {e}")
        all_ok = False

print(f"\nAll 5 Canonical Accounts Login Test: {'SUCCESS' if all_ok else 'FAILED'}")
