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

def fetch(url, label):
    req = urllib.request.Request('https://lms.aaroha-inc.com/api' + url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"\n=== {label} ===")
            if isinstance(data, list):
                print(f"Count: {len(data)}")
                for item in data[:10]:
                    print(" ", item)
            elif isinstance(data, dict):
                for k, v in data.items():
                    if isinstance(v, list):
                        print(f"  {k}: count {len(v)}")
                        for it in v[:5]:
                            print(f"    - {it}")
                    elif k != 'success':
                        print(f"  {k}: {v}")
    except Exception as e:
        print(f"Error fetching {url}: {e}")

fetch('/courses', 'COURSES')
fetch('/admin/batches', 'BATCHES')
fetch('/admin/schedule', 'SCHEDULE SESSIONS')
fetch('/admin/materials', 'MATERIALS')
fetch('/admin/announcements', 'ANNOUNCEMENTS')
fetch('/admin/certificates', 'CERTIFICATES')
