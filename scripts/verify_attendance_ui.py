import os
import sys
import time
import json
import base64
import threading
import subprocess
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIST_DIR = os.path.abspath("aaroha_lms/frontend/dist")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_HTTP = 4174
PORT_CDP = 9246
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

# 1. Login to live production backend to get genuine admin token
print("[1/5] Authenticating with live backend...")
login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login',
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    login_data = json.loads(resp.read().decode())
    live_token = login_data.get('token')
    admin_user = login_data.get('user', {})
    print("[1/5] Logged in as: " + str(admin_user.get('full_name')) + " (" + str(admin_user.get('role')) + ")")

# 2. Local HTTP server proxying /api to live backend and serving dist/
class ProxySPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy_request('POST')
        else:
            self.send_error(404)

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self._proxy_request('PUT')
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self._proxy_request('DELETE')
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy_request('GET')
            return

        path = self.translate_path(self.path)
        if not os.path.exists(path) and not '.' in os.path.basename(self.path):
            self.path = '/index.html'
        return super().do_GET()

    def _proxy_request(self, method):
        target_url = 'https://lms.aaroha-inc.com' + self.path
        body = None
        content_len = int(self.headers.get('Content-Length', 0))
        if content_len > 0:
            body = self.rfile.read(content_len)

        req_headers = {}
        for h in ['Content-Type', 'Authorization', 'Accept']:
            if h in self.headers:
                req_headers[h] = self.headers[h]

        proxy_req = urllib.request.Request(target_url, data=body, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(proxy_req) as resp:
                resp_data = resp.read()
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() in ['content-type', 'access-control-allow-origin']:
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp_data)
        except urllib.error.HTTPError as e:
            err_data = e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(err_data)
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def end_headers(self):
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        super().end_headers()

    def log_message(self, format, *args):
        pass

httpd = ThreadingHTTPServer(('127.0.0.1', PORT_HTTP), ProxySPAHandler)
http_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
http_thread.start()
print("[2/5] Local SPA + Live API Proxy running on 127.0.0.1:" + str(PORT_HTTP))

# 3. Launch Headless Chrome
print("[3/5] Launching Chrome...")
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

    # Navigate to app
    cdp("Page.navigate", {"url": "http://127.0.0.1:" + str(PORT_HTTP) + "/"})

    # Wait for page ready
    for _ in range(25):
        time.sleep(0.3)
        res = cdp("Runtime.evaluate", {
            "expression": "Boolean(document.querySelector('header') || document.body)",
            "returnByValue": True
        })
        if res.get("result", {}).get("value") is True:
            break

    # Seed Admin authenticated session in localStorage
    setup_script = """
    localStorage.setItem('aaroha_user', JSON.stringify(""" + json.dumps(admin_user) + """));
    localStorage.setItem('aaroha_token', '""" + live_token + """');
    sessionStorage.setItem('aaroha_view', 'admin');
    sessionStorage.setItem('aaroha_admin_module', 'attendance');
    location.href = '/?view=admin';
    """
    cdp("Runtime.evaluate", {"expression": setup_script})

    # Wait for Admin Portal View to mount and Attendance tab to load
    print("[4/5] Waiting for Attendance tab and student roster to render...")
    roster_loaded = False
    for step in range(30):
        time.sleep(0.5)
        # Click on Attendance nav item if not already open
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
                const sessionSelect = document.querySelector('select');
                return {
                    rowCount: rows.length,
                    hasRoster: hasRoster,
                    studentNames: studentNames,
                    hasSessionSelector: Boolean(sessionSelect)
                };
            })()
            """,
            "returnByValue": True
        })

        data = eval_res.get("result", {}).get("value", {})
        if data.get("hasRoster") and len(data.get("studentNames", [])) > 0:
            print("  ✓ Roster rendered with " + str(len(data.get("studentNames"))) + " students: " + ", ".join(data.get("studentNames")))
            roster_loaded = True
            break
        elif step % 4 == 0:
            print("  ... waiting for roster render (step " + str(step) + ", rows: " + str(data.get("rowCount")) + ")")

    # Take screenshot of the Attendance Management view
    print("[5/5] Capturing verification screenshot...")
    shot_res = cdp("Page.captureScreenshot", {"format": "png"})
    img_bytes = base64.b64decode(shot_res.get("data", ""))
    shot_path = os.path.join(OUT_DIR, "attendance_roster_loaded.png")
    with open(shot_path, "wb") as f:
        f.write(img_bytes)
    print("Screenshot saved to: " + shot_path)

    # Final assertion
    if roster_loaded:
        print("\n=== SUCCESS: Attendance roster loaded and rendered successfully! ===")
    else:
        print("\n=== WARNING: Roster did not load in time; check screenshot for UI state. ===")

finally:
    try:
        ws.close()
    except:
        pass
    chrome_proc.terminate()
    httpd.shutdown()
