"""
Anti-bot diagnostic for sh.lianjia.com
Tests the full warm-up → listing flow used by the updated spider.
"""
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# ── Reuse constants / helpers from the spider ─────────────────────────────────
from shanghai_spider import (
    BROWSER_PROFILES,
    BLOCKED_DOMAINS,
    BLOCKED_RESOURCE_TYPES,
    DISTRICT_MAP,
    _EXTRA_INIT_SCRIPT,
    _is_blocked,
    _delay,
    _make_stealth,
    _move_mouse,
    _pick_profile,
    _random_viewport,
    _scroll,
)

HOME_URL = "https://sh.lianjia.com/"
BASE_URL = "https://sh.lianjia.com/ershoufang/"


async def run_diagnostic():
    print("=" * 60)
    print("  Lianjia anti-bot diagnostic")
    print("=" * 60)

    ua, sec_ch_ua = _pick_profile()
    print(f"\nProfile : {ua[:60]}…")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--disable-extensions",
                "--no-first-run",
                "--disable-default-apps",
            ],
        )

        vp = _random_viewport()
        sec_ch_ua_platform = '"macOS"' if "Macintosh" in ua else '"Windows"'
        context = await browser.new_context(
            user_agent=ua,
            viewport=vp,
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
            geolocation={"longitude": 121.4737, "latitude": 31.2304},
            permissions=["geolocation"],
            extra_http_headers={
                "Accept-Language":    "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "sec-ch-ua":          sec_ch_ua,
                "sec-ch-ua-mobile":   "?0",
                "sec-ch-ua-platform": sec_ch_ua_platform,
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
            },
        )

        # Apply stealth to context
        stealth = _make_stealth(ua, sec_ch_ua)
        await stealth.apply_stealth_async(context)
        await context.add_init_script(_EXTRA_INIT_SCRIPT)

        # Resource-blocker
        page = await context.new_page()
        async def _block(route, request):
            if request.resource_type in BLOCKED_RESOURCE_TYPES:
                await route.abort(); return
            if any(d in request.url for d in BLOCKED_DOMAINS):
                await route.abort(); return
            await route.continue_()
        await page.route("**/*", _block)

        # ── 1. navigator leak check ─────────────────────────────────────────
        print("\n[1] Navigator fingerprint check")
        await page.goto("about:blank")
        wd      = await page.evaluate("navigator.webdriver")
        vendor  = await page.evaluate("navigator.vendor")
        plugins = await page.evaluate("navigator.plugins.length")
        lang    = await page.evaluate("navigator.language")
        platform= await page.evaluate("navigator.platform")
        print(f"    webdriver  = {wd}        (should be false/undefined)")
        print(f"    vendor     = {vendor!r}    (should be 'Google Inc.')")
        print(f"    plugins    = {plugins}           (should be > 0)")
        print(f"    language   = {lang!r}")
        print(f"    platform   = {platform!r}")

        # ── 2. Home page warm-up ────────────────────────────────────────────
        print("\n[2] Home page warm-up")
        await page.goto(HOME_URL, wait_until="domcontentloaded", timeout=25_000)
        await _delay(1.5, 3.0)
        await _move_mouse(page, steps=4)
        await _scroll(page)
        title = await page.title()
        blocked = await _is_blocked(page)
        print(f"    Title   : {title}")
        print(f"    Blocked : {blocked}")

        # ── 3. Listing pages ────────────────────────────────────────────────
        test_districts = [("黄浦", "huangpu"), ("徐汇", "xuhui")]
        all_ok = True
        for cn, slug in test_districts:
            print(f"\n[3] Listing page – {cn} ({slug})")
            url = f"{BASE_URL}{slug}/pg1/"
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await _delay(1.5, 2.5)
            title   = await page.title()
            blocked = await _is_blocked(page)
            print(f"    URL     : {url}")
            print(f"    Title   : {title}")
            print(f"    Blocked : {blocked}")

            if not blocked:
                items = await page.query_selector_all(".sellListContent li.clear")
                if not items:
                    items = await page.query_selector_all(".sellListContent li")
                print(f"    Listings: {len(items)}")
                if len(items) == 0:
                    # Dump a snippet of the HTML for diagnosis
                    html_snippet = (await page.content())[:500]
                    print(f"    HTML[0:500]: {html_snippet}")
                    all_ok = False
            else:
                all_ok = False
            await _delay(3.0, 6.0)

        await browser.close()

    print("\n" + "=" * 60)
    if all_ok:
        print("  RESULT: All checks passed – spider should work correctly.")
    else:
        print("  RESULT: Some checks failed.")
        print("  TIP:    Create data/login_creds.json with your Lianjia")
        print("          account credentials to enable auto-login:")
        print('          {"phone": "138XXXXXXXX", "password": "YourPass"}')
        print("  TIP:    Alternatively export cookies from a logged-in")
        print("          browser session and save them to data/cookies.json")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_diagnostic())