const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const BrowserLikeCrawler = require('./browserCrawler');
const AdvancedBrowserCrawler = require('./advancedBrowserCrawler');
const SimulationCrawler = require('./simulationCrawler');

class AutoDetectCrawler {
    constructor(options = {}) {
        this.districts = options.districts || ['xuhui'];
        this.dataDir = options.dataDir || './data';
        this.testDistrict = options.testDistrict || 'xuhui'; // District to test accessibility
        this.fallbackEnabled = options.fallbackEnabled !== false; // Enable fallback by default
        
        // Detection thresholds
        this.accessibilityThreshold = 0.6; // 60% success rate required
        this.testSampleSize = 3; // Test 3 districts for detection
        this.detectionTimeout = 10000; // 10 seconds for detection
        
        // Mode tracking
        this.detectedMode = null;
        this.detectionResults = {
            accessible: [],
            blocked: [],
            testedDistricts: []
        };
    }

    async detectOptimalMode() {
        logger.info('Starting automatic mode detection');
        console.log('🔍 Detecting optimal crawling mode...\n');
        
        // Select test districts (use popular ones for better detection)
        const testDistricts = ['xuhui', 'pudong', 'huangpu'].slice(0, this.testSampleSize);
        
        let accessibleCount = 0;
        let totalTime = 0;
        
        console.log(`🧪 Testing accessibility for: ${testDistricts.join(', ')}`);
        
        for (const district of testDistricts) {
            try {
                console.log(`\n🌐 Testing ${district}...`);
                this.detectionResults.testedDistricts.push(district);
                
                const startTime = Date.now();
                
                // Quick test with advanced crawler
                const testResult = await this.quickAccessibilityTest(district);
                
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                totalTime += responseTime;
                
                if (testResult.success) {
                    this.detectionResults.accessible.push({
                        district,
                        responseTime,
                        housesFound: testResult.housesFound
                    });
                    accessibleCount++;
                    console.log(`✅ ${district}: Accessible (${responseTime}ms, ${testResult.housesFound} houses)`);
                } else {
                    this.detectionResults.blocked.push({
                        district,
                        reason: testResult.reason,
                        responseTime
                    });
                    console.log(`❌ ${district}: Blocked (${testResult.reason})`);
                }
                
            } catch (error) {
                logger.warn('Detection test failed', { district, error: error.message });
                this.detectionResults.blocked.push({
                    district,
                    reason: error.message,
                    responseTime: 0
                });
                console.log(`❌ ${district}: Test failed (${error.message})`);
            }
            
            // Small delay between tests
            await this.sleep(1000);
        }
        
        // Calculate success rate
        const successRate = testDistricts.length > 0 ? accessibleCount / testDistricts.length : 0;
        const avgResponseTime = testDistricts.length > 0 ? totalTime / testDistricts.length : 0;
        
        console.log(`\n📊 Detection Results:`);
        console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}% (${accessibleCount}/${testDistricts.length})`);
        console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`   Accessible Districts: ${this.detectionResults.accessible.map(d => d.district).join(', ')}`);
        console.log(`   Blocked Districts: ${this.detectionResults.blocked.map(d => d.district).join(', ')}`);
        
        // Determine optimal mode
        if (successRate >= this.accessibilityThreshold && avgResponseTime < 15000) {
            this.detectedMode = 'real';
            console.log(`🎯 Detected: REAL MODE - Website is accessible`);
        } else if (successRate > 0) {
            this.detectedMode = 'hybrid';
            console.log(`🔄 Detected: HYBRID MODE - Partial access, will use fallback for blocked districts`);
        } else {
            this.detectedMode = 'simulation';
            console.log(`🎮 Detected: SIMULATION MODE - Website appears blocked, using simulated data`);
        }
        
        logger.info('Mode detection completed', {
            mode: this.detectedMode,
            successRate,
            avgResponseTime,
            accessible: this.detectionResults.accessible.length,
            blocked: this.detectionResults.blocked.length
        });
        
        return this.detectedMode;
    }

    async quickAccessibilityTest(district) {
        try {
            // Use advanced crawler for testing
            const testCrawler = new AdvancedBrowserCrawler({
                districts: [district],
                maxPages: 1,
                delay: 1000,
                dataDir: this.dataDir
            });
            
            // Initialize but don't establish full session for quick test
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Quick request test
            const url = `https://sh.lianjia.com/ershoufang/${district}/`;
            const html = await testCrawler.requestWithRetry(url, 'accessibility test', 1);
            
            // Check for anti-bot protection
            if (testCrawler.detectAntiBotProtection(html)) {
                return {
                    success: false,
                    reason: 'Anti-bot protection detected',
                    housesFound: 0
                };
            }
            
