"""
Shanghai House Spider – comprehensive anti-bot bypass for Lianjia.com

Techniques:
  1. playwright-stealth Stealth class (hides WebDriver, WebGL, plugins …)
  2. Realistic Chrome UA rotation
  3. Human-like mouse movement & scroll
  4. Cookie persistence (appear as returning visitor)
  5. Warm-up visit to home page (builds referer chain + sets session cookies)
  6. Resource blocking (images/media/fonts) – faster & smaller fingerprint
  7. Randomised viewport (1280-1920 × 768-1080)
  8. Gaussian-jittered per-request delay
  9. Exponential-backoff retry on transient failures
 10. Periodic browser-context rotation every N pages
 11. Extra JS init-script patching remaining automation leaks
"""

import asyncio
import json
import logging
import random
import re
import sqlite3
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional

from playwright.async_api import BrowserContext, Page, async_playwright
from playwright_stealth import Stealth

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("spider.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
TARGET_DISTRICTS = ["黄浦", "静安", "徐汇", "长宁", "虹口", "杨浦", "浦东", "闵行"]
BASE_URL = "https://sh.lianjia.com/ershoufang/"
HOME_URL = "https://sh.lianjia.com/"
COOKIE_FILE = Path("data/cookies.json")
CONTEXT_ROTATION_INTERVAL = 12   # rotate context every N pages

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
]

BLOCKED_RESOURCE_TYPES = {"image", "media", "font"}
BLOCKED_DOMAINS = {
    "google-analytics.com", "googletagmanager.com", "doubleclick.net",
    "hm.baidu.com", "cnzz.com", "umeng.com", "sensorsdata.cn",
}

# ── Extra JS injected into every page ────────────────────────────────────────
_INIT_SCRIPT = """
delete Object.getPrototypeOf(navigator).webdriver;
Object.defineProperty(navigator, 'plugins', {
    get: () => [
        { name:'PDF Viewer', filename:'internal-pdf-viewer', length:1,
          0:{ type:'application/pdf', suffixes:'pdf', description:'Portable Document Format' } },
        { name:'Chrome PDF Viewer', filename:'internal-pdf-viewer', length:1,
          0:{ type:'application/pdf', suffixes:'pdf', description:'' } },
    ]
});
Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN','zh','en-US','en'] });
window.chrome = { runtime:{}, loadTimes:function(){}, csi:function(){}, app:{} };
if (window.Notification) {
    Object.defineProperty(Notification, 'permission', { get: () => 'default' });
}
"""

# ── Stealth factory ───────────────────────────────────────────────────────────
def _make_stealth() -> Stealth:
    return Stealth(
        navigator_webdriver=True,
        navigator_user_agent=True,
        navigator_vendor=True,
        navigator_vendor_override="Google Inc.",
        navigator_plugins=True,
        navigator_languages=True,
        navigator_languages_override=["zh-CN", "zh", "en-US", "en"],
        navigator_platform=True,
        navigator_platform_override="Win32",
        navigator_permissions=True,
        navigator_hardware_concurrency=True,
        chrome_runtime=True,
        chrome_app=True,
        chrome_csi=True,
        chrome_load_times=True,
        webgl_vendor=True,
        webgl_vendor_override="Intel Inc.",
        webgl_renderer_override="Intel Iris OpenGL Engine",
        media_codecs=True,
        hairline=True,
        iframe_content_window=True,
        error_prototype=True,
    )

# ── Human-behaviour helpers ───────────────────────────────────────────────────
async def _delay(lo: float = 0.5, hi: float = 2.0) -> None:
    mu = (lo + hi) / 2
    sigma = (hi - lo) / 4
    await asyncio.sleep(max(lo, min(hi, random.gauss(mu, sigma))))


async def _move_mouse(page: Page, steps: int = 4) -> None:
    vp = page.viewport_size or {"width": 1366, "height": 768}
    x = random.randint(200, vp["width"] - 200)
    y = random.randint(150, vp["height"] - 150)
    for _ in range(steps):
        x = max(10, min(vp["width"] - 10, x + random.randint(-120, 120)))
        y = max(10, min(vp["height"] - 10, y + random.randint(-80, 80)))
        await page.mouse.move(x, y, steps=random.randint(6, 18))
        await asyncio.sleep(random.uniform(0.04, 0.18))


async def _scroll(page: Page) -> None:
    total_h = await page.evaluate("document.body.scrollHeight")
    vp_h = (page.viewport_size or {"height": 768})["height"]
    scrolled = 0
    while scrolled < min(total_h, vp_h * 3):
        delta = random.randint(200, 480)
        scrolled += delta
        await page.mouse.wheel(0, delta)
        await asyncio.sleep(random.uniform(0.12, 0.45))
        if random.random() < 0.12:
            await asyncio.sleep(random.uniform(0.8, 2.0))

