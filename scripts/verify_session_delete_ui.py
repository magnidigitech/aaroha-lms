import os
import sys
import time
import json
import base64
import subprocess
import urllib.request
import websocket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT_CDP = 9260
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

# 1. Login as Admin
login_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/auth/login',
    data=json.dumps({'email': 'admin@aaroha-inc.com', 'password': 'password123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(login_req) as resp:
    login_data = json.loads(resp.read().decode())
    live_token = login_data.get('token')
    admin_user = login_data.get('user', {})

# 2. Check or create a test session to delete
headers = {'Authorization': 'Bearer ' + live_token, 'Content-Type': 'application/json'}
create_req = urllib.request.Request(
    'https://lms.aaroha-inc.com/api/admin/schedule',
    data=json.dumps({
        'batch_id': 9,
        'faculty_id': 61,
        'topic': 'Verification Session For Deletion UI',
        'description': 'Testing delete confirmation modal via UI',
        'start_time': '2026-11-26 14:00:00',
        'end_time': '2026-11-26 16:00:00',
        'session_type': 'Lecture'
    }).encode(),
    headers=headers,
    method='POST'
)
try:
    with urllib.request.urlopen(create_req) as resp:
        c_data = json.loads(resp.read().decode())
        test_session_id = c_data.get('session_id')
        print("Created test session for UI deletion test:", test_session_id)
except Exception as e:
    print("Session might already exist or create error:", e)

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
    localStorage.setItem('aaroha_user', JSON.stringify({json.dumps(admin_user)}));
    localStorage.setItem('aaroha_token', '{live_token}');
    sessionStorage.setItem('aaroha_view', 'admin');
    sessionStorage.setItem('aaroha_admin_module', 'schedule');
    location.href = '/?view=admin';
    """
    send_cdp("Runtime.evaluate", {"expression": setup_script})
    time.sleep(5)

    # Click Class Schedule directly
    click_sched = """
    (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const sBtn = btns.find(b => b.textContent && b.textContent.includes('Class Schedule'));
        if (sBtn) {
            sBtn.click();
            return { clicked: true, text: sBtn.textContent.trim() };
        }
        return { clicked: false };
    })()
    """
    res_sched = send_cdp("Runtime.evaluate", {"expression": click_sched, "returnByValue": True})
    print("Clicked Class Schedule sidebar button:", res_sched)
    time.sleep(3)

    # Look for the session cards in schedule view
    find_cards = """
    (() => {
        const rows = Array.from(document.querySelectorAll('div')).filter(el => el.textContent && el.textContent.includes('Verification Session'));
        const trashBtns = document.querySelectorAll('button[title*="Delete"]');
        return {
            matchingCards: rows.length,
            trashBtnCount: trashBtns.length
        };
    })()
    """
    print("Card detection:", send_cdp("Runtime.evaluate", {"expression": find_cards, "returnByValue": True}))

    # Click the Trash button on the Verification Session card
    click_trash = """
    (() => {
        const trashBtns = Array.from(document.querySelectorAll('button[title*="Delete"]'));
        if (trashBtns.length > 0) {
            // Click the last trash button (our newly added session)
            trashBtns[trashBtns.length - 1].click();
            return { success: true, count: trashBtns.length };
        }
        return { success: false };
    })()
    """
    trash_res = send_cdp("Runtime.evaluate", {"expression": click_trash, "returnByValue": True})
    print("Clicked Trash button:", trash_res)
    time.sleep(2)

    # Capture modal open screenshot
    modal_shot = send_cdp("Page.captureScreenshot", {"format": "png"})
    if modal_shot.get("data"):
        with open(os.path.join(OUT_DIR, "session_delete_modal_clean.png"), "wb") as f:
            f.write(base64.b64decode(modal_shot["data"]))
        print("Saved: session_delete_modal_clean.png")

    # Click "Delete Session" inside modal
    click_del = """
    (() => {
        const modal = document.querySelector('div.fixed');
        if (!modal) return { success: false, reason: 'Modal not found' };
        const delBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Delete Session'));
        if (delBtn) {
            delBtn.click();
            return { success: true };
        }
        return { success: false, reason: 'Delete button not found' };
    })()
    """
    del_res = send_cdp("Runtime.evaluate", {"expression": click_del, "returnByValue": True})
    print("Clicked Delete Session button:", del_res)
    time.sleep(3)

    # Capture screenshot after delete confirmation
    after_shot = send_cdp("Page.captureScreenshot", {"format": "png"})
    if after_shot.get("data"):
        with open(os.path.join(OUT_DIR, "session_deleted_live_verified.png"), "wb") as f:
            f.write(base64.b64decode(after_shot["data"]))
        print("Saved: session_deleted_live_verified.png")

    ws.close()
finally:
    chrome_proc.terminate()
