# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shanghai Estate Crawler is a sophisticated web scraping system for monitoring real estate prices in Shanghai. It uses Playwright with advanced anti-bot bypass techniques to scrape data from Lianjia.com, stores it in SQLite, and provides analytics and visualization capabilities.

## Development Commands

### Environment Setup
```bash
# Initial installation (creates venv, installs dependencies, downloads Playwright browser)
./install.sh

# Activate virtual environment
source venv/bin/activate

# Install Playwright browser manually if needed
playwright install chromium
```

### Running the System
```bash
# Interactive menu for all operations
./run.sh

# Direct execution modes
python shanghai_spider.py                    # Run crawler in test mode
python analyzer.py                           # Generate analysis report
python scheduler.py                          # Start scheduler (production)
python scheduler.py --manual                 # Manual execution mode
python scheduler.py --test                   # Test mode

# Programmatic usage
python -c "
from shanghai_spider import ShanghaiHouseSpider
import asyncio
spider = ShanghaiHouseSpider()
asyncio.run(spider.run(max_pages_per_district=2, headless=False))
"
```

### Testing
```bash
# Run all tests
python test_system.py

# Individual test classes
python -m unittest test_system.TestShanghaiHouseSpider
python -m unittest test_system.TestHouseDataAnalyzer
```

### Code Quality
```bash
# Format code
black *.py

# Lint code
flake8 *.py
```

## Architecture

### Core Components

**shanghai_spider.py** - Main crawler with 10+ anti-bot bypass techniques:
- Uses Playwright with playwright-stealth for browser automation
- Implements human-like behavior (mouse movement, scrolling, Gaussian-jittered delays)
- Cookie persistence and context rotation every 12 pages
- Resource blocking for images/media/fonts to reduce fingerprint
- User-Agent rotation, randomized viewports (1280-1920 x 768-1080)
- Exponential backoff retry on failures
- Extra JavaScript injection to patch automation leaks

**analyzer.py** - Data analysis engine:
- Loads data from SQLite with configurable time ranges
- Data cleaning (removes outliers: unit_price 10k-200k yuan/sqm)
- Multiple analysis methods: price trends, district comparison, anomaly detection
- Visualization using matplotlib/seaborn with Chinese font support

**scheduler.py** - Task orchestrator using APScheduler:
- CronTrigger-based scheduling for crawl and analysis jobs
- Default crawl time: 2:00 AM daily
- Default analysis time: 3:00 AM daily
- Health check monitoring every 60 minutes

**config.py** - Configuration management:
- Dataclass-based configuration with environment variable support
- Separate configs for database, crawler, analysis, scheduler, proxy, notifications
- Global `config` instance accessible throughout the codebase

### Database Schema

SQLite database with two main tables:

**house_listings**:
- `community_id, community_name, district, title`
- `total_price, unit_price, area, floor_info`
- `room_info, orientation, decoration, tags`
- `source_url, crawl_date, created_at`
- Unique constraint on (community_id, district, crawl_date)

**crawl_stats**:
- `district, crawl_date, avg_price, total_listings`

### Data Flow

1. **Crawler** (`shanghai_spider.py`):
   - For each district in `TARGET_DISTRICTS`, builds URL like `https://sh.lianjia.com/ershoufang/{district}/`
   - Warm-up visit to home page establishes session cookies and referer chain
   - Scrapes listing pages (default 3 pages per district)
   - Extracts house data using multiple CSS selector fallbacks
   - Saves to SQLite with duplicate detection based on (community_id, district, crawl_date)
   - Rotates browser context every `CONTEXT_ROTATION_INTERVAL` pages

2. **Analyzer** (`analyzer.py`):
   - Queries database with JOIN between house_listings and crawl_stats
   - Applies data cleaning filters (price bounds, null checks)
   - Generates reports with statistics by district and time period
   - Creates visualizations (PNG files) for trends and distributions

3. **Scheduler** (`scheduler.py`):
   - Runs crawler at scheduled time (default 2 AM)
   - Runs analyzer after crawl completes (default 3 AM)
   - Performs periodic health checks

### Anti-Detection Strategy

The spider employs comprehensive stealth measures documented in shanghai_spider.py:1-16:
- playwright-stealth Stealth class hides WebDriver, WebGL fingerprints, plugins
- Realistic Chrome User-Agent rotation from `USER_AGENTS` list
- Human-like mouse movement with `_move_mouse()` helper
- Gaussian-jittered delays via `_delay()` function
- Cookie persistence across runs stored in `data/cookies.json`
- Resource blocking for analytics domains and heavy media
- Context rotation to prevent session detection
- Extra JS script (`_INIT_SCRIPT`) patches navigator.webdriver and other leaks

