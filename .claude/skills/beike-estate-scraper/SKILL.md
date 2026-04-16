---
name: beike-estate-scraper
description: Scrape house listing data from ke.com (beike) using playwright-cli with anti-bot CAPTCHA handling. Supports Shanghai and other cities, extracts structured listing data, and exports to Excel. Use when the user wants to scrape real estate data from ke.com/beike, crawl house listings, or export property information.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(python*) Bash(pip:*) Bash(source:*)
---

# Beike (ke.com) Estate Scraper

Scrape second-hand house listings from ke.com (beike/Shell) using `playwright-cli` in headed + persistent mode, with human-in-the-loop CAPTCHA solving and structured Excel export.

## When to Activate

- User wants to scrape / crawl house listings from ke.com or beike
- User asks to get real estate data from Shanghai (or any Chinese city) on beike
- User wants to export property listings to Excel / spreadsheet
- User mentions keywords: beike, ke.com, ershoufang, house listings, real estate scrape

## Prerequisites

- `playwright-cli` installed globally (`npm install -g @playwright/cli@latest`) or available via `npx`
- Python 3 with `openpyxl` (`pip install openpyxl`)

---

## Workflow

### Step 1: Clean Start

Always start with a clean browser session to avoid stale cookies or Forbidden states:

```bash
playwright-cli close 2>&1
playwright-cli close-all 2>&1
playwright-cli kill-all 2>&1
playwright-cli delete-data 2>&1
```

Wait 2-3 seconds between cleanup and opening a new browser to avoid IP rate-limiting.

### Step 2: Open Browser

Open with `--headed --persistent --browser=chrome` for best anti-bot compatibility:

```bash
sleep 3 && playwright-cli open --headed --persistent --browser=chrome <TARGET_URL>
```

**URL patterns by city:**

| City | URL |
|------|-----|
| Shanghai | `https://sh.ke.com/ershoufang/` |
| Beijing | `https://bj.ke.com/ershoufang/` |
| Shenzhen | `https://sz.ke.com/ershoufang/` |
| Guangzhou | `https://gz.ke.com/ershoufang/` |
| Hangzhou | `https://hz.ke.com/ershoufang/` |
| Chengdu | `https://cd.ke.com/ershoufang/` |
| Nanjing | `https://nj.ke.com/ershoufang/` |

**District-level URL:**
```
https://sh.ke.com/ershoufang/{district_pinyin}/
```
Example districts: `pudong`, `minhang`, `xuhui`, `changning`, `jingan`, `huangpu`, `hongkou`, `yangpu`, `putuo`, `baoshan`, `songjiang`, `jiading`, `qingpu`, `fengxian`, `chongming`.

**Filters can be appended:**
- Room count: `l1/` (1-room), `l2/` (2-room), `l3/` (3-room)
- Price range: `p1/` to `p7/`
- Pagination: `pg2`, `pg3`, etc.

### Step 3: Handle Anti-Bot / CAPTCHA

After navigation, check the page URL and title:

```bash
playwright-cli snapshot
```

**If CAPTCHA detected** (URL contains `hip.ke.com/captcha` or page title is "CAPTCHA"):

1. **DO NOT attempt to solve the CAPTCHA programmatically** -- ke.com uses a Chinese character order-selection CAPTCHA that is extremely difficult to automate reliably.

2. **Prompt the user to solve it manually** in the headed browser window:
   - Use `AskUserQuestion` / `question` tool to pause execution
   - Instruct user: click "Click to verify" -> click characters in the displayed order -> click OK
   - Wait for user confirmation before continuing

3. **After user confirms**, verify the page landed on the listing page:
   ```bash
   playwright-cli snapshot --depth=3
   ```
   Check that URL matches `*.ke.com/ershoufang/` and page title contains "二手房".

**If "Captcha Forbidden" appears:**
- The IP has been temporarily rate-limited from too many failed CAPTCHA attempts.
- Close browser, delete data, wait 30-60 seconds, and retry with a fresh session.
- If persistent, suggest the user try again later or use a different network.

**If page loads directly** (no CAPTCHA):
- Proceed to Step 4 immediately.

### Step 4: Extract Listing Data

ke.com displays ~30 listings per page. Use JavaScript evaluation to extract structured data:

```bash
playwright-cli --raw eval "JSON.stringify([...document.querySelectorAll('.sellListContent li.clear')].slice(0, COUNT).map((el, i) => {
  const title = el.querySelector('.title a')?.textContent?.trim() || '';
  const houseInfo = el.querySelector('.houseInfo')?.textContent?.trim() || '';
  const positionInfo = el.querySelector('.positionInfo')?.textContent?.trim() || '';
  const totalPrice = el.querySelector('.totalPrice span')?.textContent?.trim() || '';
  const unitPrice = el.querySelector('.unitPrice span')?.textContent?.trim() || '';
  const followInfo = el.querySelector('.followInfo')?.textContent?.trim() || '';
  const tag = [...(el.querySelectorAll('.tag span') || [])].map(s => s.textContent.trim()).join(',');
  const url = el.querySelector('.title a')?.href || '';
  return { index: i + 1, title, houseInfo, positionInfo, totalPrice, unitPrice, followInfo, tag, url };
}))"
```

