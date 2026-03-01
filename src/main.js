const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const AutoDetectCrawler = require('./autoDetectCrawler');
const BrowserLikeCrawler = require('./browserCrawler');
const AdvancedBrowserCrawler = require('./advancedBrowserCrawler');
const TrendAnalyzer = require('./trendAnalyzer');

class ShanghaiRealEstateAnalyzer {
    constructor(options = {}) {
        this.options = {
            mode: options.mode || 'auto', // 'auto', 'real', 'advanced', 'simulation'
            districts: options.districts || ['xuhui'],
            maxPages: options.maxPages || 3,
            delay: options.delay || 2000,
            dataDir: options.dataDir || './data',
            antiBotBypass: options.antiBotBypass !== false, // Enabled by default
            ...options
        };
        
        // Validate districts
        if (this.options.districts.length === 0) {
            this.options.districts = ['xuhui']; // Default district
        }
        
        logger.info('ShanghaiRealEstateAnalyzer initialized', this.options);
    }

    async run() {
        try {
            console.log('🏠 Shanghai Real Estate Market Analyzer');
            console.log('========================================\n');
            
            // Handle different modes
            switch (this.options.mode) {
                case 'auto':
                    return await this.runAutoMode();
                case 'real':
                    return await this.runRealMode();
                case 'advanced':
                    return await this.runAdvancedMode();
                case 'simulation':
                    return await this.runSimulationMode();
                case 'analyze':
                    return await this.runAnalysisOnly();
                default:
                    throw new Error(`Unknown mode: ${this.options.mode}`);
            }
            
        } catch (error) {
            logger.error('Analysis failed', { error: error.message });
            console.error('\n❌ Analysis failed:', error.message);
            process.exit(1);
        }
    }

    async runAutoMode() {
        console.log('🤖 AUTO MODE: Automatic detection and optimal crawling\n');
        
        const crawler = new AutoDetectCrawler({
            districts: this.options.districts,
            dataDir: this.options.dataDir,
            fallbackEnabled: this.options.antiBotBypass
        });
        
        const results = await crawler.crawlAllDistricts();
        await this.performAnalysis(results);
        
        return results;
    }

    async runRealMode() {
        console.log('🌐 REAL MODE: Standard browser-like crawling\n');
        
        const crawler = new BrowserLikeCrawler({
            districts: this.options.districts,
            maxPages: this.options.maxPages,
            delay: this.options.delay,
            dataDir: this.options.dataDir
        });
        
        const results = await crawler.crawlAllDistricts();
        await this.performAnalysis(results);
        
        return results;
    }

    async runAdvancedMode() {
        console.log('🚀 ADVANCED MODE: Enhanced anti-bot bypass crawling\n');
        
        const crawler = new AdvancedBrowserCrawler({
            districts: this.options.districts,
            maxPages: this.options.maxPages,
            delay: this.options.delay,
            dataDir: this.options.dataDir
        });
        
        const results = await crawler.crawlAllDistricts();
        await this.performAnalysis(results);
        
        return results;
    }

    async runSimulationMode() {
        console.log('🎮 SIMULATION MODE: Generated sample data\n');
        
        const SimulationCrawler = require('./simulationCrawler');
        const crawler = new SimulationCrawler({
            districts: this.options.districts,
            dataDir: this.options.dataDir
        });
        
        const results = await crawler.crawlAllDistricts();
        await this.performAnalysis(results);
        
        return results;
    }

    async runAnalysisOnly() {
        console.log('📊 ANALYSIS MODE: Processing existing data\n');
        
        // Find latest data file
        const dataFiles = await fs.readdir(this.options.dataDir);
        const crawlFiles = dataFiles
            .filter(file => file.startsWith('shanghai_') && file.endsWith('.json'))
            .sort()
            .reverse();
            
        if (crawlFiles.length === 0) {
            throw new Error('No crawl data found. Run crawl first.');
        }
        
        const latestFile = crawlFiles[0];
        const filePath = path.join(this.options.dataDir, latestFile);
        
        console.log(`🔍 Analyzing: ${latestFile}\n`);
        
        const rawData = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(rawData);
        
        return await this.performAnalysis(data);
    }

    async performAnalysis(crawlData) {
        console.log('\n📈 Starting market analysis...\n');
        
        const analyzer = new TrendAnalyzer({
            dataDir: this.options.dataDir,
            hotSpotThreshold: 5,
            coolingThreshold: -3,
            topAreasToShow: 10
        });
        
        const analysis = await analyzer.analyzeMarket(crawlData);
        
        // Generate comprehensive report
        await this.generateComprehensiveReport(analysis, crawlData);
        
        return analysis;
    }

