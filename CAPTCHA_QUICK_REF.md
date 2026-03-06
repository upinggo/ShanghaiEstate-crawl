# CAPTCHA Handling - Quick Reference

## Two Modes Available

### 🆓 Mode 1: Manual Mode (FREE)
**No API key required** - Handle CAPTCHAs yourself

```python
from shanghai_spider import ShanghaiHouseSpider
import asyncio

# No captcha_api_key = Manual Mode
spider = ShanghaiHouseSpider()
asyncio.run(spider.run(max_pages_per_district=2, headless=False))
```

**What happens:**
1. Browser stays open when CAPTCHA appears
2. Script shows: "🔒 CAPTCHA DETECTED - Manual Intervention Required"
3. You solve the CAPTCHA in the browser
4. Press ENTER to continue
5. Or type `skip` to skip page, `quit` to stop

**Best for:**
- Small scraping tasks (< 50 pages)
- Development and testing
- Learning and experimentation
- Zero budget projects

**Documentation:** `MANUAL_CAPTCHA_GUIDE.md`

---

### 💰 Mode 2: Automatic Mode ($2.99/1000)
**Requires 2Captcha API key** - Fully automated

```bash
# 1. Get API key from https://2captcha.com/
# 2. Configure in .env
echo "CAPTCHA_ENABLED=true" >> .env
echo "CAPTCHA_API_KEY=your_api_key_here" >> .env
```

```python
from shanghai_spider import ShanghaiHouseSpider
import asyncio

# With captcha_api_key = Auto Mode
spider = ShanghaiHouseSpider(captcha_api_key="your_key")
asyncio.run(spider.run(max_pages_per_district=50, headless=True))
```

**What happens:**
1. CAPTCHA detected automatically
2. Sent to 2Captcha API for solving
3. Solution injected back into page
4. Crawling continues (10-80 seconds delay)

**Best for:**
- Large scraping tasks (100+ pages)
- Production environments
- Unattended/scheduled runs
- Time-sensitive projects

**Documentation:** `CAPTCHA_GUIDE.md`

---

## Quick Comparison

| Feature | Manual Mode | Auto Mode |
|---------|-------------|-----------|
| **Cost** | FREE 🎉 | ~$0.05 per run |
| **Setup** | None | Get API key |
| **Browser** | Must be visible | Can be headless |
| **Attention** | Required | None |
| **Speed** | Depends on you | 10-80 seconds |
| **Success** | 100% | 90-95% |

---

## Quick Commands

### Test Manual Mode
```bash
python demo_manual_captcha.py
```

### Test Auto Mode
```bash
python example_captcha.py
```

### Run Crawler (Auto-detect mode)
```bash
python shanghai_spider.py
```

---

## Statistics Tracking

Both modes track interventions:

```python
spider = ShanghaiHouseSpider(captcha_api_key=api_key_or_none)
await spider.run()

# Check stats
print(f"Manual: {spider.stats['manual_interventions']}")
print(f"Auto-solved: {spider.stats['captchas_solved']}")
print(f"Failures: {spider.stats['captcha_failures']}")
```

---

## Troubleshooting

### Manual Mode Issues

**Can't see browser?**
→ Use `headless=False`

**CAPTCHA disappeared?**
→ Press ENTER faster

**Input not working?**
→ Focus terminal window

### Auto Mode Issues

**"No API key"?**
→ Set in `.env` file

**"Balance too low"?**
→ Add funds at 2captcha.com

**"Timeout"?**
→ Increase `CAPTCHA_CONFIG.timeout`

---

## Cost Estimates (Auto Mode)

| Scenario | Pages | CAPTCHAs | Cost |
|----------|-------|----------|------|
| Small test | 10 | 2-3 | $0.01 |
| Daily run | 100 | 10-20 | $0.05 |
| Full scrape | 1000 | 50-100 | $0.30 |

**Note:** Most pages won't trigger CAPTCHAs with proper delays!

---

## Choosing the Right Mode

**Use Manual Mode if:**
- ✅ Budget is $0
- ✅ Scraping < 50 pages
- ✅ You're available to help
- ✅ Testing/development phase

**Use Auto Mode if:**
- ✅ Budget is $5-10
- ✅ Scraping 100+ pages
- ✅ Need unattended operation
- ✅ Production/scheduled runs

---

## Getting Help

- **Manual Mode Guide:** `MANUAL_CAPTCHA_GUIDE.md`
- **Auto Mode Guide:** `CAPTCHA_GUIDE.md`
- **Implementation Details:** `CAPTCHA_IMPLEMENTATION.md`
- **Main Documentation:** `CLAUDE.md`

---

**Both modes work great! Pick what fits your needs.** 🚀
