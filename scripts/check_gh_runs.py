import urllib.request, json

req = urllib.request.Request('https://api.github.com/repos/magnidigitech/aaroha-lms/actions/runs?per_page=3', headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        for run in data.get('workflow_runs', []):
            rid = run.get('id')
            name = run.get('name')
            status = run.get('status')
            conclusion = run.get('conclusion')
            commit = run.get('head_commit', {}).get('id', '')[:7]
            msg = run.get('head_commit', {}).get('message', '')[:50]
            print(f"Run {rid}: {name} | Status: {status} | Conclusion: {conclusion} | Commit: {commit} | {msg}")
except Exception as e:
    print('Error:', e)

