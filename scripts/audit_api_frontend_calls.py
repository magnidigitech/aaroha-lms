import re
import os

api_service_path = r"frontend/src/apiService.js"
with open(api_service_path, "r", encoding="utf-8") as f:
    api_content = f.read()

# Extract all exported methods in apiService.js
# Typically: methodName: (...) or async methodName(...)
exported_methods = set(re.findall(r'(\b[a-zA-Z0-9_]+)\s*:\s*(?:async\s*)?\(', api_content))
exported_methods.update(re.findall(r'async\s+([a-zA-Z0-9_]+)\s*\(', api_content))

print(f"Total exported methods in apiService.js: {len(exported_methods)}")

# Scan all frontend src files for api.methodName
src_dir = r"frontend/src"
mismatches = []
all_calls = set()

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx')) and file != 'apiService.js':
            fpath = os.path.join(root, file)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            matches = re.findall(r'\bapi\.([a-zA-Z0-9_]+)\b', content)
            for m in matches:
                all_calls.add((m, os.path.relpath(fpath, "frontend/src")))
                if m not in exported_methods:
                    mismatches.append((m, os.path.relpath(fpath, "frontend/src")))

print(f"Total distinct api calls in frontend: {len(set(m[0] for m in all_calls))}")
if mismatches:
    print(f"\n*** FOUND {len(mismatches)} MISMATCHES IN FRONTEND: ***")
    for m, file in mismatches:
        print(f"  Missing method: api.{m} in {file}")
else:
    print("\n✓ All api.<method> calls exist in apiService.js!")
