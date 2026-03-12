const BrowserLikeCrawler = require('./browserCrawler');
const SimulationCrawler = require('./simulationCrawler');
const TrendAnalyzer = require('./trendAnalyzer');
const logger = require('./logger');
const fs = require('fs').promises;
const path = require('path');

class RealEstateAnalyzer {
    constructor(config = {}) {
        this.config = {
            districts: config.districts || ['xuhui'],
            maxPages: config.maxPages || 2,
            delay: config.delay || 3000,
            dataDir: config.dataDir || './data',
            mode: config.mode || 'crawl',
            crawlerType: config.crawlerType || 'auto', // 'browser', 'simulation', 'auto'
            enableSimulationFallback: config.enableSimulationFallback !== false
        };
        
        this.crawler = null;
        this.analyzer = new TrendAnalyzer(this.config.dataDir);
        
        logger.info('RealEstateAnalyzer initialized', {
            mode: this.config.mode,
            districts: this.config.districts,
            crawlerType: this.config.crawlerType
        });
    }

    async initializeCrawler() {
        if (this.crawler) return this.crawler;

        switch (this.config.crawlerType) {
            case 'browser':
                this.crawler = new BrowserLikeCrawler(this.config);
                break;
            case 'simulation':
                this.crawler = new SimulationCrawler(this.config);
                break;
            case 'auto':
            default:
                // Try browser crawler first, fall back to simulation
                try {
                    this.crawler = new BrowserLikeCrawler(this.config);
                    // Test if it works
                    await this.testCrawler(this.crawler);
                } catch (error) {
                    logger.warn('Browser crawler failed, switching to simulation', { error: error.message });
                    console.log('⚠️  Live website unavailable, switching to simulation mode...');
                    this.crawler = new SimulationCrawler(this.config);
                }
                break;
        }

        return this.crawler;
    }

    async testCrawler(crawler) {
        // Simple test to see if crawler can access basic data
        // This is a placeholder - in real implementation you'd test actual crawling
        return true;
    }

