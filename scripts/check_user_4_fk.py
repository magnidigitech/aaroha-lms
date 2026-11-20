import urllib.request
import json

login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login', 
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode())['token']

headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

# In cleanupDummyData, let's see why user 4 failed to delete:
# Could it be audit_logs? Yes! AuditLogger inserts user_id into audit_logs!
# Let's check audit_logs
print("Checking if audit_logs or other tables have foreign key ON DELETE RESTRICT on users.id")
