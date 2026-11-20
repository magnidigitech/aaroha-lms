import urllib.request
import json

req = urllib.request.Request('https://lms.aaroha-inc.com/api/auth/login', data=json.dumps({
    'email': 'admin@aaroha-inc.com',
    'password': 'password123'
}).encode(), headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': f'Bearer {token}'}

for fid in [2, 4, 13, 14]:
    try:
        r = urllib.request.Request(f'https://lms.aaroha-inc.com/api/admin/faculty/{fid}/detail', headers=headers)
        with urllib.request.urlopen(r) as res:
            f_data = json.loads(res.read().decode())
            fac = f_data.get('faculty', {})
            print(f"=== Faculty ID {fid} ===")
            print(f"  Name: {fac.get('full_name')}")
            print(f"  Email: {fac.get('email')}")
            print(f"  Account Status: {fac.get('account_status')}")
            print(f"  Role: {fac.get('role')}")
            print(f"  Authorized Roles: {fac.get('authorized_roles_json')}")
            print(f"  Setup Link: {fac.get('setup_link')}")
            print(f"  Activation Token Expiry: {fac.get('activation_token_expires_at')}")
    except Exception as e:
        print(f"Error fetching faculty {fid}: {e}")