    async generateComprehensiveReport(analysis, crawlData) {
        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                analyzerVersion: '2.0-auto-detect',
                dataSource: crawlData.metadata?.dataSource || 'real',
                antiBotBypass: crawlData.metadata?.antiBotBypass || false,
                detectionMode: crawlData.metadata?.detection?.mode || 'unknown'
            },
            marketOverview: analysis.overview,
            hotSpots: analysis.hotSpots,
            coolingMarkets: analysis.coolingMarkets,
            districtRankings: analysis.districtRankings,
            recommendations: analysis.recommendations,
            rawStatistics: analysis.statistics
        };

        // Save detailed report
        const filename = `comprehensive_analysis_${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(this.options.dataDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
        logger.info('Comprehensive report generated', { file: filename });
        
        // Display summary
        this.displayAnalysisSummary(analysis, crawlData);
        
        console.log(`\n💾 Detailed report saved: ${filename}`);
    }

    displayAnalysisSummary(analysis, crawlData) {
        console.log('\n🏆 Market Analysis Summary');
        console.log('==========================');
        
        console.log(`\n📊 Market Overview:`);
        console.log(`   • Total Houses Analyzed: ${analysis.overview.totalHouses}`);
        console.log(`   • Districts Covered: ${analysis.overview.districtsCovered}`);
        console.log(`   • Average Price: ¥${analysis.overview.averagePrice.toLocaleString()}万`);
        console.log(`   • Price Range: ¥${analysis.overview.priceRange.min.toLocaleString()}万 - ¥${analysis.overview.priceRange.max.toLocaleString()}万`);
        
        if (analysis.hotSpots && analysis.hotSpots.length > 0) {
            console.log(`\n🔥 Hot Investment Opportunities:`);
            analysis.hotSpots.slice(0, 5).forEach((spot, index) => {
                console.log(`   ${index + 1}. ${spot.district} (${spot.area}): +${spot.changePercent}% ↑`);
            });
        }
        
        if (analysis.coolingMarkets && analysis.coolingMarkets.length > 0) {
            console.log(`\n🧊 Cooling Markets:`);
            analysis.coolingMarkets.slice(0, 3).forEach((market, index) => {
                console.log(`   ${index + 1}. ${market.district} (${market.area}): ${market.changePercent}% ↓`);
            });
        }
        
        console.log(`\n🏘️  Top Districts by Average Price:`);
        if (analysis.districtRankings) {
            analysis.districtRankings.slice(0, 5).forEach((district, index) => {
                console.log(`   ${index + 1}. ${district.name}: ¥${district.avgPrice.toLocaleString()}万 (${district.count} houses)`);
            });
        }
        
        console.log(`\n💡 Investment Recommendations:`);
        if (analysis.recommendations) {
            analysis.recommendations.slice(0, 3).forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec.type}: ${rec.description}`);
            });
        }
        
        // Add anti-bot information
        if (crawlData.metadata?.antiBotBypass) {
            console.log(`\n🛡️  Anti-Bot Status:`);
            console.log(`   • Bypass Active: Yes`);
            console.log(`   • Detection Mode: ${crawlData.metadata.detection?.mode || 'N/A'}`);
            console.log(`   • Fallback Used: ${crawlData.metadata.fallbackUsed ? 'Yes' : 'No'}`);
        }
    }

    // Static method for quick status check
    static async checkWebsiteStatus() {
        return await AutoDetectCrawler.checkWebsiteStatus();
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const options = {
        mode: 'auto',
        districts: [],
        maxPages: 3,
        delay: 2000
    };
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--mode':
                options.mode = args[++i];
                break;
            case '--districts':
                options.districts = args[++i].split(',');
                break;
            case '--pages':
                options.maxPages = parseInt(args[++i]);
                break;
            case '--delay':
                options.delay = parseInt(args[++i]);
                break;
            case '--no-antibot':
                options.antiBotBypass = false;
                break;
            case '--help':
                console.log('Usage: node src/main.js [options]');
                console.log('\nOptions:');
                console.log('  --mode <mode>        Operation mode: auto|real|advanced|simulation|analyze');
                console.log('  --districts <list>   Comma-separated district list');
                console.log('  --pages <number>     Max pages per district');
                console.log('  --delay <ms>         Delay between requests');
                console.log('  --no-antibot         Disable anti-bot bypass');
                console.log('  --help               Show this help');
                console.log('\nExamples:');
                console.log('  node src/main.js --mode auto --districts xuhui,pudong');
                console.log('  node src/main.js --mode advanced --pages 5');
                console.log('  node src/main.js --mode analyze');
                process.exit(0);
        }
    }
    
    const analyzer = new ShanghaiRealEstateAnalyzer(options);
    analyzer.run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = ShanghaiRealEstateAnalyzer;