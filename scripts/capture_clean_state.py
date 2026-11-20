import os
import sys
import time
import json
import base64
import subprocess
import urllib.request
import websocket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_CDP = 9250
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

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

    # Navigate to live website
    print("Navigating to https://lms.aaroha-inc.com...")
    send_cdp("Page.navigate", {"url": "https://lms.aaroha-inc.com"})
    time.sleep(4)

    # Click Sign In / Portal button to open Auth Modal
    eval_click = """
    (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In') || b.innerText.includes('Portal') || b.innerText.includes('Log In'));
        if (btn) { btn.click(); return true; }
        return false;
    })()
    """
    res = send_cdp("Runtime.evaluate", {"expression": eval_click, "returnByValue": True})
    print("Clicked Sign In:", res)
    time.sleep(2)

    # Screenshot Auth Modal
    shot = send_cdp("Page.captureScreenshot", {"format": "png"})
    if shot.get("data"):
        img_path = os.path.join(OUT_DIR, "canonical_auth_modal_verified.png")
        with open(img_path, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("Captured Auth Modal screenshot:", img_path)

    ws.close()
finally:
    chrome_proc.terminate()
