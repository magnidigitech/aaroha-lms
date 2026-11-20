import urllib.request
import json
import time
import sys

run_id = "44710035510"
print(f"Waiting for GitHub Actions Run {run_id} to complete...")

for attempt in range(40):
    time.sleep(10)
    try:
        req = urllib.request.Request(
            f'https://api.github.com/repos/magnidigitech/aaroha-lms/actions/runs/{run_id}',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            status = data.get('status')
            conclusion = data.get('conclusion')
            print(f"Attempt {attempt + 1}: Status={status}, Conclusion={conclusion}")
            if status == 'completed':
                if conclusion == 'success':
                    print("✓ Deployment completed successfully!")
                    sys.exit(0)
                else:
                    print(f"✗ Deployment finished with conclusion: {conclusion}")
                    sys.exit(1)
    except Exception as e:
        print(f"Polling error: {e}")

print("Timed out waiting for deploy.")
sys.exit(2)

