import subprocess
import time
import json
import requests
import websocket
import sys

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://localhost:5173"

class ChromeController:
    def __init__(self, port=9222):
        self.port = port
        self.proc = subprocess.Popen([
            CHROME_PATH,
            "--headless=new",
            f"--remote-debugging-port={port}",
            "--remote-allow-origins=*",
            "--disable-gpu",
            "--no-sandbox",
            "--window-size=1280,900",
            "about:blank"
        ])
        time.sleep(2)
        tabs = [t for t in requests.get(f"http://localhost:{port}/json").json() if t.get("type") == "page"]
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

    def evaluate(self, expression):
        res = self.call("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in res:
            raise RuntimeError(f"JS Exception: {res['exceptionDetails']}")
        return res.get("result", {}).get("value")

    def navigate(self, url):
        self.call("Page.navigate", {"url": url})
        start = time.time()
        while time.time() - start < 10:
            try:
                res = self.call("Runtime.evaluate", {
                    "expression": "document.readyState",
                    "returnByValue": True
                })
                if res.get("result", {}).get("value") == "complete":
                    break
            except:
                pass
            time.sleep(0.2)
        time.sleep(1)

    def reload(self):
        self.call("Page.reload")
        start = time.time()
        while time.time() - start < 10:
            try:
                res = self.call("Runtime.evaluate", {
                    "expression": "document.readyState",
                    "returnByValue": True
                })
                if res.get("result", {}).get("value") == "complete":
                    break
            except:
                pass
            time.sleep(0.2)
        time.sleep(1)

    def set_viewport(self, width, height, is_mobile=False):
        self.call("Emulation.setDeviceMetricsOverride", {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": is_mobile
        })
        time.sleep(0.5)

    def close(self):
        try:
            self.ws.close()
        except:
            pass
        self.proc.terminate()
        self.proc.wait()

def run_tests():
    chrome = ChromeController()
    passed = 0
    total = 0

    def assert_true(cond, msg):
        nonlocal passed, total
        total += 1
        if cond:
            print(f" PASS: {msg}")
            passed += 1
        else:
            print(f" FAIL: {msg}")
            raise AssertionError(msg)

    try:
        print("\n=== Aaroha LMS Navigation & Session Verification Suite ===\n")

        # -------------------------------------------------------------
        # TEST 1: Admin Round Trip (Dashboard -> Homepage -> My Dashboard)
        # -------------------------------------------------------------
        print("--- TEST 1: Admin Navigation Round Trip ---")
        chrome.navigate(f"{BASE_URL}/")
        
        # Inject Admin session
        admin_user = {
            "id": 1,
            "full_name": "Dr. Aris Thorne",
            "email": "admin@aaroha-inc.com",
            "role": "super_admin",
            "title": "Dean & Academic Director",
            "avatar": "/avatars/3d/memo_13.png"
        }
        chrome.evaluate(f"""
            localStorage.setItem('aaroha_user', JSON.stringify({json.dumps(admin_user)}));
            localStorage.setItem('aaroha_token', 'test_admin_token');
        """)

        # Navigate to Admin Dashboard
        chrome.navigate(f"{BASE_URL}/?view=admin")
        time.sleep(1)

        # 1.1 Verify on Admin Dashboard
        url = chrome.evaluate("window.location.href")
        assert_true("view=admin" in url, f"Admin portal URL loaded: {url}")
        
        # 1.2 Verify Aaroha Logo exists and has title / role linking to website
        logo_title = chrome.evaluate("""
            (() => {
                const logo = document.querySelector('aside [title*="Return to Public Homepage"]');
                return logo ? logo.getAttribute('title') : null;
            })()
        """)
        assert_true(logo_title is not None, "Aaroha Logo in AdminSidebar links to homepage")

        # 1.3 Verify "Back to Website" in AdminSidebar
        sidebar_btn = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside button'));
                return btns.some(b => b.textContent.includes('Back to Website'));
            })()
        """)
        assert_true(sidebar_btn, "'Back to Website' button clearly visible in AdminSidebar")

        # 1.4 Verify "Back to Website" in header bar
        header_btn = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                return btns.some(b => b.textContent.includes('Back to Website'));
            })()
        """)
        assert_true(header_btn, "'Back to Website' button clearly visible in Admin header")

        # 1.5 Click "Back to Website" button in header
        chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                const btn = btns.find(b => b.textContent.includes('Back to Website'));
                if (btn) btn.click();
            })()
        """)
        time.sleep(1)

        # Verify URL is now homepage (clean '/' or view=catalog)
        current_url = chrome.evaluate("window.location.href")
        assert_true("view=admin" not in current_url, f"Navigated to public homepage: {current_url}")

        # Verify login session is preserved
        stored_user = chrome.evaluate("JSON.parse(localStorage.getItem('aaroha_user') || '{}')")
        assert_true(stored_user.get("role") == "super_admin", "Admin session preserved in localStorage")

        # 1.6 Verify "My Dashboard" is shown on public website instead of "Log In"
        has_my_dashboard = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                return btns.some(b => b.textContent.includes('My Dashboard'));
            })()
        """)
        has_login = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                return btns.some(b => b.textContent.trim() === 'Log In');
            })()
        """)
        assert_true(has_my_dashboard, "'My Dashboard' button shown for authenticated user on homepage")
        assert_true(not has_login, "'Log In' button is hidden for authenticated user")

        # 1.7 Verify Logout is a separate, explicit action
        has_logout = chrome.evaluate("""
            (() => {
                const btn = document.querySelector('header button[title="Sign Out"]');
                return btn !== null;
            })()
        """)
        assert_true(has_logout, "Logout button ('Sign Out') is a separate explicit action")

        # 1.8 Click "My Dashboard" -> should return to Admin Portal
        chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                const btn = btns.find(b => b.textContent.includes('My Dashboard'));
                if (btn) btn.click();
            })()
        """)
        time.sleep(1)
        returned_url = chrome.evaluate("window.location.href")
        assert_true("view=admin" in returned_url, f"'My Dashboard' returned to Admin Dashboard: {returned_url}")

        # -------------------------------------------------------------
        # TEST 2: Faculty Round Trip
        # -------------------------------------------------------------
        print("\n--- TEST 2: Faculty Navigation Round Trip ---")
        faculty_user = {
            "id": 2,
            "full_name": "Prof. Elena Vance",
            "email": "elena.vance@aaroha-inc.com",
            "role": "faculty",
            "title": "Lead Faculty Instructor",
            "avatar": "/avatars/3d/memo_14.png"
        }
        chrome.evaluate(f"""
            localStorage.setItem('aaroha_user', JSON.stringify({json.dumps(faculty_user)}));
            localStorage.setItem('aaroha_token', 'test_faculty_token');
        """)
        chrome.navigate(f"{BASE_URL}/?view=admin")
        time.sleep(1)

        # Click Aaroha Logo in AdminSidebar to navigate to public homepage
        chrome.evaluate("""
            (() => {
                const logo = document.querySelector('aside [title*="Return to Public Homepage"]');
                if (logo) logo.click();
            })()
        """)
        time.sleep(1)

        home_url = chrome.evaluate("window.location.href")
        assert_true("view=admin" not in home_url, f"Aaroha Logo navigated to public homepage: {home_url}")

        # Verify "My Dashboard" returns faculty to Admin/Faculty Console
        chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                const btn = btns.find(b => b.textContent.includes('My Dashboard'));
                if (btn) btn.click();
            })()
        """)
        time.sleep(1)
        faculty_dash_url = chrome.evaluate("window.location.href")
        assert_true("view=admin" in faculty_dash_url, f"'My Dashboard' returned faculty to Faculty Portal: {faculty_dash_url}")

        # -------------------------------------------------------------
        # TEST 3: Student Round Trip
        # -------------------------------------------------------------
        print("\n--- TEST 3: Student Navigation Round Trip ---")
        student_user = {
            "id": 7,
            "full_name": "Kiran Kumar",
            "email": "kiran.kumar@student.aaroha.edu",
            "role": "student",
            "title": "Student Fellow",
            "avatar": "/avatars/3d/memo_2.png"
        }
        chrome.evaluate(f"""
            localStorage.setItem('aaroha_user', JSON.stringify({json.dumps(student_user)}));
            localStorage.setItem('aaroha_token', 'test_student_token');
        """)
        chrome.navigate(f"{BASE_URL}/?view=student")
        time.sleep(1)

        # 3.1 Verify on Student Dashboard
        student_url = chrome.evaluate("window.location.href")
        assert_true("view=student" in student_url, f"Student dashboard loaded: {student_url}")

        # 3.2 Verify Aaroha Logo in Navbar
        has_nav_logo = chrome.evaluate("""
            (() => {
                const img = document.querySelector('header img[alt="Aaroha Technologies"]');
                return img !== null;
            })()
        """)
        assert_true(has_nav_logo, "Aaroha Logo exists in Navbar on Student Dashboard")

        # 3.3 Verify "Back to Website" link in Navbar
        has_student_back = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                return btns.some(b => b.textContent.includes('Back to Website'));
            })()
        """)
        assert_true(has_student_back, "'Back to Website' button visible in Navbar on Student Dashboard")

        # 3.4 Verify "Back to Website" and Logo in DashboardHeader
        has_dashheader_back = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('main button'));
                return btns.some(b => b.textContent.includes('Back to Website'));
            })()
        """)
        assert_true(has_dashheader_back, "'Back to Website' button visible in DashboardHeader")

        # 3.5 Click "Back to Website"
        chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                const btn = btns.find(b => b.textContent.includes('Back to Website'));
                if (btn) btn.click();
            })()
        """)
        time.sleep(1)

        # Verify on public homepage
        student_home_url = chrome.evaluate("window.location.href")
        assert_true("view=student" not in student_home_url, f"Student reached public homepage: {student_home_url}")

        # Verify session is preserved as student
        current_student = chrome.evaluate("JSON.parse(localStorage.getItem('aaroha_user') || '{}')")
        assert_true(current_student.get("role") == "student", "Student session preserved on public homepage")

        # 3.6 Verify "My Dashboard" button is shown on public website
        has_student_my_dash = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                return btns.some(b => b.textContent.includes('My Dashboard'));
            })()
        """)
        assert_true(has_student_my_dash, "'My Dashboard' button shown on homepage for student")

        # 3.7 Click "My Dashboard" -> should return to Student Dashboard
        chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                const btn = btns.find(b => b.textContent.includes('My Dashboard'));
                if (btn) btn.click();
            })()
        """)
        time.sleep(1)
        returned_student_url = chrome.evaluate("window.location.href")
        assert_true("view=student" in returned_student_url, f"'My Dashboard' returned student to Student Dashboard: {returned_student_url}")

        # -------------------------------------------------------------
        # TEST 4: Direct Navigation & Page Refresh
        # -------------------------------------------------------------
        print("\n--- TEST 4: Direct Navigation & Page Refresh ---")
        # 4.1 Direct navigation to public homepage root '/' while logged in
        chrome.navigate(f"{BASE_URL}/")
        time.sleep(1)
        direct_url = chrome.evaluate("window.location.href")
        assert_true("view=student" not in direct_url and "view=admin" not in direct_url, f"Direct navigation to '/' remained on homepage: {direct_url}")
        is_still_logged_in = chrome.evaluate("localStorage.getItem('aaroha_user') !== null")
        assert_true(is_still_logged_in, "Direct navigation to '/' preserved login credentials")

        # 4.2 Page refresh (F5) on public homepage
        chrome.reload()
        time.sleep(1)
        refresh_url = chrome.evaluate("window.location.href")
        assert_true("view=student" not in refresh_url and "view=admin" not in refresh_url, f"Refresh on homepage stayed on homepage: {refresh_url}")
        refresh_my_dash = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header button'));
                return btns.some(b => b.textContent.includes('My Dashboard'));
            })()
        """)
        assert_true(refresh_my_dash, "'My Dashboard' button present after page refresh on homepage")

        # 4.3 Page refresh on Student Dashboard
        chrome.navigate(f"{BASE_URL}/?view=student")
        time.sleep(1)
        chrome.reload()
        time.sleep(1)
        refreshed_student = chrome.evaluate("window.location.href")
        assert_true("view=student" in refreshed_student, f"Refresh on Student Dashboard preserved view: {refreshed_student}")

        # -------------------------------------------------------------
        # TEST 5: Mobile Navigation
        # -------------------------------------------------------------
        print("\n--- TEST 5: Mobile Navigation & Drawer ---")
        chrome.set_viewport(375, 667, is_mobile=True)
        time.sleep(0.5)

        # 5.1 On public homepage on mobile
        chrome.navigate(f"{BASE_URL}/")
        time.sleep(1)

        # Open mobile drawer
        chrome.evaluate("""
            (() => {
                const menuBtn = document.querySelector('header button[aria-label="Open navigation menu"]');
                if (menuBtn) menuBtn.click();
            })()
        """)
        time.sleep(0.5)

        # Verify "My Dashboard" in mobile drawer
        mobile_my_dash = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header .md\\\\:hidden button'));
                return btns.some(b => b.textContent.includes('My Dashboard'));
            })()
        """)
        assert_true(mobile_my_dash, "'My Dashboard' visible in mobile drawer on public homepage")

        # Click "My Dashboard" in mobile drawer
        chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header .md\\\\:hidden button'));
                const btn = btns.find(b => b.textContent.includes('My Dashboard'));
                if (btn) btn.click();
            })()
        """)
        time.sleep(1)

        mobile_dash_url = chrome.evaluate("window.location.href")
        assert_true("view=student" in mobile_dash_url, f"Mobile drawer 'My Dashboard' navigated to: {mobile_dash_url}")

        # Open mobile drawer on student dashboard and verify "Back to Website"
        chrome.evaluate("""
            (() => {
                const menuBtn = document.querySelector('header button[aria-label="Open navigation menu"]');
                if (menuBtn) menuBtn.click();
            })()
        """)
        time.sleep(0.5)

        mobile_back_btn = chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header .md\\\\:hidden button'));
                return btns.some(b => b.textContent.includes('Back to Website'));
            })()
        """)
        assert_true(mobile_back_btn, "'Back to Website' visible in mobile drawer on student dashboard")

        # Click mobile "Back to Website"
        chrome.evaluate("""
            (() => {
                const btns = Array.from(document.querySelectorAll('header .md\\\\:hidden button'));
                const btn = btns.find(b => b.textContent.includes('Back to Website'));
                if (btn) btn.click();
            })()
        """)
        time.sleep(1)

        mobile_returned_home = chrome.evaluate("window.location.href")
        assert_true("view=student" not in mobile_returned_home, f"Mobile 'Back to Website' returned to homepage: {mobile_returned_home}")

        # -------------------------------------------------------------
        # TEST 6: Search Functionality Preserved
        # -------------------------------------------------------------
        print("\n--- TEST 6: Search & Filter Functionality Preserved ---")
        chrome.set_viewport(1280, 900, is_mobile=False)
        time.sleep(0.5)
        chrome.navigate(f"{BASE_URL}/")
        time.sleep(1)

        # Verify search input exists
        search_input_exists = chrome.evaluate("""
            (() => {
                const input = document.querySelector('input[placeholder*="What do you want to learn"]');
                return input !== null;
            })()
        """)
        assert_true(search_input_exists, "Homepage hero tech search bar exists and rendered")

        # Verify catalog courses rendered
        initial_course_count = chrome.evaluate("""
            document.querySelectorAll('.grid.grid-cols-1 > div').length
        """)
        assert_true(initial_course_count > 0, f"Initial catalog courses rendered: {initial_course_count}")

        print("\n" + "=" * 55)
        print(f" ALL {passed}/{total} VERIFICATION TESTS PASSED SUCCESSFULLY! ")
        print("=" * 55 + "\n")

    finally:
        chrome.close()

if __name__ == "__main__":
    run_tests()