    async run() {
        logger.info('Starting Shanghai Real Estate Data & Trend Analyzer');
        logger.info('Configuration:', this.config);
        
        console.log('🏢 Shanghai Real Estate Data & Trend Analyzer');
        console.log('=============================================\n');
        
        try {
            switch (this.config.mode) {
                case 'crawl':
                    return await this.runCrawler();
                case 'analyze':
                    return await this.runAnalyzer();
                case 'both':
                    return await this.runCompleteAnalysis();
                default:
                    throw new Error(`Invalid mode: ${this.config.mode}. Use: crawl, analyze, or both`);
            }
        } catch (error) {
            logger.error('Application failed', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    async runCrawler() {
        logger.info('Starting data collection...');
        console.log('🕷️  Starting data collection...\n');
        
        try {
            const crawler = await this.initializeCrawler();
            const data = await crawler.crawlAllDistricts();
            
            logger.info('Data collection completed successfully', {
                totalHouses: data.houses.length,
                districts: data.metadata.districts.length,
                dataSource: data.metadata.dataSource || 'live'
            });
            
            console.log('\n✅ Data collection completed successfully!');
            return data;
        } catch (error) {
            logger.error('Data collection failed', { error: error.message });
            console.error('❌ Data collection failed:', error.message);
            throw error;
        }
    }

    async runAnalyzer() {
        logger.info('Starting trend analysis...');
        console.log('📊 Starting trend analysis...\n');
        
        try {
            await this.analyzer.loadHistoricalData();
            const report = this.analyzer.generateMarketReport();
            
            if (report.error) {
                logger.warn('Analysis warning', { message: report.error });
                console.log('ℹ️ ', report.error);
                return null;
            }
            
            const reportPath = await this.analyzer.saveReport(report);
            logger.info('Market report generated', { reportPath });
            this.displayReport(report);
            return report;
        } catch (error) {
            logger.error('Trend analysis failed', { error: error.message });
            console.error('❌ Trend analysis failed:', error.message);
            throw error;
        }
    }

    async runCompleteAnalysis() {
        logger.info('Running complete analysis (crawl + analyze)...');
        console.log('🔄 Running complete analysis (crawl + analyze)...\n');
        
        try {
            // First run crawler
            await this.runCrawler();
            
            // Then run analysis
            const report = await this.runAnalyzer();
            
            logger.info('Complete analysis finished successfully');
            return report;
        } catch (error) {
            logger.error('Complete analysis failed', { error: error.message });
            throw error;
        }
    }

    displayReport(report) {
        console.log('\n📈 MARKET ANALYSIS REPORT');
        console.log('========================');
        console.log(`Generated: ${report.generatedAt}`);
        console.log(`Periods Analyzed: ${report.summary.totalPeriods}`);
        console.log(`Date Range: ${report.summary.dateRange}`);
        console.log(`Overall Trend: ${report.summary.overallTrend}\n`);

        console.log('💰 PRICE ANALYSIS');
        console.log('----------------');
        console.log(`Current Average Price: ¥${report.priceAnalysis.overall.currentAvgPrice.toLocaleString()}`);
        console.log(`Price Change: ${report.priceAnalysis.overall.priceChangePercent > 0 ? '+' : ''}${report.priceAnalysis.overall.priceChangePercent}%`);
        console.log(`Volume Change: ${report.priceAnalysis.overall.volumeChangePercent > 0 ? '+' : ''}${report.priceAnalysis.overall.volumeChangePercent}%\n`);

        if (report.priceAnalysis.topPerformingDistricts.length > 0) {
            console.log('🏆 TOP PERFORMING DISTRICTS');
            console.log('---------------------------');
            report.priceAnalysis.topPerformingDistricts.forEach((district, index) => {
                console.log(`${index + 1}. ${district.district}: ${district.changePercent > 0 ? '+' : ''}${district.changePercent}% (¥${district.currentValue.toLocaleString()})`);
            });
            console.log('');
        }

        if (report.marketHotSpots.length > 0) {
            console.log('🔥 MARKET HOT SPOTS');
            console.log('------------------');
            report.marketHotSpots.slice(0, 10).forEach((spot, index) => {
                const trendEmoji = spot.trend === 'hot' ? '🔥' : spot.trend === 'cooling' ? '❄️' : '➡️';
                console.log(`${index + 1}. ${spot.district}-${spot.area} ${trendEmoji}`);
                console.log(`   Price: ¥${spot.avgUnitPrice.toLocaleString()}/㎡ (${spot.priceChange > 0 ? '+' : ''}${spot.priceChange}%)`);
                console.log(`   Listings: ${spot.count}\n`);
            });
        }

        if (report.recommendations.length > 0) {
            console.log('💡 RECOMMENDATIONS');
            console.log('-----------------');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
    }

    async exportData(format = 'json') {
        try {
            logger.info('Starting data export', { format });
            
            const files = await fs.readdir(this.config.dataDir);
            const dataFiles = files.filter(f => 
                (f.startsWith('shanghai_browser_crawl_') || 
                 f.startsWith('shanghai_real_estate_simulated_')) && 
                f.endsWith('.json')
            );
            
            if (dataFiles.length === 0) {
                logger.warn('No data files found to export');
                console.log('ℹ️ No data files found to export');
                return;
            }

            const latestFile = dataFiles.sort().pop();
            const data = JSON.parse(await fs.readFile(path.join(this.config.dataDir, latestFile), 'utf8'));

            switch (format) {
                case 'csv':
                    await this.exportToCSV(data);
                    break;
                case 'excel':
                    await this.exportToExcel(data);
                    break;
                default:
                    logger.info('Data already available in JSON format');
                    console.log('✅ Data already available in JSON format');
            }
        } catch (error) {
            logger.error('Export failed', { error: error.message, format });
            console.error('❌ Export failed:', error.message);
        }
    }

    async exportToCSV(data) {
        const csvHeaders = ['district', 'area', 'community', 'title', 'totalPrice', 'unitPrice', 'square', 'layout', 'direction', 'decoration', 'floor', 'year', 'timestamp'];
        const csvRows = [csvHeaders.join(',')];

        data.houses.forEach(house => {
            const row = [
                `"${house.district}"`,
                `"${house.area}"`,
                `"${house.community}"`,
                `"${house.title}"`,
                house.totalPrice,
                house.unitPrice,
                house.square,
                `"${house.layout}"`,
                `"${house.direction}"`,
                `"${house.decoration}"`,
                `"${house.floor}"`,
                house.year,
                `"${house.timestamp}"`
            ];
            csvRows.push(row.join(','));
        });

        const filename = `shanghai_real_estate_${new Date().toISOString().split('T')[0]}_export.csv`;
        const filepath = path.join(this.config.dataDir, filename);
        
        await fs.writeFile(filepath, csvRows.join('\n'));
        logger.info('CSV export completed', { filepath });
        console.log(`📤 CSV exported: ${filepath}`);
    }

    async exportToExcel(data) {
        try {
            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(data.houses);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Real Estate Data');
            
            const filename = `shanghai_real_estate_${new Date().toISOString().split('T')[0]}_export.xlsx`;
            const filepath = path.join(this.config.dataDir, filename);
            
            xlsx.writeFile(workbook, filepath);
            logger.info('Excel export completed', { filepath });
            console.log(`📤 Excel exported: ${filepath}`);
        } catch (error) {
            logger.error('Excel export failed', { error: error.message });
            console.error('❌ Excel export failed (xlsx package required):', error.message);
            console.log('💡 Run: npm install xlsx');
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const config = {};

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--districts':
                config.districts = args[i + 1]?.split(',');
                i++;
                break;
            case '--pages':
                config.maxPages = parseInt(args[i + 1]);
                i++;
                break;
            case '--delay':
                config.delay = parseInt(args[i + 1]);
                i++;
                break;
            case '--mode':
                config.mode = args[i + 1];
                i++;
                break;
            case '--export':
                config.export = args[i + 1];
                i++;
                break;
            case '--type':
                config.crawlerType = args[i + 1];
                i++;
                break;
            case '--no-sim':
                config.enableSimulationFallback = false;
                i++;
                break;
        }
    }

    logger.info('CLI arguments parsed', { args: process.argv.slice(2), config });

    const analyzer = new RealEstateAnalyzer(config);
    
    try {
        const result = await analyzer.run();
        
        if (config.export) {
            await analyzer.exportData(config.export);
        }
        
        logger.info('Application completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Application failed in main', { error: error.message });
        console.error('Application failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = RealEstateAnalyzer;