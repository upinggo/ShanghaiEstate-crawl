# Manual CAPTCHA Solving Guide

This guide explains how to handle CAPTCHAs manually when you don't have a 2Captcha API key.

## Overview

When the crawler encounters a CAPTCHA and **no 2Captcha API key is configured**, the system automatically switches to **Manual Mode**. The crawler will:

1. ✅ Pause execution
2. ✅ Keep the browser window open
3. ✅ Wait for you to solve the CAPTCHA
4. ✅ Continue crawling after you press ENTER

## Quick Start

### Run in Manual Mode

Simply run the spider WITHOUT providing a captcha_api_key:

```python
from shanghai_spider import ShanghaiHouseSpider
import asyncio

# No API key = Manual Mode
spider = ShanghaiHouseSpider()

# IMPORTANT: Use headless=False to see the browser!
asyncio.run(spider.run(max_pages_per_district=3, headless=False))
```

Or from command line:

```bash
# Make sure CAPTCHA_ENABLED=false in .env (or remove the config)
python shanghai_spider.py
```

## What Happens When CAPTCHA Appears

### 1. Detection

When the crawler detects a CAPTCHA, you'll see:

```
⚠️  Access blocked on https://sh.lianjia.com/ershoufang/huangpu/
============================================================
🔒 CAPTCHA DETECTED - Manual Intervention Required
============================================================
Page URL: https://sh.lianjia.com/ershoufang/huangpu/
Browser will stay open for manual solving...
Please solve the CAPTCHA in the browser window.

Options:
  1. Solve the CAPTCHA manually in the browser
  2. Press ENTER when done to continue crawling
  3. Or type 'skip' to skip this page
  4. Or type 'quit' to stop the crawler

Action [press ENTER when solved / skip / quit]:
```

### 2. Manual Solving

At this point:
- ✅ The browser window stays open
- ✅ You can see the CAPTCHA on screen
- ✅ The crawler is paused, waiting for you
- ✅ Take your time to solve it

### 3. Continue Crawling

After solving the CAPTCHA:

**Option A: Continue** (Recommended)
- Press **ENTER** in the terminal
- Crawler saves cookies and retries the page
- Continues with remaining pages

**Option B: Skip This Page**
- Type `skip` and press ENTER
- Crawler moves to the next district/page
- Useful if CAPTCHA is too difficult

**Option C: Stop Crawler**
- Type `quit` and press ENTER
- Crawler stops immediately
- Statistics are displayed

## Step-by-Step Example

### Complete Workflow

```bash
# 1. Start crawler (headless=False)
$ python -c "
from shanghai_spider import ShanghaiHouseSpider
import asyncio
spider = ShanghaiHouseSpider()
asyncio.run(spider.run(max_pages_per_district=2, headless=False))
"

# Output:
# Starting Shanghai house spider …
# GET https://sh.lianjia.com/ershoufang/huangpu/pg1  (attempt 1)
# ⚠️  Access blocked on https://sh.lianjia.com/ershoufang/huangpu/pg1
#
# 🔒 CAPTCHA DETECTED - Manual Intervention Required
# Action [press ENTER when solved / skip / quit]:

# 2. You solve the CAPTCHA in the browser window

# 3. Press ENTER in terminal
[ENTER]

# Output:
# User confirmed CAPTCHA solved, continuing...
# GET https://sh.lianjia.com/ershoufang/huangpu/pg1  (attempt 2)
# Parsed 30 listings from https://sh.lianjia.com/ershoufang/huangpu/pg1
# ✅ Success! Continues crawling...
```

## Best Practices

### 1. Always Use headless=False

Manual mode requires you to see and interact with the browser:

```python
# ✅ GOOD - You can see the browser
spider.run(headless=False)

# ❌ BAD - Browser is hidden, can't solve CAPTCHA
spider.run(headless=True)
```

### 2. Be Ready to Respond

When running manual mode:
- Keep the terminal visible
- Watch for CAPTCHA notifications
- Respond promptly (some CAPTCHAs have timeouts)

### 3. Save Cookies for Future Runs

The system automatically saves cookies after manual solving:
- Cookies stored in `data/cookies.json`
- May help avoid CAPTCHAs on subsequent runs
- Appears as a "returning visitor"

### 4. Use Conservative Settings

Reduce CAPTCHA frequency:

```python
spider.run(
    max_pages_per_district=2,  # Fewer pages = fewer CAPTCHAs
    headless=False
)
```

Also in config.py or .env:
```bash
MAX_PAGES_PER_DISTRICT=2
```

## Comparison: Manual vs Auto

| Feature | Manual Mode | Auto Mode (2Captcha) |
|---------|-------------|----------------------|
| **Cost** | FREE ✅ | ~$2.99 per 1000 |
| **Speed** | Depends on you | 10-80 seconds |
| **Convenience** | Requires attention | Fully automated |
| **Browser** | Must be visible | Can be headless |
| **Success Rate** | 100% (you solve) | 90-95% |
| **Best For** | Small scrapes, testing | Large scrapes, production |

## Interactive Options

### Option 1: Press ENTER (Continue)

When you press ENTER after solving:
```
User confirmed CAPTCHA solved, continuing...
```
- Cookies are saved
- Page is retried
- Crawling continues normally

### Option 2: Type 'skip' (Skip Page)

When you type `skip`:
```
User chose to skip this page
```
- Current page is abandoned
- Moves to next page/district
- Useful for stubborn CAPTCHAs

### Option 3: Type 'quit' (Stop)

