import urllib.request
import re

req = urllib.request.Request('https://lms.aaroha-inc.com', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode()

chunks = re.findall(r'/assets/([a-zA-Z0-9_\-\.]+)', html)
print('Live Assets referenced on https://lms.aaroha-inc.com:')
for c in set(chunks):
    print(' ', c)

