"""
Lianjia Cookie Exporter
=======================
Opens a VISIBLE browser window pointed at the Lianjia login page.
Log in manually (phone / WeChat / any method, including any CAPTCHA /
SMS verification the site presents).  Once you are on a normal page
(not the passport login page), press ENTER in this terminal.
The session cookies are saved to data/cookies.json and will be loaded
automatically by shanghai_spider.py on every subsequent run.

Usage:
    python export_cookies.py
"""

import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright
from playwright_stealth import Stealth

from shanghai_spider import (
    _EXTRA_INIT_SCRIPT,
    _make_stealth,
    _pick_profile,
    _random_viewport,
)

COOKIE_FILE = Path("data/cookies.json")
# The CAS server only accepts whitelisted `service` targets. This matches the
# URL Lianjia itself redirects to when hitting a listing page unauthenticated.
LOGIN_URL = (
    "https://clogin.lianjia.com/login"
    "?service=https%3A%2F%2Fwww.lianjia.com%2Fuser%2Fchecklogin"
    "%3Fredirect%3Dhttps%253A%252F%252Fsh.lianjia.com%252Fershoufang%252F"
)


async def export_cookies() -> None:
    print("=" * 60)
    print("  Lianjia Cookie Exporter")
    print("=" * 60)
    print()
    print("A browser window will open.  Please:")
    print("  1. Log in to Lianjia (phone, WeChat, etc.)")
    print("  2. Complete any CAPTCHA / SMS verification")
    print("  3. Make sure you can see a normal page (not the login screen)")
    print("  4. Come back here and press ENTER")
    print()

    ua, sec_ch_ua = _pick_profile()
    vp = _random_viewport()
    sec_ch_ua_platform = '"macOS"' if "Macintosh" in ua else '"Windows"'

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,   # VISIBLE – user needs to interact
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
            ],
        )
        context = await browser.new_context(
            user_agent=ua,
            viewport=vp,
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
            extra_http_headers={
                "Accept-Language":    "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "sec-ch-ua":          sec_ch_ua,
                "sec-ch-ua-mobile":   "?0",
                "sec-ch-ua-platform": sec_ch_ua_platform,
            },
        )

        stealth = _make_stealth(ua, sec_ch_ua)
        await stealth.apply_stealth_async(context)
        await context.add_init_script(_EXTRA_INIT_SCRIPT)

        page = await context.new_page()
        await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30_000)

        # Wait for the user to signal completion by creating a sentinel file.
        # This works whether the script is run from an interactive TTY or a
        # non-interactive shell (e.g. background task, CI).
        sentinel = Path("/tmp/lianjia_login_done")
        sentinel.unlink(missing_ok=True)
        print("Browser is open. When you finish logging in, run:")
        print(f"    touch {sentinel}")
        print("in another terminal. Waiting …", flush=True)

        while not sentinel.exists():
            await asyncio.sleep(2)

        sentinel.unlink(missing_ok=True)

        # Collect and save cookies
        cookies = await context.cookies()
        COOKIE_FILE.parent.mkdir(parents=True, exist_ok=True)
        COOKIE_FILE.write_text(
            json.dumps(cookies, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\n✓  {len(cookies)} cookies saved → {COOKIE_FILE}")
        print("  You can now run the spider headlessly:")
        print("  python shanghai_spider.py")

        await browser.close()

    # Quick validation: check lianjia-specific session cookies
    saved = json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
    session_names = {c["name"] for c in saved}
    important = {"lianjia_token", "lianjia_uuid", "SECURITYTOKEN", "sessionid"}
    found = important & session_names
    if found:
        print(f"\n✓  Session cookies found: {', '.join(sorted(found))}")
    else:
        print(f"\n⚠  No well-known session cookies found in {session_names!r}")
        print("   The export might have happened before login completed.")
        print("   Try running export_cookies.py again.")


if __name__ == "__main__":
    asyncio.run(export_cookies())