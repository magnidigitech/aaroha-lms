import subprocess
import time
import json
import base64
import os
import requests
import websocket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://127.0.0.1:5173"
PORT = 9230
OUT_DIR = r"C:\Users\krish\.gemini\antigravity\brain\e7d8d689-3ac0-498e-affc-3a95d9b04b94"

HOSTINGER_HTML_404 = """<!DOCTYPE html>
<html lang="en-us" prefix="content: http://purl.org/rss/1.0/modules/content/ dc: http://purl.org/dc/terms/ foaf: http://xmlns.com/foaf/0.1/ og: http://ogp.me/ns# rdfs: http://www.w3.org/2000/01/rdf-schema# sioc: http://rdfs.org/sioc/ns# sioct: http://rdfs.org/sioc/types# skos: http://www.w3.org/2004/02/skos/core# xsd: http://www.w3.org/2001/XMLSchema#">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>This Page Does Not Exist</title>
<script src="https://www.google-analytics.com/analytics.js"></script>
<script>ga('create', 'UA-26575989-46', 'auto'); ga('send', 'pageview');</script>
<style>body { background: #f4f5ff; font-family: 'DM Sans', sans-serif; }</style>
</head>
<body><div class="page-not-found"><img class="image" alt="Page Not Found" src="/htdocs_error/page_not_found.svg" />
<h1>This Page Does Not Exist</h1></div></body></html>"""

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
        self.ws_url = tabs[0]["webSocketDebuggerUrl"]
        self.ws = websocket.create_connection(self.ws_url)
        self.msg_id = 0

    def call(self, method, params=None):
        self.msg_id += 1
        payload = {"id": self.msg_id, "method": method, "params": params or {}}
        self.ws.send(json.dumps(payload))
        while True:
            raw = self.ws.recv()
            msg = json.loads(raw)
            if msg.get("id") == self.msg_id:
                if "error" in msg:
                    raise RuntimeError(f"CDP error in {method}: {msg['error']}")
                return msg.get("result", {})

    def evaluate(self, expr):
        res = self.call("Runtime.evaluate", {
            "expression": f"(() => {{ {expr} }})()",
            "returnByValue": True,
            "awaitPromise": True
        })
        return res.get("result", {}).get("value")

    def screenshot(self, filepath):
        res = self.call("Page.captureScreenshot", {"format": "png"})
        data = base64.b64decode(res["data"])
        with open(filepath, "wb") as f:
            f.write(data)

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass
        self.proc.terminate()
        self.proc.wait()

def main():
    print("Starting Headless Chrome E2E Verification for HTML Error Containment...")
    cdp = CDPClient(PORT)
    try:
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")

        # Preload script to mock HTML 404 response on demand
        escaped_html = json.dumps(HOSTINGER_HTML_404)
        cdp.call("Page.addScriptToEvaluateOnNewDocument", {
            "source": f"""
                const _realFetch = window.fetch;
                window.fetch = async function(url, opts) {{
                    const mockBatches = localStorage.getItem('__mock_batches_404') === '1';
                    const mockProfile = localStorage.getItem('__mock_profile_404') === '1';

                    if (mockBatches && typeof url === 'string' && url.includes('/admin/batches') && opts && opts.method === 'POST') {{
                        return new Response({escaped_html}, {{
                            status: 404,
                            statusText: 'Not Found',
                            headers: {{ 'Content-Type': 'text/html; charset=UTF-8' }}
                        }});
                    }}

                    if (mockProfile && typeof url === 'string' && url.includes('/user/profile') && (!opts || !opts.method || opts.method === 'GET')) {{
                        return new Response({escaped_html}, {{
                            status: 404,
                            statusText: 'Not Found',
                            headers: {{ 'Content-Type': 'text/html; charset=UTF-8' }}
                        }});
                    }}

                    return _realFetch(url, opts);
                }};
            """
        })

        print("Navigating to Aaroha LMS...")
        cdp.call("Page.navigate", {"url": f"{BASE_URL}/"})
        time.sleep(2)

        # 1. Login as Admin
        print("Authenticating as Administrator...")
        token_script = """
            return (async () => {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@aaroha-inc.com', password: 'password123' })
                });
                const data = await res.json();
                if (data.token) {
                    localStorage.setItem('aaroha_token', data.token);
                    localStorage.setItem('aaroha_user', JSON.stringify(data.user));
                    localStorage.removeItem('__mock_batches_404');
                    localStorage.removeItem('__mock_profile_404');
                    return { success: true, user: data.user };
                }
                return { success: false, error: data.error };
            })();
        """
        login_res = cdp.evaluate(token_script)
        print(f"Login result: {login_res}")

        # Navigate to Admin console
        cdp.call("Page.navigate", {"url": f"{BASE_URL}/?view=admin"})
        time.sleep(2)

        # Switch to Batches tab
        print("Selecting Batches tab in Admin console...")
        cdp.evaluate("""
            const buttons = Array.from(document.querySelectorAll('button'));
            const batchTab = buttons.find(b => b.innerText.trim() === 'Batches');
            if (batchTab) batchTab.click();
            return true;
        """)
        time.sleep(1)

        # TEST 1: Batch Creation with Mocked HTML 404 Error
        print("\n--- TEST 1: Batch Creation with Mocked Hostinger HTML 404 ---")
        # Enable batches 404 mock
        cdp.evaluate("""
            localStorage.setItem('__mock_batches_404', '1');
            return true;
        """)

        # Click "Create Batch" button
        cdp.evaluate("""
            const buttons = Array.from(document.querySelectorAll('button'));
            const createBtn = buttons.find(b => b.innerText.includes('Create Batch') || b.innerText.includes('Create Cohort Batch'));
            if (createBtn) createBtn.click();
            return true;
        """)
        time.sleep(1)

        # Fill in batch form fields via React prototype setters
        print("Filling in batch form fields inside modal...")
        cdp.evaluate("""
            const modal = document.querySelector('.fixed.inset-0 .bg-white');
            if (!modal) return false;
            
            const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
            const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            
            // Parent Course
            const courseSelect = modal.querySelector('select');
            if (courseSelect && courseSelect.options.length > 1) {
                selectSetter.call(courseSelect, courseSelect.options[1].value);
                courseSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Inputs
            const inputs = Array.from(modal.querySelectorAll('input'));
            const codeInput = inputs.find(i => i.placeholder && i.placeholder.includes('DCA-'));
            if (codeInput) {
                inputSetter.call(codeInput, 'TEST-OVERFLOW-404');
                codeInput.dispatchEvent(new Event('input', { bubbles: true }));
                codeInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            const titleInput = inputs.find(i => i.placeholder && i.placeholder.includes('Executive Cohort'));
            if (titleInput) {
                inputSetter.call(titleInput, 'Test Cohort Overflow Guard');
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                titleInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            const dateInputs = inputs.filter(i => i.type === 'date');
            if (dateInputs.length >= 2) {
                inputSetter.call(dateInputs[0], '2026-11-20');
                dateInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                
                inputSetter.call(dateInputs[1], '2026-12-20');
                dateInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                dateInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
        """)
        time.sleep(0.5)

        # Submit form by clicking submit button inside modal
        print("Clicking Create Batch submit button...")
        cdp.evaluate("""
            const modal = document.querySelector('.fixed.inset-0 .bg-white');
            const submitBtn = modal ? modal.querySelector('button[type="submit"]') : null;
            if (submitBtn) submitBtn.click();
            return true;
        """)
        time.sleep(1.5)

        # Verify Batch Creation Error Containment & Form Persistence
        batch_modal_check = """
            const modal = document.querySelector('.fixed.inset-0 .bg-white');
            if (!modal) return { found: false };
            
            const rect = modal.getBoundingClientRect();
            const hasHorizontalScroll = modal.scrollWidth > modal.clientWidth;
            const errorBanner = modal.querySelector('.bg-rose-50');
            const errorText = errorBanner ? errorBanner.innerText : '';
            const isRawHtml = errorText.includes('<!DOCTYPE') || errorText.includes('<html') || errorText.includes('UA-26575989-46');
            
            // Check form inputs preserved
            const inputs = Array.from(modal.querySelectorAll('input'));
            const codeInput = inputs.find(i => i.value === 'TEST-OVERFLOW-404');
            const titleInput = inputs.find(i => i.value === 'Test Cohort Overflow Guard');
            
            return {
                found: true,
                modalWidth: rect.width,
                scrollWidth: modal.scrollWidth,
                clientWidth: modal.clientWidth,
                hasHorizontalScroll,
                hasErrorBanner: !!errorBanner,
                errorText: errorText.trim(),
                isRawHtml,
                codePreserved: !!codeInput,
                titlePreserved: !!titleInput
            };
        """
        batch_result = cdp.evaluate(batch_modal_check)
        print("  Batch Modal Check Result:")
        print(f"    Width: {batch_result.get('modalWidth')}px (clientWidth: {batch_result.get('clientWidth')}, scrollWidth: {batch_result.get('scrollWidth')})")
        print(f"    Has Horizontal Scroll: {batch_result.get('hasHorizontalScroll')}")
        print(f"    Has Error Banner: {batch_result.get('hasErrorBanner')}")
        print(f"    Error Text: {batch_result.get('errorText')}")
        print(f"    Is Raw HTML Leaked: {batch_result.get('isRawHtml')}")
        print(f"    Form Inputs Preserved: Code={batch_result.get('codePreserved')}, Title={batch_result.get('titlePreserved')}")

        batch_screenshot_path = os.path.join(OUT_DIR, "batch_creation_error_contained.png")
        cdp.screenshot(batch_screenshot_path)
        print(f"  ✓ Screenshot saved: {batch_screenshot_path}")

        assert batch_result["found"] is True, "Batch modal was not found"
        assert batch_result["hasHorizontalScroll"] is False, "Batch modal had horizontal scrollbar!"
        assert batch_result["hasErrorBanner"] is True, "Batch error banner was not displayed!"
        assert batch_result["isRawHtml"] is False, "Batch modal leaked raw HTML into UI!"
        assert "404" in batch_result["errorText"], "Error text did not indicate 404 service error!"
        assert batch_result["codePreserved"] is True, "Batch code input was wiped out on error!"
        assert batch_result["titlePreserved"] is True, "Batch title input was wiped out on error!"
        print("  ✓ TEST 1 PASSED: Batch modal contained error cleanly without horizontal overflow and preserved entered inputs!")

        # Disable batch mock & close batch modal
        cdp.evaluate("""
            localStorage.removeItem('__mock_batches_404');
            const buttons = Array.from(document.querySelectorAll('button'));
            const cancelBtn = buttons.find(b => b.innerText.trim() === 'Cancel');
            if (cancelBtn) cancelBtn.click();
            return true;
        """)
        time.sleep(1)

        # TEST 2: Profile Modal with Mocked HTML 404 Error
        print("\n--- TEST 2: Profile & Institutional Settings with Mocked Hostinger HTML 404 ---")
        # Enable profile 404 mock
        cdp.evaluate("""
            localStorage.setItem('__mock_profile_404', '1');
            return true;
        """)

        # Open Profile Settings modal via canonical URL param
        cdp.call("Page.navigate", {"url": f"{BASE_URL}/?modal=profile"})
        time.sleep(2)

        # Click "Professional Information" tab
        cdp.evaluate("""
            const tabs = Array.from(document.querySelectorAll('button'));
            const profTab = tabs.find(t => t.innerText.includes('Professional Information') || t.innerText.includes('Institutional Profile'));
            if (profTab) profTab.click();
            return true;
        """)
        time.sleep(1.5)

        # Verify Profile Settings Error Containment & Save Disabled
        profile_modal_check = """
            const modal = document.querySelector('.fixed.inset-0 .bg-white');
            if (!modal) return { found: false };
            
            const rect = modal.getBoundingClientRect();
            const hasHorizontalScroll = modal.scrollWidth > modal.clientWidth;
            const errorBanner = modal.querySelector('.bg-amber-50');
            const errorText = errorBanner ? errorBanner.innerText : '';
            const isRawHtml = errorText.includes('<!DOCTYPE') || errorText.includes('<html') || errorText.includes('UA-26575989-46');
            
            const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Save Professional Information') || b.innerText.includes('Save'));
            const isSaveDisabled = saveBtn ? saveBtn.disabled : false;
            
            const retryBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.trim() === 'Retry');
            
            return {
                found: true,
                modalWidth: rect.width,
                scrollWidth: modal.scrollWidth,
                clientWidth: modal.clientWidth,
                hasHorizontalScroll,
                hasErrorBanner: !!errorBanner,
                errorText: errorText.trim(),
                isRawHtml,
                saveBtnFound: !!saveBtn,
                isSaveDisabled,
                retryBtnFound: !!retryBtn
            };
        """
        profile_result = cdp.evaluate(profile_modal_check)
        print("  Profile Modal Check Result:")
        print(f"    Width: {profile_result.get('modalWidth')}px (clientWidth: {profile_result.get('clientWidth')}, scrollWidth: {profile_result.get('scrollWidth')})")
        print(f"    Has Horizontal Scroll: {profile_result.get('hasHorizontalScroll')}")
        print(f"    Has Error Banner: {profile_result.get('hasErrorBanner')}")
        print(f"    Error Text: {profile_result.get('errorText')}")
        print(f"    Is Raw HTML Leaked: {profile_result.get('isRawHtml')}")
        print(f"    Save Button Disabled: {profile_result.get('isSaveDisabled')}")
        print(f"    Retry Button Found: {profile_result.get('retryBtnFound')}")

        profile_screenshot_path = os.path.join(OUT_DIR, "profile_settings_error_contained.png")
        cdp.screenshot(profile_screenshot_path)
        print(f"  ✓ Screenshot saved: {profile_screenshot_path}")

        assert profile_result["found"] is True, "Profile modal was not found"
        assert profile_result["hasHorizontalScroll"] is False, "Profile modal had horizontal scrollbar!"
        assert profile_result["hasErrorBanner"] is True, "Profile error banner was not displayed!"
        assert profile_result["isRawHtml"] is False, "Profile modal leaked raw HTML into UI!"
        assert "404" in profile_result["errorText"], "Error text did not indicate 404 service error!"
        assert profile_result["isSaveDisabled"] is True, "Save Professional Information was enabled on failed load!"
        assert profile_result["retryBtnFound"] is True, "Retry button was missing!"
        print("  ✓ TEST 2 PASSED: Profile modal contained error cleanly without horizontal overflow, kept Save button strictly disabled, and offered Retry!")

        # Disable mock and test Retry recovery
        print("\n--- TEST 3: Testing Retry Recovery in Profile Modal ---")
        cdp.evaluate("""
            localStorage.removeItem('__mock_profile_404');
            const retryBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Retry');
            if (retryBtn) retryBtn.click();
            return true;
        """)
        time.sleep(2)

        recovery_check = """
            const modal = document.querySelector('.fixed.inset-0 .bg-white');
            if (!modal) return { found: false };
            const errorBanner = modal.querySelector('.bg-amber-50');
            const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Save Professional Information') || b.innerText.includes('Save'));
            return {
                found: true,
                hasError: !!errorBanner,
                saveBtnDisabled: saveBtn ? saveBtn.disabled : true
            };
        """
        recovery_result = cdp.evaluate(recovery_check)
        print(f"  Recovery result: hasError={recovery_result.get('hasError')}, saveBtnDisabled={recovery_result.get('saveBtnDisabled')}")
        assert recovery_result["hasError"] is False, "Profile error banner remained after retry!"
        assert recovery_result["saveBtnDisabled"] is False, "Save button was not re-enabled after successful profile load!"
        print("  ✓ TEST 3 PASSED: Retry successfully recovered profile records and re-enabled Save button!")

        print("\n=======================================================")
        print("ALL E2E HTML CONTAINMENT & PROTECTION CHECKS PASSED!")
        print("=======================================================")

    finally:
        cdp.close()

if __name__ == '__main__':
    main()
