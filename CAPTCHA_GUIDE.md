# 2Captcha Integration Guide

This guide explains how to use the 2Captcha integration to automatically solve CAPTCHAs during web scraping.

## Overview

The system now includes automatic CAPTCHA solving capabilities using the 2Captcha service. When the crawler encounters a CAPTCHA, it can automatically:
- Detect the CAPTCHA type (ReCaptcha v2/v3, hCaptcha, image captcha)
- Submit it to 2Captcha for solving
- Inject the solution back into the page
- Continue crawling

## Setup

### 1. Get 2Captcha API Key

1. Sign up at [2captcha.com](https://2captcha.com/)
2. Add funds to your account (pricing: ~$2.99 per 1000 CAPTCHAs)
3. Copy your API key from the dashboard

### 2. Configure the System

Edit your `.env` file and add:

```bash
CAPTCHA_ENABLED=true
CAPTCHA_API_KEY=your_2captcha_api_key_here
```

Alternatively, set in code:

```python
from config import CAPTCHA_CONFIG

CAPTCHA_CONFIG.enabled = True
CAPTCHA_CONFIG.api_key = "your_api_key"
CAPTCHA_CONFIG.timeout = 180  # Max wait time in seconds
```

## Usage

### Automatic Mode (Recommended)

When enabled, the spider automatically detects and solves CAPTCHAs:

```python
from shanghai_spider import ShanghaiHouseSpider
import asyncio

spider = ShanghaiHouseSpider(captcha_api_key="your_api_key")
asyncio.run(spider.run(max_pages_per_district=3, headless=True))
```

### Manual Mode

For custom crawling scripts:

```python
from captcha_solver import CaptchaSolver, solve_and_submit
from playwright.async_api import async_playwright

async def main():
    solver = CaptchaSolver(api_key="your_api_key")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("https://example.com")

        # Auto-detect and solve CAPTCHA
        solved = await solve_and_submit(page, solver)

        if solved:
            print("CAPTCHA solved!")
            # Continue with scraping

        await solver.close()
        await browser.close()

asyncio.run(main())
```

### Programmatic Solving

For more control over CAPTCHA solving:

```python
from captcha_solver import CaptchaSolver, detect_captcha_type

solver = CaptchaSolver(api_key="your_api_key")

# Check balance
balance = await solver.get_balance()
print(f"Balance: ${balance:.2f}")

# Detect CAPTCHA type
captcha_info = await detect_captcha_type(page)

if captcha_info["type"] == "recaptcha_v2":
    solution = await solver.solve_recaptcha_v2(
        page_url=page.url,
        sitekey=captcha_info["sitekey"]
    )

    # Inject solution
    await page.evaluate(f"""
        document.getElementById('g-recaptcha-response').innerHTML = '{solution}';
    """)

    # Submit form
    await page.click('button[type="submit"]')

await solver.close()
```

## Supported CAPTCHA Types

### 1. ReCaptcha v2
- **Cost**: ~$2.99 per 1000
- **Solving time**: 10-80 seconds
- **Success rate**: ~95%

```python
solution = await solver.solve_recaptcha_v2(
    page_url="https://example.com/page",
    sitekey="6Le-wvkSAAAAAPBMRTvw0Q4M...",
    invisible=False  # Set True for invisible reCAPTCHA
)
```

### 2. ReCaptcha v3
- **Cost**: ~$2.99 per 1000
- **Solving time**: 10-80 seconds
- **Success rate**: ~90%

```python
solution = await solver.solve_recaptcha_v3(
    page_url="https://example.com/page",
    sitekey="6Le-wvkSAAAAAPBMRTvw0Q4M...",
    action="verify",  # Action name from the site
    min_score=0.3     # Minimum score (0.1-0.9)
)
```

### 3. hCaptcha
- **Cost**: ~$2.99 per 1000
- **Solving time**: 10-80 seconds
- **Success rate**: ~95%

```python
solution = await solver.solve_hcaptcha(
    page_url="https://example.com/page",
    sitekey="a5f74b19-9e45-40e0-b45d-47ff91b7a6c2"
)
```

### 4. Image CAPTCHA
- **Cost**: ~$0.50 per 1000
- **Solving time**: 5-20 seconds
- **Success rate**: ~98%

```python
# Get image as base64
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
```

## Statistics and Monitoring

The spider tracks CAPTCHA solving statistics:

```python
spider = ShanghaiHouseSpider(captcha_api_key="your_api_key")
await spider.run()

# Statistics are logged automatically:
# Captchas solved : 5
# Captcha failures: 1
```

Access stats programmatically:

```python
print(f"Solved: {spider.stats['captchas_solved']}")
print(f"Failed: {spider.stats['captcha_failures']}")
```

## Error Handling

### Balance Check

Always check your balance before large crawls:

```python
solver = CaptchaSolver(api_key="your_api_key")
balance = await solver.get_balance()

if balance < 5.0:
    print(f"Warning: Low balance ${balance:.2f}")
    # Add funds at 2captcha.com
```

### Failed Solutions

Report incorrect solutions to get a refund:

```python
solution = await solver.solve_recaptcha_v2(page_url, sitekey)

if solution:
    # Try to use solution
    success = await try_submit_with_solution(page, solution)

    if not success:
        # Report bad solution (may get refund)
        await solver.report_bad(captcha_id)
```

### Timeout Handling

Adjust timeout for slow networks:

```python
solver = CaptchaSolver(
    api_key="your_api_key",
    timeout=300  # 5 minutes
)
```

## Best Practices

### 1. Cost Optimization

- **Use CAPTCHA only when needed**: Don't enable for every crawl
- **Start with low page counts**: Test before scaling up
- **Monitor balance**: Set up alerts when balance is low

```python
# Check if CAPTCHA is actually present
captcha_info = await detect_captcha_type(page)
if captcha_info:
    # Only create solver if needed
    solver = CaptchaSolver(api_key=api_key)
    await solve_and_submit(page, solver)
    await solver.close()
```

### 2. Rate Limiting

Combine with delays to avoid triggering more CAPTCHAs:

```python
spider = ShanghaiHouseSpider(captcha_api_key=api_key)

# Use conservative settings
await spider.run(
    max_pages_per_district=2,  # Fewer pages
    headless=True
)
```

### 3. Fallback Strategy

Implement fallback for when 2Captcha fails:

```python
async def crawl_with_fallback(page, solver):
    if await _is_blocked(page):
        # Try 2Captcha first
        if solver:
            solved = await solve_and_submit(page, solver)
            if solved:
                return True

        # Fallback: manual solving or skip
        logger.warning("CAPTCHA not solved, skipping page")
        return False
```

## Configuration Options

All configuration is in `config.py`:

```python
@dataclass
class CaptchaConfig:
    enabled: bool = False           # Enable/disable CAPTCHA solving
    api_key: str = ""              # Your 2Captcha API key
    timeout: int = 180             # Max wait time (seconds)
    auto_report_bad: bool = True   # Auto-report failed solutions
    max_attempts: int = 3          # Max solving attempts per CAPTCHA
```

## Troubleshooting

### Problem: "No API key provided"
**Solution**: Set `CAPTCHA_API_KEY` in `.env` or pass to constructor

### Problem: "Balance too low"
**Solution**: Add funds at [2captcha.com](https://2captcha.com/)

### Problem: "Captcha solving timeout"
**Solution**: Increase `CAPTCHA_CONFIG.timeout` or check 2captcha.com status

### Problem: "Failed to detect CAPTCHA"
**Solution**: The auto-detection may not work for all CAPTCHA types. Manually specify:

```python
solution = await solver.solve_recaptcha_v2(
    page_url=page.url,
    sitekey="manually_extracted_sitekey"
)
```

### Problem: "Solution not accepted by site"
**Solution**: Report as bad and try again:

```python
await solver.report_bad(captcha_id)
```

## Cost Estimation

Example costs for typical usage:

| Scenario | Pages | CAPTCHAs | Cost |
|----------|-------|----------|------|
| Small test | 10 | 2-3 | $0.01 |
| Daily crawl | 100 | 10-20 | $0.05 |
| Full scrape | 1000 | 50-100 | $0.30 |

**Note**: Most pages won't trigger CAPTCHAs if you use proper delays and stealth techniques.

## API Reference

See [2Captcha API Documentation](https://2captcha.com/2captcha-api) for full details.

### Key Methods

- `solve_recaptcha_v2(page_url, sitekey, invisible=False)` - Solve ReCaptcha v2
- `solve_recaptcha_v3(page_url, sitekey, action, min_score)` - Solve ReCaptcha v3
- `solve_hcaptcha(page_url, sitekey)` - Solve hCaptcha
- `solve_image_captcha(image_base64)` - Solve image CAPTCHA
- `get_balance()` - Check account balance
- `report_bad(captcha_id)` - Report incorrect solution

### Helper Functions

- `detect_captcha_type(page)` - Auto-detect CAPTCHA on page
- `solve_and_submit(page, solver)` - One-step detection + solving + submission

## Support

- **2Captcha Support**: [https://2captcha.com/support](https://2captcha.com/support)
- **API Status**: [https://2captcha.com/status](https://2captcha.com/status)
- **Project Issues**: Create an issue in the GitHub repository