Replace `COUNT` with the desired number of listings (e.g., 20, 30).

**Key CSS selectors on ke.com listing pages:**

| Selector | Content |
|----------|---------|
| `.sellListContent li.clear` | Each listing item |
| `.title a` | Listing title + detail URL |
| `.houseInfo` | Floor, year, room layout, area, orientation (pipe-separated) |
| `.positionInfo` | Community / neighborhood name |
| `.totalPrice span` | Total price in wan (万元) |
| `.unitPrice span` | Unit price (元/平) |
| `.followInfo` | Follower count + publish time |
| `.tag span` | Tags (e.g., 近地铁, 满五年, VR看装修) |

### Step 5: Multi-Page Scraping (if needed)

If the user wants more than 30 listings, paginate:

```bash
playwright-cli goto https://sh.ke.com/ershoufang/pg2
# Wait for page load
sleep 2
playwright-cli snapshot --depth=2
# Extract again with the same JS
```

After each page navigation, **check for CAPTCHA again** -- ke.com may trigger it after several pages. If detected, pause for user.

Recommended: add a 2-3 second delay between page navigations to reduce CAPTCHA risk.

### Step 6: Parse and Structure Data

The `houseInfo` field from ke.com is a raw string with whitespace and pipe separators. Parse it with regex:

```python
import re

def parse_house_info(info_str):
    clean = re.sub(r'\s+', ' ', info_str).strip()
    
    floor_match = re.search(r'(低楼层|中楼层|高楼层)\s*\(共(\d+)层\)', clean)
    floor = floor_match.group(1) if floor_match else ''
    total_floors = floor_match.group(2) if floor_match else ''
    
    year_match = re.search(r'(\d{4})年', clean)
    year = year_match.group(1) if year_match else ''
    
    room_match = re.search(r'(\d+室\d+厅)', clean)
    room_layout = room_match.group(1) if room_match else ''
    
    area_match = re.search(r'([\d.]+)平米', clean)
    area = area_match.group(1) if area_match else ''
    
    parts = clean.split('|')
    orientation = parts[-1].strip() if len(parts) > 1 else ''
    
    return floor, total_floors, year, room_layout, area, orientation

def parse_follow_info(info_str):
    clean = re.sub(r'\s+', ' ', info_str).strip()
    follow_match = re.search(r'(\d+)人关注', clean)
    followers = follow_match.group(1) if follow_match else ''
    pub_match = re.search(r'/\s*(.+发布)', clean)
    pub_time = pub_match.group(1).strip() if pub_match else ''
    return followers, pub_time
```

### Step 7: Export to Excel

Use `openpyxl` to create a formatted Excel file:

```python
import json
import re
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

# raw = json.loads(<data from Step 4>)

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "二手房源"

# Header style
header_font = Font(name='Arial', bold=True, size=11, color='FFFFFF')
header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

headers = [
    '序号', '标题', '小区名称', '楼层', '总层数', '建造年份',
    '户型', '面积(㎡)', '朝向', '总价(万)', '单价(元/㎡)',
    '关注人数', '发布时间', '标签', '链接'
]

for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = header_alignment
    cell.border = thin_border

# Data rows
data_font = Font(name='Arial', size=10)
data_alignment = Alignment(vertical='center', wrap_text=True)

for item in raw:
    row = item['index'] + 1
    floor, total_floors, year, room_layout, area, orientation = parse_house_info(item['houseInfo'])
    followers, pub_time = parse_follow_info(item['followInfo'])
    unit_price = item['unitPrice'].replace('元/平', '').strip()

    values = [
        item['index'], item['title'], item['positionInfo'],
        floor, total_floors, year, room_layout,
        float(area) if area else '',
        orientation,
        float(item['totalPrice']) if item['totalPrice'] else '',
        unit_price,
        int(followers) if followers else '',
        pub_time, item['tag'], item['url']
    ]

    for col, val in enumerate(values, 1):
        cell = ws.cell(row=row, column=col, value=val)
        cell.font = data_font
        cell.alignment = data_alignment
        cell.border = thin_border

# Column widths
col_widths = [6, 45, 20, 8, 8, 10, 8, 10, 8, 10, 14, 10, 12, 30, 50]
for i, width in enumerate(col_widths, 1):
    ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = width

ws.freeze_panes = 'A2'
ws.auto_filter.ref = f"A1:O{len(raw) + 1}"

wb.save('output.xlsx')
```

### Step 8: Cleanup

Close the browser after scraping is complete:

```bash
playwright-cli close
```

---

## Complete Single-Script Reference

For convenience, here is a complete Python script that takes the raw JSON extracted from Step 4 and produces the Excel file. Save the JSON output from `playwright-cli --raw eval` to a variable, then run:

