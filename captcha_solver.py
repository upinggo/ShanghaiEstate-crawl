"""
2Captcha Integration Module for Shanghai House Spider

Supports solving:
  - ReCaptcha v2
  - ReCaptcha v3
  - Image captcha
  - hCaptcha

Usage:
    solver = CaptchaSolver(api_key="YOUR_2CAPTCHA_API_KEY")
    token = await solver.solve_recaptcha(page, sitekey="...")
"""

import asyncio
import logging
import time
from typing import Optional, Dict
import httpx

logger = logging.getLogger(__name__)


class CaptchaSolverError(Exception):
    """CAPTCHA solving failed"""
    pass


class CaptchaSolver:
    """2Captcha API integration for automated CAPTCHA solving"""

    BASE_URL = "http://2captcha.com"

    def __init__(self, api_key: str, timeout: int = 180):
        """
        Initialize 2Captcha solver

        Args:
            api_key: Your 2Captcha API key
            timeout: Maximum wait time for solution (seconds)
        """
        self.api_key = api_key
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def get_balance(self) -> float:
        """
        Check 2Captcha account balance

        Returns:
            Balance in USD
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/res.php",
                params={"key": self.api_key, "action": "getbalance", "json": 1}
            )
            data = response.json()

            if data.get("status") == 1:
                balance = float(data.get("request", 0))
                logger.info(f"2Captcha balance: ${balance:.2f}")
                return balance
            else:
                logger.error(f"Failed to get balance: {data.get('request')}")
                return 0.0
        except Exception as e:
            logger.error(f"Error checking balance: {e}")
            return 0.0

    async def solve_recaptcha_v2(self, page_url: str, sitekey: str,
                                  invisible: bool = False) -> Optional[str]:
        """
        Solve ReCaptcha v2

        Args:
            page_url: URL of the page with captcha
            sitekey: ReCaptcha site key (found in page source)
            invisible: Whether it's invisible reCAPTCHA

        Returns:
            Solution token or None if failed
        """
        logger.info(f"Submitting ReCaptcha v2 to 2Captcha (sitekey: {sitekey[:20]}...)")

        try:
            # Submit captcha
            params = {
                "key": self.api_key,
                "method": "userrecaptcha",
                "googlekey": sitekey,
                "pageurl": page_url,
                "json": 1
            }

            if invisible:
                params["invisible"] = 1

            response = await self.client.get(f"{self.BASE_URL}/in.php", params=params)
            data = response.json()

            if data.get("status") != 1:
                error_msg = data.get("request", "Unknown error")
                logger.error(f"2Captcha submission failed: {error_msg}")
                return None

            captcha_id = data.get("request")
            logger.info(f"Captcha submitted, ID: {captcha_id}")

            # Poll for result
            return await self._wait_for_result(captcha_id)

        except Exception as e:
            logger.error(f"Error solving ReCaptcha v2: {e}")
            return None

    async def solve_recaptcha_v3(self, page_url: str, sitekey: str,
                                  action: str = "verify",
                                  min_score: float = 0.3) -> Optional[str]:
        """
        Solve ReCaptcha v3

        Args:
            page_url: URL of the page with captcha
            sitekey: ReCaptcha site key
            action: Action name from the site
            min_score: Minimum score (0.1 to 0.9)

        Returns:
            Solution token or None if failed
        """
        logger.info(f"Submitting ReCaptcha v3 to 2Captcha")

        try:
            params = {
                "key": self.api_key,
                "method": "userrecaptcha",
                "version": "v3",
                "googlekey": sitekey,
                "pageurl": page_url,
                "action": action,
                "min_score": min_score,
                "json": 1
            }

            response = await self.client.get(f"{self.BASE_URL}/in.php", params=params)
            data = response.json()

            if data.get("status") != 1:
                logger.error(f"2Captcha submission failed: {data.get('request')}")
                return None

            captcha_id = data.get("request")
            logger.info(f"Captcha submitted, ID: {captcha_id}")

            return await self._wait_for_result(captcha_id)

        except Exception as e:
            logger.error(f"Error solving ReCaptcha v3: {e}")
            return None

    async def solve_hcaptcha(self, page_url: str, sitekey: str) -> Optional[str]:
        """
        Solve hCaptcha

        Args:
            page_url: URL of the page with captcha
            sitekey: hCaptcha site key

        Returns:
            Solution token or None if failed
        """
        logger.info(f"Submitting hCaptcha to 2Captcha")

        try:
            params = {
                "key": self.api_key,
                "method": "hcaptcha",
                "sitekey": sitekey,
                "pageurl": page_url,
                "json": 1
            }

            response = await self.client.get(f"{self.BASE_URL}/in.php", params=params)
            data = response.json()

            if data.get("status") != 1:
                logger.error(f"2Captcha submission failed: {data.get('request')}")
                return None

            captcha_id = data.get("request")
            logger.info(f"Captcha submitted, ID: {captcha_id}")

            return await self._wait_for_result(captcha_id)

        except Exception as e:
            logger.error(f"Error solving hCaptcha: {e}")
            return None

    async def solve_image_captcha(self, image_base64: str) -> Optional[str]:
        """
        Solve image-based captcha

        Args:
            image_base64: Base64 encoded image

        Returns:
            Solution text or None if failed
        """
        logger.info("Submitting image captcha to 2Captcha")

        try:
            params = {
                "key": self.api_key,
                "method": "base64",
                "body": image_base64,
                "json": 1
            }

            response = await self.client.post(f"{self.BASE_URL}/in.php", data=params)
            data = response.json()

            if data.get("status") != 1:
                logger.error(f"2Captcha submission failed: {data.get('request')}")
                return None

            captcha_id = data.get("request")
            logger.info(f"Captcha submitted, ID: {captcha_id}")

            return await self._wait_for_result(captcha_id)

        except Exception as e:
            logger.error(f"Error solving image captcha: {e}")
            return None

    async def _wait_for_result(self, captcha_id: str) -> Optional[str]:
        """
        Poll 2Captcha API for result

        Args:
            captcha_id: Captcha task ID

        Returns:
            Solution token/text or None if timeout
        """
        start_time = time.time()

        # Wait 10 seconds before first check (2Captcha recommendation)
        await asyncio.sleep(10)

        while time.time() - start_time < self.timeout:
            try:
                response = await self.client.get(
                    f"{self.BASE_URL}/res.php",
                    params={
                        "key": self.api_key,
                        "action": "get",
                        "id": captcha_id,
                        "json": 1
                    }
                )
                data = response.json()

                if data.get("status") == 1:
                    solution = data.get("request")
                    elapsed = time.time() - start_time
                    logger.info(f"Captcha solved in {elapsed:.1f}s")
                    return solution

                elif data.get("request") == "CAPCHA_NOT_READY":
                    # Still processing, wait and retry
                    await asyncio.sleep(5)
                    continue

                else:
                    # Error occurred
                    error_msg = data.get("request", "Unknown error")
                    logger.error(f"2Captcha error: {error_msg}")
                    return None

            except Exception as e:
                logger.error(f"Error polling result: {e}")
                await asyncio.sleep(5)
                continue

        logger.error(f"Captcha solving timeout after {self.timeout}s")
        return None

    async def report_bad(self, captcha_id: str) -> bool:
        """
        Report incorrect captcha solution (may get refund)

        Args:
            captcha_id: ID of the captcha to report

        Returns:
            True if reported successfully
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/res.php",
                params={
                    "key": self.api_key,
                    "action": "reportbad",
                    "id": captcha_id,
                    "json": 1
                }
            )
            data = response.json()

            if data.get("status") == 1:
                logger.info(f"Reported bad captcha: {captcha_id}")
                return True
            else:
                logger.warning(f"Failed to report bad captcha: {data.get('request')}")
                return False

        except Exception as e:
            logger.error(f"Error reporting bad captcha: {e}")
            return False


