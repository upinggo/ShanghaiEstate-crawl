"""
Lianjia Cookie Exporter
=======================
Opens a VISIBLE browser window pointed at the Lianjia login page.
Log in manually (phone / WeChat / any method, including any CAPTCHA /
SMS verification the site presents).

The script auto-detects login completion by polling three signals:
  1. The page URL leaves the clogin / passport domain
  2. A known session cookie appears (lianjia_token, SECURITYTOKEN, sessionid)
  3. A logged-in DOM element (user avatar / logout link) is visible

As soon as at least two signals fire the cookies are exported.  If the
auto-detector hasn't fired within LOGIN_TIMEOUT_SECS (default 300s) the
script gives up.  Manual overrides remain available: press ENTER in the
terminal or `touch /tmp/lianjia_login_done` to force an immediate export.

Usage:
    python export_cookies.py
"""

import asyncio
import json
import os
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

# Total time we're willing to wait for login before giving up.
LOGIN_TIMEOUT_SECS = int(os.environ.get("LIANJIA_LOGIN_TIMEOUT", "300"))
# Poll interval for auto-detection.
POLL_INTERVAL_SECS = 2
# How many signals must fire before we consider login complete.
# Two-of-three keeps us robust to false positives on any single signal.
REQUIRED_SIGNALS = 2

LOGIN_DOMAIN_HINTS = ("clogin.lianjia.com", "passport.lianjia.com", "/login")
SESSION_COOKIE_NAMES = {"lianjia_token", "SECURITYTOKEN", "sessionid", "lianjia_ssid"}
# Selectors that only render for a logged-in user.
LOGGED_IN_SELECTORS = (
    ".userInfo",
    ".user-info",
    "a[href*='logout']",
    ".myAgent",
    ".user_nick",
)


async def _url_signal(page) -> bool:
    """True when the page URL is no longer on the CAS/login domain."""
    try:
        url = page.url or ""
    except Exception:
        return False
    if not url or url == "about:blank":
        return False
    return not any(hint in url for hint in LOGIN_DOMAIN_HINTS)


async def _cookie_signal(context) -> bool:
    """True when at least one well-known session cookie is present."""
    try:
        cookies = await context.cookies()
    except Exception:
        return False
    names = {c.get("name") for c in cookies}
    return bool(names & SESSION_COOKIE_NAMES)


async def _dom_signal(page) -> bool:
    """True when a logged-in-only element is visible on the page."""
    for sel in LOGGED_IN_SELECTORS:
        try:
            loc = page.locator(sel).first
            if await loc.count() and await loc.is_visible():
                return True
        except Exception:
            continue
    return False


async def _wait_for_enter(loop: asyncio.AbstractEventLoop) -> None:
    """Non-blocking wait on stdin ENTER; silently no-ops if stdin isn't a TTY."""
    if not sys.stdin or not sys.stdin.isatty():
        # Block forever — the other waiters will resolve first.
        await asyncio.Event().wait()
        return
    await loop.run_in_executor(None, sys.stdin.readline)


async def _wait_for_sentinel(sentinel: Path) -> None:
    while not sentinel.exists():
        await asyncio.sleep(POLL_INTERVAL_SECS)


async def _wait_for_auto_signals(page, context) -> str:
    """Return a short description of the signals that fired."""
    while True:
        results = await asyncio.gather(
            _url_signal(page),
            _cookie_signal(context),
            _dom_signal(page),
        )
        url_ok, cookie_ok, dom_ok = results
        fired = sum(results)
        if fired >= REQUIRED_SIGNALS:
            labels = []
            if url_ok:
                labels.append("url-left-login")
            if cookie_ok:
                labels.append("session-cookie")
            if dom_ok:
                labels.append("logged-in-dom")
            return ", ".join(labels)
        await asyncio.sleep(POLL_INTERVAL_SECS)


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

        # Wait for login completion. Whichever finishes first wins:
        #   • auto-detector sees 2+ post-login signals
        #   • user presses ENTER on the controlling TTY
        #   • user creates the sentinel file (works from any shell / CI)
        #   • LOGIN_TIMEOUT_SECS elapses (safety net)
        sentinel = Path("/tmp/lianjia_login_done")
        sentinel.unlink(missing_ok=True)

        print(
            f"Browser is open. Log in normally — export will trigger "
            f"automatically once login is detected."
        )
        print(f"Manual overrides: press ENTER here, or run `touch {sentinel}`.")
        print(f"Timeout: {LOGIN_TIMEOUT_SECS}s. Waiting …", flush=True)

        loop = asyncio.get_running_loop()
        auto_task = asyncio.create_task(_wait_for_auto_signals(page, context))
        enter_task = asyncio.create_task(_wait_for_enter(loop))
        sentinel_task = asyncio.create_task(_wait_for_sentinel(sentinel))

        try:
            done, pending = await asyncio.wait(
                {auto_task, enter_task, sentinel_task},
                timeout=LOGIN_TIMEOUT_SECS,
                return_when=asyncio.FIRST_COMPLETED,
            )
        finally:
            for t in (auto_task, enter_task, sentinel_task):
                if not t.done():
                    t.cancel()

        if not done:
            print(
                f"\n⚠  Timed out after {LOGIN_TIMEOUT_SECS}s without a login "
                f"signal. Exporting whatever cookies exist — you may need to "
                f"rerun if the result is incomplete."
            )
        elif auto_task in done and not auto_task.cancelled():
            try:
                signals = auto_task.result()
                print(f"\n✓  Login auto-detected via: {signals}")
            except Exception:
                print("\n✓  Login auto-detected.")
        elif sentinel_task in done:
            print("\n✓  Sentinel file detected — proceeding.")
        else:
            print("\n✓  ENTER received — proceeding.")

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