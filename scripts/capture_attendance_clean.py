import os
import sys
import time
import json
import base64
import subprocess
import urllib.request
import websocket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_CDP = 9252
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

# Login as admin to get token
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
time.sleep(2)

try:
    tabs_req = urllib.request.urlopen("http://127.0.0.1:" + str(PORT_CDP) + "/json")
    tabs = json.loads(tabs_req.read().decode())
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    ws = websocket.create_connection(ws_url)

    msg_id = 0
    def send_cdp(method, params=None):
        global msg_id
        msg_id += 1
        payload = {"id": msg_id, "method": method, "params": params or {}}
        ws.send(json.dumps(payload))
        while True:
            res = json.loads(ws.recv())
            if res.get("id") == msg_id:
                return res.get("result", {})

    send_cdp("Page.enable")
    send_cdp("Runtime.enable")

    # Set localStorage auth token
    send_cdp("Page.navigate", {"url": "https://lms.aaroha-inc.com"})
    time.sleep(3)

    set_token_js = f"""
    localStorage.setItem('aaroha_token', '{live_token}');
    localStorage.setItem('token', '{live_token}');
    localStorage.setItem('user', JSON.stringify({json.dumps(admin_user)}));
    """
    send_cdp("Runtime.evaluate", {"expression": set_token_js})

    # Reload page to enter Admin Portal
    send_cdp("Page.navigate", {"url": "https://lms.aaroha-inc.com"})
    time.sleep(4)

    # Click Attendance in sidebar navigation
    click_att = """
    (() => {
        const links = Array.from(document.querySelectorAll('button, a, div'));
        const attBtn = links.find(el => el.innerText && el.innerText.trim() === 'Attendance');
        if (attBtn) { attBtn.click(); return true; }
        return false;
    })()
    """
    send_cdp("Runtime.evaluate", {"expression": click_att})
    time.sleep(3)

    # Select the Session 1 from dropdown
    select_session = """
    (() => {
        const selects = document.querySelectorAll('select');
        for (const s of selects) {
            const opt = Array.from(s.options).find(o => o.value === '1' || o.text.includes('Consensus') || o.text.includes('Session 1') || o.text.includes('Raft'));
            if (opt) {
                s.value = opt.value;
                s.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
        }
        return false;
    })()
    """
    res_sel = send_cdp("Runtime.evaluate", {"expression": select_session})
    print("Selected Session 1:", res_sel)
    time.sleep(3)

    # Capture Attendance screen
    shot = send_cdp("Page.captureScreenshot", {"format": "png"})
    if shot.get("data"):
        img_path = os.path.join(OUT_DIR, "canonical_attendance_verified.png")
        with open(img_path, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("Captured Attendance screenshot:", img_path)

    ws.close()
finally:
    chrome_proc.terminate()

