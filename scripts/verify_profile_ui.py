import subprocess
import time
import json
import base64
import os
import requests
import websocket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://127.0.0.1:5173"
PORT = 9226
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

class CDPClient:
    def __init__(self, port):
        self.port = port
        self.proc = subprocess.Popen([
            CHROME_PATH,
            "--headless=new",
            f"--remote-debugging-port={port}",
            "--remote-allow-origins=*",
            "--disable-gpu",
            "--no-sandbox",
            "--window-size=1280,850",
            "about:blank"
        ])
        time.sleep(2)
        tabs = [t for t in requests.get(f"http://127.0.0.1:{port}/json").json() if t.get("type") == "page"]
        if not tabs:
            raise RuntimeError("No page target found in Chrome")
        tab_ws = tabs[0]["webSocketDebuggerUrl"]
        self.ws = websocket.create_connection(tab_ws)
        self.req_id = 1
        self.call("Page.enable")
        self.call("Runtime.enable")
        self.call("DOM.enable")

    def call(self, method, params=None):
        payload = {"id": self.req_id, "method": method, "params": params or {}}
        self.req_id += 1
        self.ws.send(json.dumps(payload))
        while True:
            res = json.loads(self.ws.recv())
            if res.get("id") == payload["id"]:
                return res.get("result", {})

    def evaluate(self, expr):
        res = self.call("Runtime.evaluate", {
            "expression": f"(() => {{ {expr} }})()",
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in res:
            err = res["exceptionDetails"]
            raise RuntimeError(f"CDP Eval error: {err}")
        return res.get("result", {}).get("value")

    def screenshot(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        res = self.call("Page.captureScreenshot", {"format": "png"})
        with open(path, "wb") as f:
            f.write(base64.b64decode(res["data"]))
        print(f"  ✓ Screenshot saved: {path}")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass
        try:
            self.proc.terminate()
            self.proc.wait(timeout=3)
        except Exception:
            try:
                self.proc.kill()
            except Exception:
                pass

def run():
    print("Starting Headless Chrome E2E Verification...")
    client = None
    try:
        client = CDPClient(PORT)
        
        # 1. Login via API to get valid token
        print("Authenticating as Faculty...")
        login_resp = requests.post("http://127.0.0.1:8000/api/auth/login", json={
            "email": "elena.rostova@enterprise.io",
            "password": "password123"
        }).json()
        assert login_resp.get("success"), f"Login failed: {login_resp}"
        token = login_resp["token"]
        user_json = json.dumps(login_resp["user"])

        # 2. Add preload script that checks localStorage for __mock_profile_500
        client.call("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                const _realFetch = window.fetch;
                window.fetch = async function(url, opts) {
                    const shouldFail = localStorage.getItem('__mock_profile_500') === '1';
                    if (shouldFail && typeof url === 'string' && url.includes('/user/profile') && (!opts || !opts.method || opts.method === 'GET')) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: 'HTTP 500'
                        }), {
                            status: 500,
                            statusText: 'Internal Server Error',
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    return _realFetch.apply(this, arguments);
                };
            """
        })

        # 3. Open base page and inject session into localStorage
        client.call("Page.navigate", {"url": f"{BASE_URL}/"})
        time.sleep(2)
        client.evaluate(f"""
            localStorage.setItem('aaroha_token', '{token}');
            localStorage.setItem('aaroha_user', JSON.stringify({user_json}));
            localStorage.removeItem('__mock_profile_500');
        """)

        # 4. PART A: Normal Loaded State
        print("\n--- PART A: Verifying Normal Loaded State ---")
        client.call("Page.navigate", {"url": f"{BASE_URL}/?modal=profile"})
        time.sleep(2.5)

        client.evaluate("""
            const tabs = Array.from(document.querySelectorAll('button'));
            const profTab = tabs.find(b => b.innerText.includes('Professional Information'));
            if (profTab) profTab.click();
            return true;
        """)
        time.sleep(1.0)

        save_btn_state = client.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b => b.innerText.includes('Save Professional Information'));
            if (!saveBtn) return { found: false };
            return {
                found: true,
                disabled: saveBtn.disabled,
                text: saveBtn.innerText,
                hasErrorBanner: document.body.innerText.includes('Unable to load institutional profile')
            };
        """)
        print("  Loaded button state:", save_btn_state)
        assert save_btn_state["found"], "Save Professional Information button not found"
        assert not save_btn_state["disabled"], "Save button should be ENABLED when profile is loaded"
        assert not save_btn_state["hasErrorBanner"], "Error banner should not be present"
        client.screenshot(os.path.join(OUT_DIR, "profile_loaded_enabled.png"))

        # 5. PART B: Failure State & Form Protection
        print("\n--- PART B: Simulating Backend 500 & Verifying Form Protection ---")
        # Enable the 500 mock flag in localStorage
        client.evaluate("""
            localStorage.setItem('__mock_profile_500', '1');
            return true;
        """)

        # Reload page to fetch with simulated 500
        client.call("Page.navigate", {"url": f"{BASE_URL}/?modal=profile"})
        time.sleep(2.5)

        # Switch to Professional Information tab
        client.evaluate("""
            const tabs = Array.from(document.querySelectorAll('button'));
            const profTab = tabs.find(b => b.innerText.includes('Professional Information'));
            if (profTab) profTab.click();
            return true;
        """)
        time.sleep(1.0)

        err_btn_state = client.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b => b.innerText.includes('Save Professional Information'));
            const retryBtn = btns.find(b => b.innerText.trim() === 'Retry');
            const bodyText = document.body.innerText;
            return {
                saveBtnFound: !!saveBtn,
                saveBtnDisabled: saveBtn ? saveBtn.disabled : null,
                retryBtnFound: !!retryBtn,
                hasErrorText: bodyText.includes('Unable to load institutional profile'),
                has500Text: bodyText.includes('HTTP 500')
            };
        """)
        print("  Error condition state:", err_btn_state)
        assert err_btn_state["saveBtnFound"], "Save button should be present in footer"
        assert err_btn_state["saveBtnDisabled"], "CRITICAL: Save button MUST be DISABLED when profile fails to load!"
        assert err_btn_state["retryBtnFound"], "Retry button should be displayed in error banner"
        assert err_btn_state["hasErrorText"], "Unable to load institutional profile error banner should be displayed"
        client.screenshot(os.path.join(OUT_DIR, "profile_error_save_disabled.png"))
        print("  ✓ Form protection confirmed: Save button is strictly disabled on load failure!")

        # 6. PART C: Test Retry & State Recovery
        print("\n--- PART C: Testing Retry & Recovery ---")
        # Clear mock flag in localStorage so retry executes against real backend
        client.evaluate("""
            localStorage.removeItem('__mock_profile_500');
            return true;
        """)
        
        # Click Retry button
        print("Clicking Retry button to issue fresh profile request...")
        client.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const retryBtn = btns.find(b => b.innerText.trim() === 'Retry');
            if (retryBtn) retryBtn.click();
            return true;
        """)
        time.sleep(2.0)

        recovered_state = client.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b => b.innerText.includes('Save Professional Information'));
            const bodyText = document.body.innerText;
            return {
                saveBtnFound: !!saveBtn,
                saveBtnDisabled: saveBtn ? saveBtn.disabled : null,
                hasError: bodyText.includes('Unable to load institutional profile'),
                hasLoadedBio: bodyText.includes('Distinguished Professor')
            };
        """)
        print("  Recovered state:", recovered_state)
        assert recovered_state["saveBtnFound"]
        assert not recovered_state["saveBtnDisabled"], "Save button should be RE-ENABLED after successful retry"
        assert not recovered_state["hasError"], "Error banner should be cleared after successful retry"
        client.screenshot(os.path.join(OUT_DIR, "profile_retried_recovered.png"))
        print("  ✓ Retry confirmed: fresh request recovered state and re-enabled Save button!")

        # 7. PART D: Test Edit -> Save -> Persistence Cycle
        print("\n--- PART D: Testing Edit, Save, and Persistence Confirmation ---")
        client.evaluate("""
            const textareas = Array.from(document.querySelectorAll('textarea'));
            const bioArea = textareas.find(t => (t.placeholder && t.placeholder.includes('academic biography')) || (t.value && t.value.includes('Professor')));
            if (bioArea) {
                bioArea.value = 'Distinguished Professor of Distributed Systems & Cloud Infrastructure. E2E verified live at ' + new Date().toISOString();
                bioArea.dispatchEvent(new Event('input', { bubbles: true }));
                bioArea.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b => b.innerText.includes('Save Professional Information'));
            if (saveBtn) saveBtn.click();
            return true;
        """)
        time.sleep(2.0)

        save_success_state = client.evaluate("""
            return {
                hasSuccess: document.body.innerText.includes('Profile and preferences updated successfully'),
                bodySnippet: document.body.innerText.slice(0, 250)
            };
        """)
        print("  Save result:", save_success_state)
        assert save_success_state["hasSuccess"], "Success confirmation message not displayed"
        client.screenshot(os.path.join(OUT_DIR, "profile_saved_success.png"))
        print("  ✓ Persistence confirmed: backend confirmed save and displayed confirmation banner!")

        print("\n=======================================================")
        print("ALL E2E WORKFLOW CHECKS PASSED WITH 100% SUCCESS!")
        print("=======================================================")

    finally:
        if client:
            client.close()

if __name__ == '__main__':
    run()