async def detect_captcha_type(page) -> Optional[Dict]:
    """
    Auto-detect captcha type on page

    Args:
        page: Playwright Page object

    Returns:
        Dict with captcha info or None if no captcha detected
    """
    try:
        # Check for ReCaptcha v2
        recaptcha_frame = await page.query_selector('iframe[src*="google.com/recaptcha"]')
        if recaptcha_frame:
            # Try to find sitekey
            sitekey = await page.evaluate("""
                () => {
                    const elem = document.querySelector('[data-sitekey]');
                    return elem ? elem.getAttribute('data-sitekey') : null;
                }
            """)
            if sitekey:
                logger.info(f"Detected ReCaptcha v2, sitekey: {sitekey[:20]}...")
                return {
                    "type": "recaptcha_v2",
                    "sitekey": sitekey,
                    "url": page.url
                }

        # Check for ReCaptcha v3
        recaptcha_v3 = await page.evaluate("""
            () => {
                const scripts = Array.from(document.querySelectorAll('script'));
                for (const script of scripts) {
                    if (script.src && script.src.includes('recaptcha') && script.src.includes('render=')) {
                        const match = script.src.match(/render=([^&]+)/);
                        return match ? match[1] : null;
                    }
                }
                return null;
            }
        """)
        if recaptcha_v3:
            logger.info(f"Detected ReCaptcha v3, sitekey: {recaptcha_v3[:20]}...")
            return {
                "type": "recaptcha_v3",
                "sitekey": recaptcha_v3,
                "url": page.url
            }

        # Check for hCaptcha
        hcaptcha_frame = await page.query_selector('iframe[src*="hcaptcha.com"]')
        if hcaptcha_frame:
            sitekey = await page.evaluate("""
                () => {
                    const elem = document.querySelector('[data-sitekey]');
                    return elem ? elem.getAttribute('data-sitekey') : null;
                }
            """)
            if sitekey:
                logger.info(f"Detected hCaptcha, sitekey: {sitekey[:20]}...")
                return {
                    "type": "hcaptcha",
                    "sitekey": sitekey,
                    "url": page.url
                }

        # Check for image captcha
        captcha_img = await page.query_selector('img[src*="captcha"], img[alt*="captcha"]')
        if captcha_img:
            logger.info("Detected image captcha")
            return {
                "type": "image",
                "element": captcha_img,
                "url": page.url
            }

        return None

    except Exception as e:
        logger.error(f"Error detecting captcha: {e}")
        return None


