import urllib.request
import re

# Fetch index.html
req = urllib.request.Request('https://lms.aaroha-inc.com/', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode()

# Find all script src
js_files = re.findall(r'src="(/assets/[a-zA-Z0-9_\-\.]+)"', html)
print("Root JS files:", js_files)

# Check index bundle to find referenced dynamic chunks
for js in js_files:
    r = urllib.request.Request('https://lms.aaroha-inc.com' + js, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(r) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
        
    dynamic_chunks = re.findall(r'assets/([a-zA-Z0-9_\-\.]+\.js)', content)
    for dc in set(dynamic_chunks):
        if 'AdminPortal' in dc or 'admin' in dc.lower():
            print("Found Admin chunk:", dc)
            cr = urllib.request.Request(f'https://lms.aaroha-inc.com/assets/{dc}', headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(cr) as cresp:
                    ccontent = cresp.read().decode('utf-8', errors='ignore')
                    has_del = 'adminDeleteScheduleSession' in ccontent
                    print(f"Chunk {dc} has adminDeleteScheduleSession: {has_del}")
            except Exception as e:
                print(f"Chunk {dc} error: {e}")
