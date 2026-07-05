# 🏢 Shanghai Real Estate Data & Trend Analyzer

A comprehensive Node.js solution for crawling, analyzing, and tracking Shanghai real estate market trends from Lianjia.com.

## 🌟 Features

- **Multi-District Crawling**: Collect data from all major Shanghai districts
- **Trend Analysis**: Track price movements and market trends over time
- **Hot Spot Detection**: Identify emerging and cooling market areas
- **Data Export**: Export in JSON, CSV, and Excel formats
- **Automated Reporting**: Generate comprehensive market analysis reports
- **Configurable**: Flexible crawling parameters and scheduling options
- **Advanced Anti-Bot Protection**: Bypass modern web scraping defenses with browser-like behavior

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/shanghai-real-estate-analyzer.git
cd shanghai-real-estate-analyzer

# Install dependencies
npm install
```

### Basic Usage

```bash
# Run complete analysis (crawl + analyze)
npm start

# Just crawl data
npm run crawl

# Just analyze existing data
npm run analyze
```

## 🛡️ Anti-Bot Protection

A sophisticated system to bypass modern web scraping protections while maintaining ethical crawling practices.

### Key Features

- **Intelligent User Agent Rotation**: Automatically rotates through realistic browser user agents
- **Proxy Support**: Configurable HTTP/HTTPS proxy rotation
- **Session Management**: Maintains persistent sessions with proper cookie handling
- **Human-like Timing**: Variable delays that mimic real user behavior
- **Advanced Retry Logic**: Exponential backoff with jitter for failed requests
- **Anti-Bot Detection**: Automatic detection of CAPTCHA, rate limits, and blocking
- **Browser Fingerprinting Prevention**: Simulates real browser headers and behavior
- **Stealth Mode**: Minimizes detection risk with realistic browsing patterns

### Quick Start

```bash
# Test anti-bot detection system
npm run anti-bot:test

# Run protected crawling demo  
npm run anti-bot:demo

# Start protected crawling
npm run crawl:protected

# Monitor protection status
npm run anti-bot:status
```

### Configuration

Create `src/config/antiBot.config.js` for advanced settings:

```javascript
module.exports = {
    antiBot: {
        enabled: true,
        mode: 'stealth', // 'normal' | 'stealth' | 'aggressive'
        proxies: [
            {
                protocol: 'http',
                host: 'proxy.example.com',
                port: 8080,
                auth: {
                    username: 'user',
                    password: 'pass'
                }
            }
        ],
        userAgentRotation: {
            enabled: true,
            poolSize: 10
        },
        timing: {
            minDelay: 2000,
            maxDelay: 5000,
            humanLikeVariation: true
        },
        session: {
            persistence: true,
            maxAge: 3600000 // 1 hour
        }
    }
};
```

### Usage Examples

#### Protected Crawling
```javascript
const BrowserLikeCrawler = require('./src/crawlers/browserCrawler');

const crawler = new BrowserLikeCrawler({
    districts: ['xuhui', 'huangpu'],
    maxPages: 3,
    delay: 3000,
    antiBot: {
        enabled: true,
        mode: 'stealth'
    }
});

const results = await crawler.crawlAllDistricts();
```

#### Manual Anti-Bot Bypass
```javascript
const AntiBotBypass = require('./src/security/antiBotBypass');

const antiBot = new AntiBotBypass({
    maxRetries: 5,
    delayRange: { min: 2000, max: 5000 }
});

try {
    const result = await antiBot.smartRequest('https://sh.lianjia.com/ershoufang/');
    console.log('Success:', result.data.length, 'characters');
} catch (error) {
    console.log('Blocked:', error.message);
}
```

### Detection Capabilities

The system automatically detects and handles:

- **CAPTCHA/Verification Pages**: Identifies verification requirements
- **Rate Limiting**: Detects "429 Too Many Requests" responses
- **Cloudflare Protection**: Recognizes browser challenge pages
- **Access Denied**: Handles "403 Forbidden" responses
- **JavaScript Challenges**: Detects pages requiring JS execution
- **Unusual Response Patterns**: Identifies bot-like blocking patterns
- **IP Blocking**: Detects IP-based restrictions
- **Behavioral Analysis**: Recognizes non-human browsing patterns

## 📊 Available Commands

### Crawling Options

```bash
# Crawl all districts (default)
npm run crawl

# Crawl specific districts
npm run crawl:xuhui          # Xuhui district only
npm run crawl:pudong         # Pudong district only
npm run crawl:core           # Core downtown districts

# Protected crawling with anti-bot features
npm run crawl:protected      # Use anti-bot protection
npm run anti-bot:test        # Test anti-bot system
npm run anti-bot:demo        # Run anti-bot demonstration

# Custom crawling
node src/main.js --mode crawl --districts xuhui,pudong,minhang --pages 5 --delay 2000 --antiBot true
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

## ⚙️ Configuration

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
shanghai-real-estate-analyzer/
├── src/
│   ├── crawlers/
│   │   ├── crawler.js              # Basic crawler
│   │   ├── browserCrawler.js       # Browser-simulated crawler (with anti-bot)
│   │   ├── enhancedCrawler.js      # Enhanced crawler
│   │   └── simulationCrawler.js    # Simulation-based crawler
│   ├── security/
│   │   ├── antiBotBypass.js        # Anti-bot protection system
│   │   └── fingerprint.js          # Browser fingerprint management
│   ├── analyzers/
│   │   ├── trendAnalyzer.js        # Market trend analysis
│   │   └── hotSpotDetector.js      # Hot spot detection
│   ├── config/
│   │   ├── default.js              # Default configuration
│   │   └── antiBot.config.js       # Anti-bot specific configuration
│   ├── utils/
│   │   └── logger.js               # Logging utilities
│   └── main.js                    # Application entry point
├── data/                         # Collected data storage
│   ├── raw/                      # Raw crawled data
│   ├── processed/                # Processed data
│   ├── reports/                  # Generated reports
│   └── backups/                  # Data backups
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/                 # Security and anti-bot tests
├── package.json
├── README.md
└── LICENSE
```

## 📈 Data Output

### Collected Data Fields

Each house record includes:
- **Basic Info**: Title, community name, link
- **Location**: District, area/sub-area
- **Pricing**: Total price, unit price (元/㎡)
- **Property Details**: Layout, square footage, direction, decoration
- **Building Info**: Floor, construction year
- **Metadata**: Page number, timestamp

### Analysis Reports

Generated reports include:
- Overall market trends
- District-level performance
- Price change percentages
- Volume trends
- Hot spot identification
- Investment recommendations

## 🔧 Advanced Usage

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

### Custom Export

```javascript
// Export to different formats
await analyzer.exportData('csv');    // CSV format
await analyzer.exportData('excel');  // Excel format
```

## 🛡️ Best Practices

### Rate Limiting
- Default delay: 1500ms between requests
- Recommended: Don't go below 1000ms to respect the website
- Consider longer delays for production use

### Data Management
- Data is automatically timestamped
- Previous crawls are preserved
- Summary files help track trends over time

### Scheduling Recommendations
```bash
# Daily light scan (core districts)
0 9 * * * cd /path/to/project && npm run schedule:daily

# Weekly full scan
0 8 * * 1 cd /path/to/project && npm start
```

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