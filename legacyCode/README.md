# 🏢 Shanghai Real Estate Data & Trend Analyzer

A comprehensive Node.js tool for crawling, analyzing, and tracking Shanghai real estate market trends from Lianjia.com with advanced anti-bot protection bypass capabilities.

## 🛡️ Advanced Anti-Bot Protection Bypass

This system includes sophisticated anti-bot detection and bypass mechanisms to handle modern web scraping challenges:

### Key Features

- **Automatic Detection**: Intelligently detects website accessibility and anti-bot measures
- **Multi-Mode Operation**: Switches between real crawling, hybrid approach, and simulation fallback
- **Advanced Browser Simulation**: Mimics real browser behavior with rotating headers and session management
- **Graceful Degradation**: Falls back to simulated data when real crawling is blocked
- **Performance Monitoring**: Tracks success rates and adapts crawling strategies

### How It Works

1. **Detection Phase**: Tests website accessibility across multiple districts
2. **Mode Selection**: Automatically chooses optimal crawling strategy
3. **Adaptive Crawling**: Adjusts behavior based on website responses
4. **Fallback Management**: Seamlessly switches to simulation when needed

### Usage Examples

```bash
# Automatic mode with anti-bot bypass (recommended)
npm start

# Check current website status
npm run status

# Test anti-bot bypass system
npm run test:antibot

# Run anti-bot bypass demo
npm run example:antibot

# Force advanced mode with maximum bypass
npm run crawl:advanced
```

### Anti-Bot Bypass Techniques

- **Header Rotation**: Randomizes User-Agent and browser fingerprints
- **Session Establishment**: Builds legitimate browsing sessions
- **Timing Optimization**: Implements human-like request intervals
- **Referer Management**: Maintains proper navigation context
- **Error Recovery**: Handles timeouts and rate limiting gracefully
- **Content Validation**: Detects CAPTCHA and blocked content

### Detection Modes

- **REAL MODE**: Full website access with real data collection
- **HYBRID MODE**: Mix of real crawling and simulated data for blocked districts
- **SIMULATION MODE**: Complete fallback to realistic sample data generation

## 🌟 Core Features

- **Multi-District Crawling**: Collect data from all major Shanghai districts
- **Trend Analysis**: Track price movements and market trends over time
- **Hot Spot Detection**: Identify emerging and cooling market areas
- **Data Export**: Export in JSON, CSV, and Excel formats
- **Automated Reporting**: Generate comprehensive market analysis reports
- **Configurable**: Flexible crawling parameters and scheduling options

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/yourusername/shanghai-real-estate-analyzer.git
cd shanghai-real-estate-analyzer
npm install
npm run setup
```

### Basic Usage

```bash
# Start with automatic anti-bot detection
npm start

# Crawl specific districts
npm run crawl:xuhui
npm run crawl:core

# Analyze existing data
npm run analyze
```

## 📊 Available Commands

### Crawling Options

```bash
# Crawl all districts (default)
npm run crawl

# Crawl specific districts
npm run crawl:xuhui          # Xuhui district only
npm run crawl:pudong         # Pudong district only
npm run crawl:core           # Core downtown districts

# Custom crawling
node src/main.js --mode crawl --districts xuhui,pudong,minhang --pages 5 --delay 2000
```

### Analysis Options

```bash
# Generate trend analysis
npm run analyze:trends

# Export data in different formats
npm run export:csv
npm run export:excel
```

### Scheduled Tasks

```bash
# Daily light scan (recommended for regular monitoring)
npm run schedule:daily
```

## 🛠️ Configuration

The system uses `config.js` for main configuration and supports command-line overrides:

```javascript
// config.js key settings
{
  crawling: {
    requestDelay: 1500,  // ms between requests
    maxPages: 5,         // pages per district
    userAgent: '...'     // browser identification
  },
  analysis: {
    hotSpotThreshold: 5,   // % change for hot spots
    coolingThreshold: -5   // % change for cooling markets
  }
}
```

### Command Line Arguments

```bash
node src/main.js --mode [crawl|analyze|both] \
                 --districts [district1,district2,...] \
                 --pages [number] \
                 --delay [milliseconds] \
                 --export [json|csv|excel]
