import os
import re

env_path = 'aaroha_lms/backend/config/env.php'
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
    keys = re.findall(r"['\"]([A-Z0-9_]+)['\"]\s*=>", content)
    print("Keys found in env.php:", keys)
    for k in keys:
        m = re.search(r"['\"]" + k + r"['\"]\s*=>\s*['\"]([^'\"]*)['\"]", content)
        if m:
            val = m.group(1)
            print(f"Key {k}: configured={bool(val.strip())}, length={len(val)}")
        else:
            print(f"Key {k}: not a simple string")
else:
    print("env.php does not exist")
