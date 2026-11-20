import os
import sys
import time
import json
import base64
import threading
import subprocess
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIST_DIR = os.path.abspath("aaroha_lms/frontend/dist")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_HTTP = 4175
PORT_CDP = 9247
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

# Intercept /api/admin/schedule to return empty sessions to test the zero-session guided state
class EmptyScheduleSPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/admin/schedule'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'sessions': []}).encode())
            return
        elif self.path.startswith('/api/'):
            self._proxy_request('GET')
            return

        path = self.translate_path(self.path)
        if not os.path.exists(path) and not '.' in os.path.basename(self.path):
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy_request('POST')
        else:
            self.send_error(404)

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

httpd = ThreadingHTTPServer(('127.0.0.1', PORT_HTTP), EmptyScheduleSPAHandler)
http_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
http_thread.start()

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

    cdp("Page.navigate", {"url": "http://127.0.0.1:" + str(PORT_HTTP) + "/"})

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
                if (attLink) attLink.click();
            })()
            """
        })

        eval_res = cdp("Runtime.evaluate", {
            "expression": """
            (() => {
                const hasEmptyState = document.body.textContent.includes('No Class Sessions Scheduled Yet');
                const hasCohortList = document.body.textContent.includes('Active Cohort Batches Ready for Scheduling');
                return { hasEmptyState, hasCohortList };
            })()
            """,
            "returnByValue": True
        })

        data = eval_res.get("result", {}).get("value", {})
        if data.get("hasEmptyState") and data.get("hasCohortList"):
            print("  ✓ Guided Empty State rendered with cohort batch list!")
            break

    shot_res = cdp("Page.captureScreenshot", {"format": "png"})
    img_bytes = base64.b64decode(shot_res.get("data", ""))
    shot_path = os.path.join(OUT_DIR, "attendance_guided_empty_state.png")
    with open(shot_path, "wb") as f:
        f.write(img_bytes)
    print("Empty state screenshot saved to: " + shot_path)

finally:
    try:
        ws.close()
    except:
        pass
    chrome_proc.terminate()
    httpd.shutdown()
