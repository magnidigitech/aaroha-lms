import os
import sys
import time
import json
import base64
import threading
import subprocess
import requests
import websocket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIST_DIR = os.path.abspath("aaroha_lms/frontend/dist")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_HTTP = 4173
PORT_CDP = 9245
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # Serve index.html for SPA routes if path doesn't exist
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not '.' in os.path.basename(self.path):
            self.path = '/index.html'
        return super().do_GET()

    def end_headers(self):
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        super().end_headers()

    def log_message(self, format, *args):
        pass # Silence logs

# Start local HTTP server in background thread
httpd = ThreadingHTTPServer(('127.0.0.1', PORT_HTTP), SPAHandler)
http_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
http_thread.start()
print("Local HTTP server running on 127.0.0.1:" + str(PORT_HTTP))

# Launch Headless Chrome
chrome_proc = subprocess.Popen([
    CHROME_PATH,
    "--headless=new",
    "--remote-debugging-port=" + str(PORT_CDP),
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1280,800",
    "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)

try:
    tabs = requests.get("http://127.0.0.1:" + str(PORT_CDP) + "/json").json()
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

    # Wait for root element
    for _ in range(20):
        time.sleep(0.3)
        res = cdp("Runtime.evaluate", {
            "expression": "Boolean(document.querySelector('header'))",
            "returnByValue": True
        })
        if res.get("result", {}).get("value") is True:
            break

    # Seed student user session in localStorage
    setup_script = """
    localStorage.setItem('aaroha_user', JSON.stringify({
        id: 10,
        full_name: 'Ryu',
        email: 'ryu@aaroha.com',
        role: 'student',
        title: 'Student Fellow',
        avatar: '/avatars/3d/memo_13.png'
    }));
    localStorage.setItem('aaroha_token', 'test_token_student_123');
    sessionStorage.setItem('aaroha_view', 'student');
    location.href = '/?view=student';
    """
    cdp("Runtime.evaluate", {"expression": setup_script})

    # Wait for reload into student view
    for _ in range(20):
        time.sleep(0.3)
        res = cdp("Runtime.evaluate", {
            "expression": "Boolean(document.querySelector('header'))",
            "returnByValue": True
        })
        if res.get("result", {}).get("value") is True:
            break

    time.sleep(1)

    viewports = [
        (1024, 768, "navbar_student_1024.png"),
        (1280, 800, "navbar_student_1280.png"),
        (1440, 900, "navbar_student_1440.png"),
        (1920, 1080, "navbar_student_1920.png")
    ]

    for width, height, fname in viewports:
        cdp("Emulation.setDeviceMetricsOverride", {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        time.sleep(0.5)

        eval_code = """
        (() => {
            const header = document.querySelector('header');
            const searchInput = header ? header.querySelector('input') : null;
            const searchBox = searchInput ? searchInput.closest('div.relative') : null;
            const buttons = Array.from(header ? header.querySelectorAll('button') : [])
                .map(b => b.innerText.replace(/\\s+/g, ' ').trim())
                .filter(Boolean);
            return {
                headerWidth: header ? header.offsetWidth : 0,
                searchBoxWidth: searchBox ? searchBox.offsetWidth : 0,
                inputWidth: searchInput ? searchInput.offsetWidth : 0,
                placeholder: searchInput ? searchInput.getAttribute('placeholder') : '',
                buttons: buttons
            };
        })()
        """
        data = cdp("Runtime.evaluate", {"expression": eval_code, "returnByValue": True})
        info = data.get("result", {}).get("value", {})
        print("\n=== Viewport " + str(width) + "x" + str(height) + " ===")
        print("  Header width: " + str(info.get("headerWidth")) + "px")
        print("  Search box width: " + str(info.get("searchBoxWidth")) + "px")
        print("  Search input width: " + str(info.get("inputWidth")) + "px")
        print("  Placeholder: " + str(info.get("placeholder")))
        print("  Buttons: " + str(info.get("buttons")))

        clip_js = """
        (() => {
            const h = document.querySelector('header');
            if (!h) return null;
            const r = h.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
        })()
        """
        clip_data = cdp("Runtime.evaluate", {"expression": clip_js, "returnByValue": True})
        clip = clip_data.get("result", {}).get("value")
        if clip:
            ss = cdp("Page.captureScreenshot", {"format": "png", "clip": clip})
            b64 = ss.get("data")
            if b64:
                out_path = os.path.join(OUT_DIR, fname)
                with open(out_path, "wb") as f:
                    f.write(base64.b64decode(b64))
                print("  Screenshot saved: " + out_path)

    ws.close()
finally:
    chrome_proc.kill()
    httpd.shutdown()
