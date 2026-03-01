module.exports = {
    // Crawling Configuration
    crawling: {
        // Districts to crawl (empty array = all districts)
        districts: [], // ['xuhui', 'pudong', 'huangpu']
        
        // Maximum pages per district
        maxPages: 5,
        
        // Delay between requests (milliseconds)
        requestDelay: 1500,
        
        // User agent string
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },

    // Data Storage
    storage: {
        // Data directory
        dataDir: './data',
        
        // Keep historical data (days)
        retentionDays: 90,
        
        // Compress old data
        compressOldData: true
    },

    // Analysis Settings
    analysis: {
        // Minimum data points for trend analysis
        minDataPoints: 3,
        
        // Hot spot threshold (% change)
        hotSpotThreshold: 5,
        
        // Cooling threshold (% change)
        coolingThreshold: -5,
        
        // Top N areas to report
        topAreasToShow: 15
    },

    // District Mapping (Chinese names)
    districtNames: {
        'xuhui': '徐汇区',
        'huangpu': '黄浦区',
        'jingan': '静安区',
        'changning': '长宁区',
        'putuo': '普陀区',
        'hongkou': '虹口区',
        'yangpu': '杨浦区',
        'minhang': '闵行区',
        'baoshan': '宝山区',
        'jiading': '嘉定区',
        'pudong': '浦东新区',
        'jinshan': '金山区',
        'songjiang': '松江区',
        'qingpu': '青浦区',
        'fengxian': '奉贤区',
        'chongming': '崇明区'
    },

    // Common Area Names (for better categorization)
    areaMappings: {
        'xuhui': ['徐汇滨江', '漕河泾', '万体馆', '复兴西路', '衡山路'],
        'pudong': ['陆家嘴', '世纪公园', '张江', '金桥', '外高桥'],
        'huangpu': ['人民广场', '南京东路', '豫园', '新天地', '淮海中路'],
        'jingan': ['静安寺', '南京西路', '苏州河', '大宁', '彭浦'],
        'changning': ['中山公园', '古北', '虹桥', '天山', '新华路']
    },

    // Price Ranges for Filtering
    priceRanges: {
        luxury: { min: 15000000, label: '豪华住宅 (>1500万)' },
        premium: { min: 8000000, max: 15000000, label: '高端住宅 (800-1500万)' },
        mid: { min: 3000000, max: 8000000, label: '中端住宅 (300-800万)' },
        affordable: { max: 3000000, label: '经济住宅 (<300万)' }
    },

    // Logging Configuration
    logging: {
        level: 'info',
        file: './logs/analyzer.log',
        maxSize: '20m',
        maxFiles: '14d'
    },

    // Schedule Configuration (for cron jobs)
    schedule: {
        dailyLightScan: {
            districts: ['xuhui', 'huangpu', 'jingan'],
            pages: 2,
            time: '0 9 * * *' // 9 AM daily
        },
        weeklyFullScan: {
            districts: [], // All districts
            pages: 5,
            time: '0 8 * * 1' // Monday 8 AM
        }
    }
};