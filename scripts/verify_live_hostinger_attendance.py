import os
import sys
import time
import json
import base64
import subprocess
import urllib.request

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_CDP = 9248
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login',
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    login_data = json.loads(resp.read().decode())
    live_token = login_data.get('token')
    admin_user = login_data.get('user', {})

chrome_proc = subprocess.Popen([
    CHROME_PATH,
    "--headless=new",
    "--remote-debugging-port=" + str(PORT_CDP),
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
    "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)

import websocket

try:
    tabs_req = urllib.request.urlopen("http://127.0.0.1:" + str(PORT_CDP) + "/json")
    tabs = json.loads(tabs_req.read().decode())
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    ws = websocket.create_connection(ws_url)

    req_counter = 0
    def cdp(method, params=None):
        global req_counter
        req_counter += 1
        msg = {"id": req_counter, "method": method, "params": params or {}}
        ws.send(json.dumps(msg))
        while True:
            resp = json.loads(ws.recv())
            if resp.get("id") == req_counter:
                return resp.get("result", {})

    cdp("Page.enable")
    cdp("DOM.enable")

    cdp("Page.navigate", {"url": "https://lms.aaroha-inc.com/"})

    for _ in range(25):
        time.sleep(0.3)
        res = cdp("Runtime.evaluate", {
            "expression": "Boolean(document.querySelector('header') || document.body)",
            "returnByValue": True
        })
        if res.get("result", {}).get("value") is True:
            break

    setup_script = """
    localStorage.setItem('aaroha_user', JSON.stringify(""" + json.dumps(admin_user) + """));
    localStorage.setItem('aaroha_token', '""" + live_token + """');
    sessionStorage.setItem('aaroha_view', 'admin');
    sessionStorage.setItem('aaroha_admin_module', 'attendance');
    location.href = '/?view=admin';
    """
    cdp("Runtime.evaluate", {"expression": setup_script})

    for step in range(30):
        time.sleep(0.5)
        cdp("Runtime.evaluate", {
            "expression": """
            (() => {
                const navLinks = Array.from(document.querySelectorAll('button, a'));
                const attLink = navLinks.find(el => el.textContent && el.textContent.includes('Attendance'));
                if (attLink && !document.querySelector('table')) {
                    attLink.click();
                }
            })()
            """
        })

        eval_res = cdp("Runtime.evaluate", {
            "expression": """
            (() => {
                const rows = document.querySelectorAll('tbody tr');
                const hasRoster = rows.length > 0 && !rows[0].textContent.includes('Loading') && !rows[0].textContent.includes('Choose');
                const studentNames = Array.from(document.querySelectorAll('tbody strong')).map(el => el.textContent.trim());
                return { hasRoster, studentNames };
            })()
            """,
            "returnByValue": True
        })

        data = eval_res.get("result", {}).get("value", {})
        if data.get("hasRoster") and len(data.get("studentNames", [])) > 0:
            print("  ✓ Live Hostinger Attendance Roster loaded with " + str(len(data.get("studentNames"))) + " students: " + ", ".join(data.get("studentNames")))
            break

    shot_res = cdp("Page.captureScreenshot", {"format": "png"})
    img_bytes = base64.b64decode(shot_res.get("data", ""))
    shot_path = os.path.join(OUT_DIR, "live_hostinger_attendance_verified.png")
    with open(shot_path, "wb") as f:
        f.write(img_bytes)
    print("Live Hostinger screenshot saved to: " + shot_path)

finally:
    try:
        ws.close()
    except:
        pass
    chrome_proc.terminate()

