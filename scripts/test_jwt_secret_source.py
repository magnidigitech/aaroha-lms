import urllib.request
import json
import base64
import hmac
import hashlib
import os
import re

req = urllib.request.Request('https://lms.aaroha-inc.com/api/auth/login', data=json.dumps({
    'email': 'admin@aaroha-inc.com',
    'password': 'password123'
}).encode(), headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    token = data.get('token')
    parts = token.split('.')
    header, payload, sig = parts[0], parts[1], parts[2]
    
    # Check fallback secret
    fallback_secret = b'aaroha_lms_super_secret_jwt_key_2026_change_in_production'
    calc_sig = base64.urlsafe_b64encode(hmac.new(fallback_secret, f'{header}.{payload}'.encode(), hashlib.sha256).digest()).decode().rstrip('=')
    print('Was signed with fallback secret?', calc_sig == sig)

    if os.path.exists('aaroha_lms/backend/config/env.php'):
        with open('aaroha_lms/backend/config/env.php') as f:
            c = f.read()
        m = re.search(r"['\"]JWT_SECRET['\"]\s*=>\s*['\"]([^'\"]+)['\"]", c)
        if m:
            local_secret = m.group(1).encode()
            calc_local = base64.urlsafe_b64encode(hmac.new(local_secret, f'{header}.{payload}'.encode(), hashlib.sha256).digest()).decode().rstrip('=')
            print('Was signed with local env.php secret?', calc_local == sig)