### Configuration System

Configuration is hierarchical with environment variable overrides:

1. **Default values** in config.py dataclasses
2. **Environment variables** loaded via `Config._load_from_env()`
3. **.env file** (created by install.sh, gitignored)

Key config objects exported: `DATABASE_CONFIG`, `CRAWLER_CONFIG`, `ANALYSIS_CONFIG`, `SCHEDULER_CONFIG`, `PROXY_CONFIG`, `NOTIFICATION_CONFIG`

## Important Implementation Notes

### When Modifying the Crawler

- **Never skip anti-bot measures**: All delays, mouse movements, and stealth configs are critical
- **Test without headless first**: Use `headless=False` to verify page rendering and selectors
- **Check for CAPTCHA detection**: The `_is_blocked()` function monitors for verification pages
- **Preserve context rotation**: The CONTEXT_ROTATION_INTERVAL prevents long session detection
- **Update selectors carefully**: Multiple fallback selectors exist for resilience; maintain this pattern

### Database Operations

- Database path is configured via `DATABASE_CONFIG.full_path` (default: `./data/shanghai_houses.db`)
- Always use context managers or ensure connections are closed
- Duplicate detection relies on (community_id, district, crawl_date) unique constraint
- The `generate_community_id()` method creates stable IDs from community name + title hash

### Data Quality

- Unit price bounds: 10,000 - 200,000 yuan/sqm (enforced in analyzer.py:74-76)
- Total price minimum: 50 yuan (likely 50万 or 500k yuan)
- Area minimum: 10 sqm
- Null values in key fields are filtered during analysis

### Async/Await Pattern

- The crawler is fully async using Playwright's async API
- Main entry point: `asyncio.run(spider.run())`
- Helper functions like `_delay()`, `_move_mouse()`, `_scroll()` are all async
- When adding new functionality, maintain async consistency

### Chinese Font Configuration

matplotlib requires Chinese font support (analyzer.py:14):
```python
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
```

If charts show garbled Chinese characters, install appropriate fonts for your OS.

## Project File Structure

```
shanghai_spider.py      # Crawler with anti-bot logic (500+ lines)
analyzer.py            # Analysis and visualization
scheduler.py           # APScheduler-based automation
config.py              # Configuration dataclasses
test_system.py         # Unit and integration tests
install.sh             # Setup script
run.sh                 # Interactive launcher
requirements.txt       # Python dependencies
.env                   # Environment config (gitignored)
data/                  # SQLite DB and cookies (gitignored)
logs/                  # Log files (gitignored)
legacyCode/            # Historical data and old implementation
```

## Extending the System

### Adding a New Target District

Edit `TARGET_DISTRICTS` in shanghai_spider.py:43 or override via `CRAWLER_CONFIG.target_districts`.

### Implementing Proxy Support

1. Set `PROXY_CONFIG.enabled = True` in config or via environment
2. Modify `_new_context()` to accept proxy parameter
3. Pass proxy dict to `browser.new_context(proxy={...})`

### Adding New Analysis Metrics

Subclass `HouseDataAnalyzer` and implement new methods:
```python
class CustomAnalyzer(HouseDataAnalyzer):
    def analyze_price_per_room(self, df):
        # Custom analysis logic
        pass
```

### Integrating Notifications

The `NotificationConfig` dataclass is defined but not yet implemented. To add:
1. Implement email/webhook sending in a new module
2. Call from scheduler.py after crawl/analysis jobs complete
3. Use `NOTIFICATION_CONFIG` settings

## Common Issues

### Playwright Browser Not Found
Run `playwright install chromium` in the activated virtual environment.

### CAPTCHA/Verification Pages
If `_is_blocked()` returns True frequently:
- Increase delays via `CRAWLER_CONFIG.request_delay_min/max`
- Reduce `max_pages_per_district`
- Enable proxy rotation when implemented
- Check if IP is rate-limited

### Database Locked Errors
SQLite can't handle high concurrency. Ensure only one crawler/analyzer runs at a time, or switch to PostgreSQL.

### Empty Analysis Results
Check if database has recent data with `spider.get_latest_data(limit=5)`. The analyzer's `days_back` parameter might be too restrictive.

## Operational Notes

- Default crawl pages per district: 3 (configurable via `MAX_PAGES_PER_DISTRICT`)
- Typical run time: 5-15 minutes depending on network and page count
- Database size grows ~1-2 MB per day with default settings
- Log files accumulate in spider.log and scheduler.log
- All generated PNG files are gitignored
