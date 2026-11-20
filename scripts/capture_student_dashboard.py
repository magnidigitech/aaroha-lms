import os
import sys
import time
import json
import base64
import subprocess
import urllib.request
import websocket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_CDP = 9264
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

# 1. Login as Student
login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login',
    data=json.dumps({'email': 'student@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    login_data = json.loads(resp.read().decode())
    live_token = login_data.get('token')
    student_user = login_data.get('user', {})

chrome_proc = subprocess.Popen([
    CHROME_PATH,
    "--headless=new",
    "--remote-debugging-port=" + str(PORT_CDP),
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
    "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)

try:
    tabs_req = urllib.request.urlopen("http://127.0.0.1:" + str(PORT_CDP) + "/json")
    tabs = json.loads(tabs_req.read().decode())
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    ws = websocket.create_connection(ws_url)

    req_id = 0
    def send_cdp(method, params=None):
        global req_id
        req_id += 1
        payload = {"id": req_id, "method": method, "params": params or {}}
        ws.send(json.dumps(payload))
        while True:
            res = json.loads(ws.recv())
            if res.get("id") == req_id:
                return res.get("result", {})

    send_cdp("Page.enable")
    send_cdp("Runtime.enable")

    # Navigate to site and inject authentication
    send_cdp("Page.navigate", {"url": "https://lms.aaroha-inc.com/"})
    time.sleep(3)

    setup_script = f"""
    localStorage.setItem('aaroha_user', JSON.stringify({json.dumps(student_user)}));
    localStorage.setItem('aaroha_token', '{live_token}');
    sessionStorage.setItem('aaroha_view', 'student');
    location.href = '/?view=student';
    """
    send_cdp("Runtime.evaluate", {"expression": setup_script})
    time.sleep(5)

    # Capture Student Dashboard
    shot = send_cdp("Page.captureScreenshot", {"format": "png"})
    if shot.get("data"):
        out_img = os.path.join(OUT_DIR, "live_student_dashboard_clean.png")
        with open(out_img, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("Captured Student Dashboard screenshot:", out_img)

    ws.close()
finally:
    chrome_proc.terminate()

