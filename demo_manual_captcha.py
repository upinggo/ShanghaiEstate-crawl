"""
Demo: Manual CAPTCHA Solving Mode

This script demonstrates how to run the crawler with manual CAPTCHA intervention
when no 2Captcha API key is configured.
"""

import asyncio
from shanghai_spider import ShanghaiHouseSpider


async def demo_manual_mode():
    """
    Run crawler in manual mode (no 2Captcha API key).

    When a CAPTCHA is detected:
    1. Browser stays open (set headless=False)
    2. Script pauses and waits for you
    3. You manually solve the CAPTCHA in the browser
    4. Press ENTER to continue crawling
    """

    print("=" * 60)
    print("Manual CAPTCHA Solving Demo")
    print("=" * 60)
    print()
    print("This demo shows how to handle CAPTCHAs manually.")
    print()
    print("When CAPTCHA appears:")
    print("  1. The browser will stay open")
    print("  2. You solve the CAPTCHA manually")
    print("  3. Press ENTER to continue")
    print("  4. Or type 'skip' to skip that page")
    print("  5. Or type 'quit' to stop")
    print()
    print("Starting crawler in 3 seconds...")
    print("=" * 60)
    print()

    await asyncio.sleep(3)

    # Create spider WITHOUT captcha_api_key (manual mode)
    spider = ShanghaiHouseSpider()

    # Run with headless=False so you can see the browser
    await spider.run(max_pages_per_district=1, headless=False)

    # Show statistics
    print()
    print("=" * 60)
    print("Demo Complete - Statistics:")
    print("=" * 60)
    print(f"Pages crawled: {spider.stats['total_crawled']}")
    print(f"Records inserted: {spider.stats['successful_inserts']}")
    print(f"Manual interventions: {spider.stats['manual_interventions']}")
    print("=" * 60)


async def demo_auto_mode_comparison():
    """
    Compare manual mode with 2Captcha auto mode
    """

    print("=" * 60)
    print("CAPTCHA Solving Modes Comparison")
    print("=" * 60)
    print()
    print("MODE 1: Manual Solving (No API Key)")
    print("  - Browser stays visible (headless=False recommended)")
    print("  - Script pauses when CAPTCHA detected")
    print("  - You solve it manually")
    print("  - Press ENTER to continue")
    print("  - FREE - no cost")
    print()
    print("MODE 2: Automatic Solving (With 2Captcha API Key)")
    print("  - Browser can be headless")
    print("  - Script automatically solves CAPTCHAs")
    print("  - No manual intervention needed")
    print("  - Costs ~$2.99 per 1000 CAPTCHAs")
    print()
    print("=" * 60)
    print()

    choice = input("Which mode to demo? [1=manual, 2=auto, q=quit]: ").strip()

    if choice == '1':
        print("\nStarting Manual Mode Demo...")
        await demo_manual_mode()

    elif choice == '2':
        api_key = input("\nEnter your 2Captcha API key: ").strip()
        if api_key:
            print("\nStarting Automatic Mode Demo...")
            spider = ShanghaiHouseSpider(captcha_api_key=api_key)
            await spider.run(max_pages_per_district=1, headless=True)

            print()
            print("=" * 60)
            print("Demo Complete - Statistics:")
            print("=" * 60)
            print(f"Pages crawled: {spider.stats['total_crawled']}")
            print(f"CAPTCHAs auto-solved: {spider.stats['captchas_solved']}")
            print(f"CAPTCHA failures: {spider.stats['captcha_failures']}")
            print("=" * 60)
        else:
            print("No API key provided. Exiting...")
    else:
        print("Exiting...")


def main():
    """Main entry point"""
    print()
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "Shanghai House Spider - CAPTCHA Demo" + " " * 12 + "║")
    print("╚" + "═" * 58 + "╝")
    print()

    try:
        asyncio.run(demo_auto_mode_comparison())
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user.")
    except Exception as e:
        print(f"\n\nError: {e}")


if __name__ == "__main__":
    main()