When you type `quit`:
```
User requested to quit. Stopping crawler...
```
- Crawler stops immediately
- Statistics are displayed
- Any collected data is saved

## Statistics Tracking

Manual interventions are tracked:

```python
spider = ShanghaiHouseSpider()
await spider.run(headless=False)

# Check stats
print(f"Manual interventions: {spider.stats['manual_interventions']}")
```

Output example:
```
==================================================
Total crawled : 60
Inserted      : 58
Duplicates    : 2
Failed        : 0
Manual interventions: 3
==================================================
```

## Troubleshooting

### Problem: "Can't see the browser"

**Solution**: Make sure `headless=False`:
```python
spider.run(max_pages_per_district=2, headless=False)
```

### Problem: "CAPTCHA disappeared after I solved it"

**Solution**: Press ENTER quickly after solving. Some CAPTCHAs timeout.

### Problem: "Page still blocked after solving"

**Possible causes**:
- CAPTCHA wasn't fully solved
- CAPTCHA expired
- Solution not properly submitted

**Solutions**:
- Type `skip` to skip this page
- Try again on retry
- Consider using 2Captcha for better reliability

### Problem: "Input not working in terminal"

**Solution**: Make sure terminal window has focus, not the browser.

### Problem: "Crawler stops without asking"

**Possible causes**:
- Running in headless=True mode
- Input redirect (running in background)
- Terminal doesn't support input

**Solutions**:
- Use `headless=False`
- Run in foreground terminal
- Or switch to 2Captcha automatic mode

## Demo Script

Try the interactive demo:

```bash
python demo_manual_captcha.py
```

This demo shows:
- How manual mode works
- Interactive CAPTCHA solving
- Statistics tracking
- Comparison with auto mode

## Code Examples

### Example 1: Simple Manual Mode

```python
import asyncio
from shanghai_spider import ShanghaiHouseSpider

async def simple_manual():
    spider = ShanghaiHouseSpider()  # No API key
    await spider.run(max_pages_per_district=1, headless=False)
    print(f"Manual interventions: {spider.stats['manual_interventions']}")

asyncio.run(simple_manual())
```

### Example 2: With Error Handling

```python
import asyncio
from shanghai_spider import ShanghaiHouseSpider

async def safe_manual():
    spider = ShanghaiHouseSpider()

    try:
        await spider.run(max_pages_per_district=2, headless=False)
    except KeyboardInterrupt:
        print("\nCrawler interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        print(f"Manual interventions: {spider.stats['manual_interventions']}")

asyncio.run(safe_manual())
```

### Example 3: Choosing Mode at Runtime

```python
import asyncio
from shanghai_spider import ShanghaiHouseSpider

async def choose_mode():
    mode = input("Mode [1=manual, 2=auto]: ").strip()

    if mode == '2':
        api_key = input("Enter 2Captcha API key: ").strip()
        spider = ShanghaiHouseSpider(captcha_api_key=api_key)
        await spider.run(max_pages_per_district=3, headless=True)
    else:
        print("Using manual mode (FREE)")
        spider = ShanghaiHouseSpider()
        await spider.run(max_pages_per_district=2, headless=False)

    # Stats work for both modes
    if spider.captcha_solver:
        print(f"Auto-solved: {spider.stats['captchas_solved']}")
    else:
        print(f"Manual: {spider.stats['manual_interventions']}")

asyncio.run(choose_mode())
```

## Tips for Efficiency

### 1. Use Manual Mode for Testing

Before spending money on 2Captcha:
- Test with 1-2 pages manually
- Verify your selectors work
- Check data quality
- Then scale up with 2Captcha

### 2. Combine Both Modes

You can mix approaches:
```python
# Test manually first
test_spider = ShanghaiHouseSpider()
await test_spider.run(max_pages_per_district=1, headless=False)

# If successful, scale with 2Captcha
prod_spider = ShanghaiHouseSpider(captcha_api_key=api_key)
await prod_spider.run(max_pages_per_district=100, headless=True)
```

### 3. Time Your Crawls

Run during low-traffic hours to avoid CAPTCHAs:
- Early morning (2-6 AM)
- Late night (11 PM - 1 AM)
- Fewer users = less anti-bot protection active

### 4. Use Delays Wisely

Longer delays = fewer CAPTCHAs:
```python
from config import CRAWLER_CONFIG

CRAWLER_CONFIG.request_delay_min = 5.0  # Longer delays
CRAWLER_CONFIG.request_delay_max = 12.0

spider = ShanghaiHouseSpider()
await spider.run(headless=False)
```

## Advantages of Manual Mode

✅ **FREE** - No API costs
✅ **100% Success** - You always solve correctly
✅ **Learning** - See what CAPTCHAs look like
✅ **Control** - You decide when to continue/skip
✅ **Testing** - Great for development/testing

## When to Switch to Auto Mode

Consider 2Captcha automatic mode if:
- ❌ You need to scrape 100+ pages
- ❌ Running in production/automated
- ❌ CAPTCHAs appear frequently
- ❌ Need unattended operation
- ❌ Value time over cost (~$0.05-0.30 per run)

## Summary

**Manual Mode** is perfect for:
- Small scraping tasks
- Development and testing
- Learning the system
- Budget-conscious users
- Interactive exploration

**Remember**:
1. Use `headless=False`
2. Watch for CAPTCHA prompts
3. Press ENTER after solving
4. Type 'skip' or 'quit' as needed
5. Cookies are saved automatically

**No API key needed, completely FREE!** 🎉

---

For automatic solving, see [CAPTCHA_GUIDE.md](CAPTCHA_GUIDE.md)
