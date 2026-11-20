import urllib.request, re

req = urllib.request.Request('https://lms.aaroha-inc.com/', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode()
    matches = re.findall(r'src="([^"]+\.js)"', html)
    print("Frontend index.html fetched. Found scripts:", len(matches))
    for s in matches:
        url = 'https://lms.aaroha-inc.com' + s if s.startswith('/') else s
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})) as js_resp:
            print("  Asset:", s, "| Status:", js_resp.status, "| Bytes:", len(js_resp.read()))

