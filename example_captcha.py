"""
Example: Using 2Captcha Integration

This script demonstrates how to use the 2Captcha integration
in different scenarios.
"""

import asyncio
from captcha_solver import CaptchaSolver
from shanghai_spider import ShanghaiHouseSpider
from config import CAPTCHA_CONFIG


async def example_basic():
    """Basic usage: Spider with auto CAPTCHA solving"""
    print("Example 1: Spider with automatic CAPTCHA solving\n")

    # Initialize spider with 2Captcha
    spider = ShanghaiHouseSpider(captcha_api_key=CAPTCHA_CONFIG.api_key)

    # Run crawler - it will automatically solve CAPTCHAs if encountered
    await spider.run(max_pages_per_district=2, headless=True)

    # Check statistics
    print(f"\nCaptchas solved: {spider.stats['captchas_solved']}")
    print(f"Captcha failures: {spider.stats['captcha_failures']}")


async def example_check_balance():
    """Check 2Captcha account balance"""
    print("Example 2: Check 2Captcha balance\n")

    solver = CaptchaSolver(api_key=CAPTCHA_CONFIG.api_key)

    balance = await solver.get_balance()
    print(f"Current balance: ${balance:.2f}")

    if balance < 5.0:
        print("Warning: Balance is low. Add funds at https://2captcha.com/")

    await solver.close()


async def example_manual_solving():
    """Manual CAPTCHA detection and solving"""
    print("Example 3: Manual CAPTCHA solving\n")

    from playwright.async_api import async_playwright
    from captcha_solver import detect_captcha_type, solve_and_submit

    solver = CaptchaSolver(api_key=CAPTCHA_CONFIG.api_key)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to a page (example)
        await page.goto("https://sh.lianjia.com/ershoufang/")
        await asyncio.sleep(3)

        # Check if CAPTCHA is present
        captcha_info = await detect_captcha_type(page)

        if captcha_info:
            print(f"CAPTCHA detected: {captcha_info['type']}")

            # Solve it
            solved = await solve_and_submit(page, solver)

            if solved:
                print("CAPTCHA solved successfully!")
            else:
                print("Failed to solve CAPTCHA")
        else:
            print("No CAPTCHA detected on this page")

        await browser.close()
        await solver.close()


async def example_specific_captcha_type():
    """Solving a specific CAPTCHA type"""
    print("Example 4: Solve specific CAPTCHA type\n")

    solver = CaptchaSolver(api_key=CAPTCHA_CONFIG.api_key)

    # Example: Solve ReCaptcha v2
    solution = await solver.solve_recaptcha_v2(
        page_url="https://example.com/page",
        sitekey="6Le-wvkSAAAAAPBMRTvw0Q4Muexq5bi0DJwx_mJ-"  # Example sitekey
    )

    if solution:
        print(f"Solution token: {solution[:50]}...")
        print("You can now inject this into the page")
    else:
        print("Failed to solve CAPTCHA")

    await solver.close()


async def example_with_error_handling():
    """Production-ready example with error handling"""
    print("Example 5: Production-ready with error handling\n")

    if not CAPTCHA_CONFIG.enabled or not CAPTCHA_CONFIG.api_key:
        print("ERROR: CAPTCHA not configured. Set CAPTCHA_ENABLED=true and CAPTCHA_API_KEY in .env")
        return

    solver = CaptchaSolver(api_key=CAPTCHA_CONFIG.api_key)

    try:
        # Check balance first
        balance = await solver.get_balance()
        print(f"Balance: ${balance:.2f}")

        if balance < 1.0:
            print("ERROR: Insufficient balance. Add funds at https://2captcha.com/")
            return

        # Run spider
        spider = ShanghaiHouseSpider(captcha_api_key=CAPTCHA_CONFIG.api_key)
        await spider.run(max_pages_per_district=2, headless=True)

        # Report statistics
        total = spider.stats['captchas_solved'] + spider.stats['captcha_failures']
        if total > 0:
            success_rate = (spider.stats['captchas_solved'] / total) * 100
            print(f"\nCAPTCHA Success Rate: {success_rate:.1f}%")

            estimated_cost = spider.stats['captchas_solved'] * 0.00299
            print(f"Estimated cost: ${estimated_cost:.4f}")

    except Exception as e:
        print(f"ERROR: {e}")

    finally:
        await solver.close()


async def main():
    """Run all examples"""
    print("=" * 60)
    print("2Captcha Integration Examples")
    print("=" * 60)
    print()

    # Check if configured
    if not CAPTCHA_CONFIG.api_key:
        print("WARNING: 2Captcha API key not configured!")
        print("Set CAPTCHA_API_KEY in .env file to run these examples.\n")
        return

    # Run examples
    examples = [
        ("Check Balance", example_check_balance),
        ("Basic Spider with Auto-Solve", example_basic),
        ("Manual Detection and Solving", example_manual_solving),
        ("Solve Specific Type", example_specific_captcha_type),
        ("Production-Ready", example_with_error_handling),
    ]

    for i, (name, func) in enumerate(examples, 1):
        print(f"\n{'=' * 60}")
        print(f"Example {i}: {name}")
        print('=' * 60)

        try:
            await func()
        except Exception as e:
            print(f"Error running example: {e}")

        if i < len(examples):
            input("\nPress Enter to continue to next example...")


if __name__ == "__main__":
    asyncio.run(main())
