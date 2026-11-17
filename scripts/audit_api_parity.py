import re

with open('aaroha_lms/frontend/src/apiService.js', 'r', encoding='utf-8') as f:
    api_js = f.read()

with open('aaroha_lms/backend/index.php', 'r', encoding='utf-8') as f:
    php_index = f.read()

with open('aaroha_lms/scripts/dev_api_server.py', 'r', encoding='utf-8') as f:
    py_server = f.read()

# Extract endpoints from apiService.js
# Look for: method_name: (params) => ... request('path', { method: 'METHOD' })
# or method: 'POST', etc.

lines = api_js.split('\n')
current_method = None
api_calls = []

i = 0
while i < len(lines):
    line = lines[i]
    m = re.match(r'^\s*([a-zA-Z0-9_]+)\s*:\s*(?:async\s*)?\(([^)]*)\)\s*=>', line)
    if m:
        name = m.group(1)
        params = m.group(2)
        # Scan next few lines for request( or fetch or xhr
        block = '\n'.join(lines[i:min(len(lines), i + 25)])
        req_m = re.search(r"request\(\s*[`'\"]([^`'\"]+)[`'\"](?:,\s*\{([^}]+)\})?", block)
        if req_m:
            url = req_m.group(1)
            opts = req_m.group(2) or ''
            method_m = re.search(r"method:\s*['\"]([A-Z]+)['\"]", opts)
            http_method = method_m.group(1) if method_m else 'GET'
            api_calls.append({
                'name': name,
                'method': http_method,
                'url': url,
                'block': block
            })
        elif 'xhr.open' in block:
            xhr_m = re.search(r"xhr\.open\(['\"]([A-Z]+)['\"],\s*`\$\{API_BASE_URL\}([^`]+)`", block)
            if xhr_m:
                api_calls.append({
                    'name': name,
                    'method': xhr_m.group(1),
                    'url': xhr_m.group(2),
                    'block': block
                })
    i += 1

print(f"Total endpoints extracted from apiService.js: {len(api_calls)}")

# Check PHP index.php coverage
results = []
for call in api_calls:
    name = call['name']
    method = call['method']
    url = call['url']
    
    # Clean URL for regex matching
    # e.g., /courses/${courseId}/modules -> #^/courses/(\d+)/modules$#
    url_pattern = re.sub(r'\$\{[^}]+\}', r'[^/]+', url)
    url_base = url.split('?')[0].split('$')[0].rstrip('/')
    if not url_base:
        url_base = '/'
        
    in_php = False
    # Check if url_base or route exists in php_index
    if url_base in php_index or re.search(re.escape(url_base), php_index):
        in_php = True
    
    in_py = False
    if url_base in py_server or re.search(re.escape(url_base), py_server):
        in_py = True
        
    results.append({
        'name': name,
        'method': method,
        'url': url,
        'in_php': in_php,
        'in_py': in_py
    })

missing_php = [r for r in results if not r['in_php']]
print(f"Covered in PHP: {len(results) - len(missing_php)} / {len(results)}")
print(f"Potentially Missing in PHP: {len(missing_php)}")
for r in missing_php:
    print(f"  MISSING PHP: [{r['method']}] {r['name']} -> {r['url']}")