# ── Cookie persistence ────────────────────────────────────────────────────────
def _load_cookies() -> List[Dict]:
    if COOKIE_FILE.exists():
        try:
            return json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def _save_cookies(cookies: List[Dict]) -> None:
    COOKIE_FILE.parent.mkdir(parents=True, exist_ok=True)
    COOKIE_FILE.write_text(
        json.dumps(cookies, ensure_ascii=False, indent=2), encoding="utf-8"
    )

# ── Context / page factory ────────────────────────────────────────────────────
def _random_viewport() -> Dict:
    widths  = [1280, 1366, 1440, 1536, 1600, 1920]
    heights = [768,  800,  864,  900,  1024, 1080]
    return {"width": random.choice(widths), "height": random.choice(heights)}


async def _new_context(browser, ua: str) -> BrowserContext:
    vp = _random_viewport()
    context = await browser.new_context(
        user_agent=ua,
        viewport=vp,
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
        geolocation={"longitude": 121.4737, "latitude": 31.2304},
        permissions=["geolocation"],
        extra_http_headers={
            "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "Upgrade-Insecure-Requests": "1",
        },
    )

    # Inject extra JS patch + stealth on every new page
    await context.add_init_script(_INIT_SCRIPT)
    stealth = _make_stealth()

    # Load persisted cookies
    saved = _load_cookies()
    if saved:
        try:
            await context.add_cookies(saved)
        except Exception:
            pass

    return context, stealth


async def _setup_page(context: BrowserContext, stealth: Stealth) -> Page:
    page = await context.new_page()
    await stealth.apply_stealth_async(page)

    # Block trackers and heavy resources
    async def _block(route, request):
        rtype = request.resource_type
        url = request.url
        if rtype in BLOCKED_RESOURCE_TYPES:
            await route.abort()
            return
        if any(d in url for d in BLOCKED_DOMAINS):
            await route.abort()
            return
        await route.continue_()

    await page.route("**/*", _block)
    return page


# ── Anti-spam detection ───────────────────────────────────────────────────────
async def _is_blocked(page: Page) -> bool:
    selectors = [
        'div[class*="captcha"]', 'div[class*="verify"]',
        'div[class*="shield"]',  'img[src*="captcha"]',
        '#baxia-punish',         '.punish-page',
    ]
    try:
        for sel in selectors:
            if await page.query_selector(sel):
                return True
        title = await page.title()
        if any(kw in title for kw in ["验证", "安全", "captcha", "verify"]):
            return True
    except Exception:
        pass
    return False


