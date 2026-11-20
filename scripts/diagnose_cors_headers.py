import urllib.request
import ssl

ctx = ssl.create_default_context()

origins_to_test = [
    ('Same-origin (no Origin header)', None),
    ('Allowed origin', 'https://lms.aaroha-inc.com'),
    ('Allowed website', 'https://www.aaroha-inc.com'),
    ('Allowed localhost', 'http://localhost:5173'),
    ('Unallowed external origin', 'https://malicious-site.example.com')
]

for label, origin in origins_to_test:
    headers = {'User-Agent': 'Mozilla/5.0'}
    if origin:
        headers['Origin'] = origin
    
    req = urllib.request.Request('https://lms.aaroha-inc.com/api/health', headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            print(f"=== {label} ({origin}) ===")
            print(f"Status: {resp.status}")
            for k, v in resp.headers.items():
                if k.lower() in ['access-control-allow-origin', 'access-control-allow-credentials', 'vary', 'access-control-allow-methods', 'access-control-allow-headers']:
                    print(f"  {k}: {v}")
    except Exception as e:
        print(f"=== {label} ({origin}) === ERROR: {e}")