async def solve_and_submit(page, solver: CaptchaSolver) -> bool:
    """
    Auto-detect and solve captcha on current page

    Args:
        page: Playwright Page object
        solver: CaptchaSolver instance

    Returns:
        True if captcha was solved and submitted successfully
    """
    captcha_info = await detect_captcha_type(page)

    if not captcha_info:
        logger.warning("No captcha detected on page")
        return False

    captcha_type = captcha_info["type"]
    solution = None

    try:
        if captcha_type == "recaptcha_v2":
            solution = await solver.solve_recaptcha_v2(
                page_url=captcha_info["url"],
                sitekey=captcha_info["sitekey"]
            )

            if solution:
                # Inject solution token
                await page.evaluate(f"""
                    () => {{
                        document.getElementById('g-recaptcha-response').innerHTML = '{solution}';
                    }}
                """)
                logger.info("ReCaptcha v2 solution injected")
                return True

        elif captcha_type == "recaptcha_v3":
            solution = await solver.solve_recaptcha_v3(
                page_url=captcha_info["url"],
                sitekey=captcha_info["sitekey"]
            )

            if solution:
                # ReCaptcha v3 token needs to be submitted with form
                await page.evaluate(f"""
                    () => {{
                        window.recaptchaToken = '{solution}';
                    }}
                """)
                logger.info("ReCaptcha v3 solution stored")
                return True

        elif captcha_type == "hcaptcha":
            solution = await solver.solve_hcaptcha(
                page_url=captcha_info["url"],
                sitekey=captcha_info["sitekey"]
            )

            if solution:
                await page.evaluate(f"""
                    () => {{
                        document.querySelector('[name="h-captcha-response"]').value = '{solution}';
                    }}
                """)
                logger.info("hCaptcha solution injected")
                return True

        elif captcha_type == "image":
            # Get image as base64
            img_element = captcha_info["element"]
            img_base64 = await page.evaluate("""
                (img) => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    return canvas.toDataURL('image/png').split(',')[1];
                }
            """, img_element)

            solution = await solver.solve_image_captcha(img_base64)

            if solution:
                # Find input field and submit
                await page.fill('input[name*="captcha"], input[id*="captcha"]', solution)
                logger.info(f"Image captcha solution entered: {solution}")
                return True

        if not solution:
            logger.error(f"Failed to solve {captcha_type}")
            return False

    except Exception as e:
        logger.error(f"Error solving/submitting captcha: {e}")
        return False

    return False