# ── Main spider class ─────────────────────────────────────────────────────────
class ShanghaiHouseSpider:
    def __init__(self, db_name: str = "shanghai_houses.db"):
        self.db_name = db_name
        self.stats = {
            "total_crawled": 0,
            "successful_inserts": 0,
            "failed_inserts": 0,
            "duplicate_records": 0,
        }
        self._init_db()

    # ── DB setup ──────────────────────────────────────────────────────────────
    def _init_db(self) -> None:
        conn = sqlite3.connect(self.db_name)
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS house_listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                community_id TEXT,
                community_name TEXT,
                district TEXT,
                title TEXT,
                total_price REAL,
                unit_price REAL,
                area REAL,
                floor_info TEXT,
                house_type TEXT,
                orientation TEXT,
                decoration TEXT,
                elevator TEXT,
                crawl_date DATE,
                source_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(community_id, title, crawl_date)
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_district_date ON house_listings(district, crawl_date)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_community   ON house_listings(community_name)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_price       ON house_listings(unit_price)")
        c.execute("""
            CREATE TABLE IF NOT EXISTS crawl_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crawl_date DATE,
                district TEXT,
                total_listings INTEGER,
                avg_price REAL,
                min_price REAL,
                max_price REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
        logger.info(f"Database {self.db_name} ready.")

    # ── Scrape one listing page ───────────────────────────────────────────────
    async def _scrape_page(self, page: Page, url: str, district: str, retries: int = 3) -> List[Dict]:
        for attempt in range(retries):
            try:
                logger.info(f"GET {url}  (attempt {attempt + 1})")
                await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                await _delay(1.5, 3.5)

                if await _is_blocked(page):
                    logger.warning(f"Anti-bot triggered on {url}")
                    # Save cookies before giving up — some blocks are temporary
                    _save_cookies(await page.context.cookies())
                    if attempt < retries - 1:
                        backoff = (2 ** attempt) * random.uniform(8, 15)
                        logger.info(f"Backing off {backoff:.0f}s …")
                        await asyncio.sleep(backoff)
                    continue

                # Simulate human reading the page
                await _move_mouse(page)
                await _scroll(page)
                await _delay(0.5, 1.5)

                listings = await page.query_selector_all(".sellListContent li.clear")
                if not listings:
                    listings = await page.query_selector_all(".sellListContent li")

                batch: List[Dict] = []
                for item in listings:
                    data = await self._extract(item, district)
                    if data:
                        batch.append(data)

                # Persist cookies after every successful page
                _save_cookies(await page.context.cookies())
                logger.info(f"Parsed {len(batch)} listings from {url}")
                return batch

            except Exception as exc:
                logger.error(f"Error on {url}: {exc}")
                if attempt < retries - 1:
                    await asyncio.sleep((2 ** attempt) * random.uniform(3, 6))

        return []

    # ── Extract one listing item ──────────────────────────────────────────────
    async def _extract(self, item, district: str) -> Optional[Dict]:
        try:
            title_el = await item.query_selector(".title a")
            if not title_el:
                return None
            title = (await title_el.inner_text()).strip()
            href  = await title_el.get_attribute("href") or ""
            if not title or not href:
                return None
            if href.startswith("/"):
                href = "https://sh.lianjia.com" + href

            total_price = await self._get_price(item, [".totalPrice .price", "[class*='totalPrice'] b"])
            unit_price  = await self._get_price(item, [".unitPrice span", "[class*='unitPrice'] span"])
            area, house_type, floor_info = await self._get_basic(item)
            orientation, decoration, elevator = await self._get_details(item)
            community = self._community_name(title)

            return {
                "community_id":   str(hash(f"{community}_{title[:20]}") % 10_000_000),
                "community_name": community,
                "district":       district,
                "title":          title,
                "total_price":    total_price,
                "unit_price":     unit_price,
                "area":           area,
                "floor_info":     floor_info,
                "house_type":     house_type,
                "orientation":    orientation,
                "decoration":     decoration,
                "elevator":       elevator,
                "crawl_date":     str(date.today()),
                "source_url":     href,
            }
        except Exception as exc:
            logger.debug(f"Extract error: {exc}")
            return None

    async def _get_price(self, item, selectors: List[str]) -> float:
        for sel in selectors:
            try:
                el = await item.query_selector(sel)
                if el:
                    m = re.search(r"(\d[\d,]*(?:\.\d+)?)", (await el.inner_text()).replace(",", ""))
                    if m:
                        return float(m.group(1))
            except Exception:
                pass
        return 0.0

    async def _get_basic(self, item) -> tuple:
        try:
            el = await item.query_selector(".houseInfo")
            if not el:
                return 0.0, "", ""
            text = await el.inner_text()
            area  = float(m.group(1)) if (m := re.search(r"(\d+(?:\.\d+)?)\s*平", text)) else 0.0
            htype = m.group(1) if (m := re.search(r"\d室\d厅", text)) else ""
            floor = m.group(0) if (m := re.search(r"(?:低|中|高)楼层", text)) else ""
            return area, htype, floor
        except Exception:
            return 0.0, "", ""

    async def _get_details(self, item) -> tuple:
        orientation = decoration = elevator = ""
        try:
            texts = []
            for sel in [".positionInfo", ".followInfo", ".houseInfo"]:
                el = await item.query_selector(sel)
                if el:
                    texts.append(await el.inner_text())
            combined = " ".join(texts)
            if m := re.search(r"[南北东西]+(?:朝|向)?", combined):
                orientation = m.group(0)
            for kw in ["精装", "简装", "毛坯", "豪装"]:
                if kw in combined:
                    decoration = kw
                    break
            if "电梯" in combined:
                elevator = "有电梯" if any(w in combined for w in ["有电梯", "电梯房"]) else "无电梯"
        except Exception:
            pass
        return orientation, decoration, elevator

    @staticmethod
    def _community_name(title: str) -> str:
        patterns = [
            r"^([^\s\d]+[苑区庭园墅馆轩阁邸府城居花园公馆里坊]+)",
            r"^([^\s\d]{2,8})",
        ]
        for p in patterns:
            if m := re.search(p, title.strip()):
                return m.group(1).strip()
        return title.split()[0] if title.split() else "未知小区"

    # ── Persist to DB ─────────────────────────────────────────────────────────
    def _save(self, rows: List[Dict]) -> None:
        if not rows:
            return
        conn = sqlite3.connect(self.db_name)
        c = conn.cursor()
        for r in rows:
            try:
                c.execute("""
                    INSERT OR IGNORE INTO house_listings
                    (community_id, community_name, district, title, total_price, unit_price,
                     area, floor_info, house_type, orientation, decoration, elevator,
                     crawl_date, source_url)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    r["community_id"], r["community_name"], r["district"], r["title"],
                    r["total_price"],  r["unit_price"],     r["area"],     r["floor_info"],
                    r["house_type"],   r["orientation"],    r["decoration"], r["elevator"],
                    r["crawl_date"],   r["source_url"],
                ))
                if c.rowcount > 0:
                    self.stats["successful_inserts"] += 1
                else:
                    self.stats["duplicate_records"] += 1
            except Exception as exc:
                logger.error(f"DB insert error: {exc}")
                self.stats["failed_inserts"] += 1
        conn.commit()
        conn.close()

    def _generate_stats(self) -> None:
        today = str(date.today())
        conn = sqlite3.connect(self.db_name)
        c = conn.cursor()
        for district in TARGET_DISTRICTS:
            c.execute("""
                SELECT COUNT(*), AVG(unit_price), MIN(unit_price), MAX(unit_price)
                FROM house_listings WHERE district=? AND crawl_date=?
            """, (district, today))
            row = c.fetchone()
            if row and row[0]:
                c.execute("""
                    INSERT INTO crawl_stats (crawl_date, district, total_listings, avg_price, min_price, max_price)
                    VALUES (?,?,?,?,?,?)
                """, (today, district, *row))
        conn.commit()
        conn.close()

    def _log_stats(self) -> None:
        logger.info("=" * 50)
        logger.info(f"Total crawled : {self.stats['total_crawled']}")
        logger.info(f"Inserted      : {self.stats['successful_inserts']}")
        logger.info(f"Duplicates    : {self.stats['duplicate_records']}")
        logger.info(f"Failed        : {self.stats['failed_inserts']}")
        logger.info("=" * 50)

    # ── Main entry point ──────────────────────────────────────────────────────
    async def run(self, max_pages_per_district: int = 3, headless: bool = True) -> None:
        logger.info("Starting Shanghai house spider …")
        Path("data").mkdir(exist_ok=True)

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=headless,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--window-size=1366,768",
                    "--disable-extensions",
                    "--no-first-run",
                    "--disable-default-apps",
                ],
            )

            ua = random.choice(USER_AGENTS)
            context, stealth = await _new_context(browser, ua)
            page = await _setup_page(context, stealth)
            page_count = 0
            all_data: List[Dict] = []

            # ── Warm-up: visit home page to get session cookies ───────────────
            try:
                logger.info("Warm-up: visiting home page …")
                await page.goto(HOME_URL, wait_until="domcontentloaded", timeout=25_000)
                await _delay(2.0, 4.0)
                await _move_mouse(page, steps=6)
                await _scroll(page)
                _save_cookies(await context.cookies())
                logger.info("Warm-up complete.")
            except Exception as exc:
                logger.warning(f"Warm-up failed (continuing anyway): {exc}")

            # ── Crawl listing pages ───────────────────────────────────────────
            for district in TARGET_DISTRICTS:
                logger.info(f"District: {district}")
                for pg_num in range(1, max_pages_per_district + 1):
                    # Rotate context periodically
                    if page_count > 0 and page_count % CONTEXT_ROTATION_INTERVAL == 0:
                        logger.info("Rotating browser context …")
                        _save_cookies(await context.cookies())
                        await context.close()
                        ua = random.choice(USER_AGENTS)
                        context, stealth = await _new_context(browser, ua)
                        page = await _setup_page(context, stealth)

                    url = f"{BASE_URL}{district}/pg{pg_num}/"
                    items = await self._scrape_page(page, url, district)
                    all_data.extend(items)
                    self.stats["total_crawled"] += len(items)
                    page_count += 1

                    if items:
                        self._save(items)

                    # Inter-page delay (longer between districts)
                    if pg_num < max_pages_per_district:
                        await _delay(4.0, 9.0)
                    else:
                        await _delay(8.0, 18.0)

            _save_cookies(await context.cookies())
            await context.close()
            await browser.close()

        if all_data:
            self._generate_stats()
            logger.info(f"Done — {len(all_data)} listings collected.")
        else:
            logger.warning("No data collected.")
        self._log_stats()

    def get_latest_data(self, limit: int = 100) -> List[Dict]:
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM house_listings ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return rows


# ── CLI entry ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    spider = ShanghaiHouseSpider()
    asyncio.run(spider.run(max_pages_per_district=2, headless=False))