```python
#!/usr/bin/env python3
"""Parse ke.com listing JSON and export to Excel."""
import json, re, sys
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

def parse_house_info(info_str):
    clean = re.sub(r'\s+', ' ', info_str).strip()
    floor_m = re.search(r'(低楼层|中楼层|高楼层)\s*\(共(\d+)层\)', clean)
    year_m = re.search(r'(\d{4})年', clean)
    room_m = re.search(r'(\d+室\d+厅)', clean)
    area_m = re.search(r'([\d.]+)平米', clean)
    parts = clean.split('|')
    return (
        floor_m.group(1) if floor_m else '',
        floor_m.group(2) if floor_m else '',
        year_m.group(1) if year_m else '',
        room_m.group(1) if room_m else '',
        area_m.group(1) if area_m else '',
        parts[-1].strip() if len(parts) > 1 else ''
    )

def parse_follow_info(info_str):
    clean = re.sub(r'\s+', ' ', info_str).strip()
    f = re.search(r'(\d+)人关注', clean)
    p = re.search(r'/\s*(.+发布)', clean)
    return (f.group(1) if f else '', p.group(1).strip() if p else '')

def export_to_excel(raw_data, output_path, sheet_title="二手房源"):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_title
    hf = Font(name='Arial', bold=True, size=11, color='FFFFFF')
    hfill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
    ha = Alignment(horizontal='center', vertical='center', wrap_text=True)
    brd = Border(*(Side(style='thin'),) * 4)
    headers = ['序号','标题','小区名称','楼层','总层数','建造年份',
               '户型','面积(㎡)','朝向','总价(万)','单价(元/㎡)',
               '关注人数','发布时间','标签','链接']
    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.font, cell.fill, cell.alignment, cell.border = hf, hfill, ha, brd
    df = Font(name='Arial', size=10)
    da = Alignment(vertical='center', wrap_text=True)
    for item in raw_data:
        r = item['index'] + 1
        fl, tf, yr, rm, ar, ori = parse_house_info(item['houseInfo'])
        fol, pt = parse_follow_info(item['followInfo'])
        up = item['unitPrice'].replace('元/平','').strip()
        vals = [item['index'], item['title'], item['positionInfo'],
                fl, tf, yr, rm, float(ar) if ar else '', ori,
                float(item['totalPrice']) if item['totalPrice'] else '',
                up, int(fol) if fol else '', pt, item['tag'], item['url']]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font, cell.alignment, cell.border = df, da, brd
    widths = [6,45,20,8,8,10,8,10,8,10,14,10,12,30,50]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = f"A1:O{len(raw_data)+1}"
    wb.save(output_path)
    return output_path
```

---

## Anti-Bot Best Practices

1. **Always use `--browser=chrome`** -- Chromium default has detectable automation flags; Chrome channel is more human-like.
2. **Always use `--persistent`** -- Persistent profile retains cookies across navigations, reducing CAPTCHA triggers.
3. **Always use `--headed`** -- Headless mode is more easily detected by ke.com's anti-bot system.
4. **Clean session on first run** -- `delete-data` before opening avoids stale Forbidden states.
5. **Limit page count** -- Scraping too many pages in one session increases CAPTCHA probability. For large scrapes, space them across sessions.
6. **Add delays between pages** -- 2-3 seconds minimum between navigations.
7. **Never retry CAPTCHA programmatically** -- Each failed attempt increases the chance of "Captcha Forbidden". Let the human user solve it.
8. **If Forbidden, wait and retry** -- Close browser, delete data, wait 30-60s, open fresh session.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Captcha Forbidden" on load | IP rate-limited. Delete data, wait 60s, retry with fresh session. |
| CAPTCHA appears on every page | Reduce scraping speed, add longer delays. Consider using a VPN. |
| Empty listing data | Selectors may have changed. Take a `snapshot` and inspect the DOM structure. |
| `playwright-cli` not found | `npm install -g @playwright/cli@latest` |
| `openpyxl` not found | `pip install openpyxl` |
| Page loads but no `.sellListContent` | May be a different page layout (new listings, rental). Check URL and snapshot. |
| Chinese garbled in Excel | Ensure the Python script uses UTF-8. openpyxl handles this by default. |

---

## Example Usage

**User:** "Scrape the top 20 Shanghai second-hand house listings and save to Excel"

**Agent workflow:**
1. Clean start -> open browser to `https://sh.ke.com/ershoufang/`
2. If CAPTCHA -> ask user to solve manually -> confirm page loaded
3. Extract 20 listings with JS eval
4. Parse and export to `上海二手房源.xlsx`
5. Close browser
6. Report results to user

**User:** "Get 50 listings from Pudong district"

**Agent workflow:**
1. Clean start -> open browser to `https://sh.ke.com/ershoufang/pudong/`
2. Handle CAPTCHA if needed
3. Extract 30 listings from page 1
4. Navigate to page 2 (`pg2`), check for CAPTCHA
5. Extract remaining 20 from page 2
6. Combine and export to Excel
7. Close browser