```

### District Codes

Available Shanghai districts:
- `xuhui` - 徐汇区
- `huangpu` - 黄浦区  
- `jingan` - 静安区
- `changning` - 长宁区
- `putuo` - 普陀区
- `hongkou` - 虹口区
- `yangpu` - 杨浦区
- `minhang` - 闵行区
- `baoshan` - 宝山区
- `jiading` - 嘉定区
- `pudong` - 浦东新区
- `jinshan` - 金山区
- `songjiang` - 松江区
- `qingpu` - 青浦区
- `fengxian` - 奉贤区
- `chongming` - 崇明区

## 📁 Project Structure

```
src/
├── main.js              # Entry point with auto-detection
├── autoDetectCrawler.js # Automatic mode detection
├── advancedBrowserCrawler.js # Enhanced anti-bot crawler
├── browserCrawler.js    # Standard browser crawler
├── simulationCrawler.js # Fallback data generator
├── trendAnalyzer.js     # Market analysis engine
└── logger.js           # Logging utilities
```

## 📈 Output Formats

### Data Files
- `shanghai_*_crawl_*.json` - Main crawl data
- `houses_*_*.json` - District-specific data
- `*_summary_*.json` - Statistical summaries
- `comprehensive_analysis_*.json` - Full market analysis

### Collected Data Fields

Each house record includes:
- **Basic Info**: Title, community name, link
- **Location**: District, area/sub-area
- **Pricing**: Total price, unit price (元/㎡)
- **Property Details**: Layout, square footage, direction, decoration
- **Building Info**: Floor, construction year
- **Metadata**: Page number, timestamp

### Reports
- Market overview with pricing statistics
- Hot investment opportunities ranking
- District performance comparisons
- Investment recommendations
- Anti-bot bypass effectiveness reports

## 🔧 Development

### Programmatic Usage

```javascript
const RealEstateAnalyzer = require('./src/main');

const analyzer = new RealEstateAnalyzer({
    districts: ['xuhui', 'pudong'],
    maxPages: 3,
    delay: 2000,
    mode: 'both'
});

await analyzer.run();
```

### Testing
```bash
# Run anti-bot bypass tests
npm run test:antibot

# Test specific components
node test-antibot.js
```

## ⚠️ Important Notes

- **Educational Purpose**: This tool is for research and educational use only
- **Rate Limiting**: Built-in delays prevent server overload
- **Legal Compliance**: Respect website Terms of Service
- **Data Accuracy**: Results depend on website data availability
- **Anti-Bot Adaptation**: System continuously evolves to handle new protections

## 📊 Sample Output

### Console Report
```
📈 MARKET ANALYSIS REPORT
========================
Generated: 2024-01-15T10:30:00.000Z
Periods Analyzed: 5
Date Range: 2024-01-10 to 2024-01-15
Overall Trend: Moderately Increasing

💰 PRICE ANALYSIS
----------------
Current Average Price: ¥8,250,000
Price Change: +3.2%
Volume Change: +15.8%

🏆 TOP PERFORMING DISTRICTS
---------------------------
1. xuhui: +8.5% (¥12,500,000)
2. jingan: +6.2% (¥11,800,000)
3. huangpu: +5.1% (¥10,200,000)

🔥 MARKET HOT SPOTS
------------------
1. xuhui-徐汇滨江 🔥
   Price: ¥15,800,000/㎡ (+12.3%)
   Listings: 127

💡 RECOMMENDATIONS
-----------------
1. Market showing positive momentum - good time for investment
2. Hot areas identified: xuhui-徐汇滨江, pudong-陆家嘴, jingan-静安寺
3. High trading volume indicates strong market activity
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Please:
- Respect website terms of service
- Implement appropriate rate limiting
- Use data responsibly
- Check local regulations regarding web scraping

## 🆘 Troubleshooting

### Common Issues

**Rate limiting errors:**
```bash
# Increase delay between requests
npm run crawl -- --delay 3000
```

**Memory issues with large datasets:**
```bash
# Reduce number of pages or districts
npm run crawl -- --pages 2 --districts xuhui,huangpu
```

**Missing dependencies:**
```bash
npm install xlsx  # For Excel export
```

### Getting Help

- Check the [Issues](https://github.com/yourusername/shanghai-real-estate-analyzer/issues) section
- Review the source code documentation
- Contact the maintainers

---
Built with ❤️ for real estate analytics