            // Parse to see if we can extract data
            const $ = require('cheerio').load(html);
            const houses = testCrawler.extractHouses($, district, 1);
            
            return {
                success: true,
                housesFound: houses.length,
                reason: 'Accessible'
            };
            
        } catch (error) {
            return {
                success: false,
                reason: error.message.includes('timeout') ? 'Timeout' : 
                       error.message.includes('403') ? 'Forbidden' :
                       error.message.includes('429') ? 'Rate limited' : 'Connection error',
                housesFound: 0
            };
        }
    }

    async crawlAllDistricts() {
        // First, detect optimal mode
        const mode = await this.detectOptimalMode();
        
        let results;
        
        switch (mode) {
            case 'real':
                results = await this.crawlInRealMode();
                break;
            case 'hybrid':
                results = await this.crawlInHybridMode();
                break;
            case 'simulation':
                results = await this.crawlInSimulationMode();
                break;
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
        
        // Add detection metadata
        results.metadata.detection = {
            mode: this.detectedMode,
            testResults: this.detectionResults,
            timestamp: new Date().toISOString()
        };
        
        await this.saveDetectionReport(results);
        return results;
    }

    async crawlInRealMode() {
        console.log('\n🚀 Starting REAL MODE crawl (full website access)\n');
        
        const crawler = new AdvancedBrowserCrawler({
            districts: this.districts,
            dataDir: this.dataDir,
            maxPages: 3,
            delay: 3000
        });
        
        return await crawler.crawlAllDistricts();
    }

    async crawlInHybridMode() {
        console.log('\n🔄 Starting HYBRID MODE crawl (mixed real and simulated data)\n');
        
        const realDistricts = this.detectionResults.accessible.map(d => d.district);
        const blockedDistricts = this.detectionResults.blocked.map(d => d.district);
        
        // Add untested districts to appropriate lists
        const untestedDistricts = this.districts.filter(d => 
            !this.detectionResults.testedDistricts.includes(d)
        );
        
        // For untested districts, assume they might work and try them
        const hybridResults = {
            metadata: {
                crawlDate: new Date().toISOString(),
                districts: this.districts,
                version: 'auto-detect-hybrid',
                realModeDistricts: [...realDistricts, ...untestedDistricts],
                simulationModeDistricts: blockedDistricts
            },
            houses: []
        };
        
        // Crawl accessible districts with real crawler
        if (realDistricts.length > 0 || untestedDistricts.length > 0) {
            const realCrawlerDistricts = [...realDistricts, ...untestedDistricts];
            console.log(`🌐 Real crawling districts: ${realCrawlerDistricts.join(', ')}`);
            
            const realCrawler = new AdvancedBrowserCrawler({
                districts: realCrawlerDistricts,
                dataDir: this.dataDir,
                maxPages: 2,
                delay: 2500
            });
            
            try {
                const realResults = await realCrawler.crawlAllDistricts();
                hybridResults.houses.push(...realResults.houses);
            } catch (error) {
                logger.error('Real crawl failed in hybrid mode', { error: error.message });
                console.log(`❌ Real crawl failed: ${error.message}`);
            }
        }
        
        // Generate simulated data for blocked districts
        if (blockedDistricts.length > 0) {
            console.log(`🎮 Simulating data for blocked districts: ${blockedDistricts.join(', ')}`);
            
            const simCrawler = new SimulationCrawler({
                districts: blockedDistricts,
                dataDir: this.dataDir
            });
            
            const simResults = await simCrawler.crawlAllDistricts();
            hybridResults.houses.push(...simResults.houses);
        }
        
        return hybridResults;
    }

    async crawlInSimulationMode() {
        console.log('\n🎮 Starting SIMULATION MODE crawl (website blocked)\n');
        
        const simCrawler = new SimulationCrawler({
            districts: this.districts,
            dataDir: this.dataDir
        });
        
        return await simCrawler.crawlAllDistricts();
    }

    async saveDetectionReport(results) {
        try {
            const report = {
                detection: results.metadata.detection,
                performance: {
                    totalHouses: results.houses.length,
                    districtsProcessed: this.districts.length,
                    realModeDistricts: results.metadata.realModeDistricts || [],
                    simulationModeDistricts: results.metadata.simulationModeDistricts || []
                },
                timestamp: new Date().toISOString()
            };
            
            const filename = `detection_report_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            logger.info('Detection report saved', { file: filename });
            console.log(`📋 Detection report saved: ${filename}`);
            
        } catch (error) {
            logger.error('Failed to save detection report', { error: error.message });
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Utility method to check current website status
    static async checkWebsiteStatus() {
        const detector = new AutoDetectCrawler({
            districts: ['xuhui', 'pudong'],
            testSampleSize: 2
        });
        
        return await detector.detectOptimalMode();
    }
}

module.exports = AutoDetectCrawler;