const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const ImprovedAntiBotBypass = require('./improvedAntiBotBypass');
const logger = require('./logger');

class ImprovedProtectedCrawler {
    constructor(options = {}) {
        this.districts = options.districts || ['xuhui', 'huangpu', 'jingan'];
        this.maxPages = options.maxPages || 3;
        this.dataDir = options.dataDir || './data';
        this.delay = options.delay || 2500;
        this.fallbackEnabled = options.fallbackEnabled !== false;
        
        // Enhanced anti-bot configuration
        this.antiBot = new ImprovedAntiBotBypass({
            maxRetries: options.maxRetries || 7,
            delayRange: options.delayRange || { min: 2500, max: 6000 },
            strategy: options.strategy || 'adaptive',
            proxies: options.proxies || [],
            userAgentRotation: true
        });
        
        this.baseURL = 'https://sh.lianjia.com';
        this.collectedHouses = [];
        this.failedDistricts = new Set();
        this.successfulDistricts = new Set();
        this.districtStats = new Map(); // Track performance per district
    }

    async init() {
        await fs.mkdir(this.dataDir, { recursive: true });
        logger.info('Improved protected crawler initialized', {
            districts: this.districts,
            maxPages: this.maxPages,
            strategy: this.antiBot.strategy
        });
    }

    async crawlAllDistricts() {
        await this.init();
        
        logger.info('Starting improved protected crawl with enhanced anti-bot bypass');
        console.log('🚀 Starting IMPROVED protected crawl with enhanced anti-bot bypass');
        console.log(`📍 Districts: ${this.districts.join(', ')}`);
        console.log(`🛡️  Strategy: ${this.antiBot.strategy.toUpperCase()} mode`);
        console.log(`🔄 Max retries: ${this.antiBot.maxRetries}`);
        console.log(`⏱️  Delay range: ${this.antiBot.delayRange.min/1000}-${this.antiBot.delayRange.max/1000}s`);
        
        const startTime = Date.now();
        
        for (const district of this.districts) {
            try {
                console.log(`\n🏢 Processing ${district} district...`);
                const districtStartTime = Date.now();
                
                const houses = await this.crawlDistrict(district);
                
                const districtDuration = ((Date.now() - districtStartTime) / 1000).toFixed(1);
                this.districtStats.set(district, {
                    housesCollected: houses.length,
                    duration: districtDuration,
                    success: houses.length > 0,
                    timestamp: new Date().toISOString()
                });
                
                if (houses.length > 0) {
                    this.collectedHouses.push(...houses);
                    this.successfulDistricts.add(district);
                    console.log(`✅ ${district}: ${houses.length} houses collected (${districtDuration}s)`);
                } else {
                    this.failedDistricts.add(district);
                    console.log(`❌ ${district}: No data collected (${districtDuration}s)`);
                }
                
                // Show intermediate stats
                this.showProgressStats(district);
                
                // Delay between districts with adaptive timing
                if (district !== this.districts[this.districts.length - 1]) {
                    const districtDelay = this.calculateAdaptiveDelay(district);
                    console.log(`⏳ Waiting ${Math.round(districtDelay/1000)}s before next district...`);
                    await this.antiBot.sleep(districtDelay);
                }
                
            } catch (error) {
                logger.error(`District crawl failed: ${district}`, { error: error.message });
                console.log(`❌ ${district}: Failed - ${error.message}`);
                this.failedDistricts.add(district);
                this.districtStats.set(district, {
                    housesCollected: 0,
                    duration: '0',
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                
                if (this.fallbackEnabled) {
                    console.log(`🎮 Using fallback simulation for ${district}...`);
                    const fallbackHouses = this.generateFallbackData(district);
                    this.collectedHouses.push(...fallbackHouses);
                    this.successfulDistricts.add(district);
                    this.districtStats.set(district, {
                        housesCollected: fallbackHouses.length,
                        duration: 'simulated',
                        success: true,
                        fallback: true,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        
        // Save results
        await this.saveResults();
        
        // Generate comprehensive report
        const results = this.generateFinalResults(duration);
        
        this.displayFinalResults(results);
        
        return results;
    }

    async crawlDistrict(district) {
        const houses = [];
        let currentPage = 1;
        let consecutiveEmptyPages = 0;
        const maxConsecutiveEmpty = 2; // Stop if 2 consecutive pages are empty
        
        while (currentPage <= this.maxPages && consecutiveEmptyPages < maxConsecutiveEmpty) {
            try {
                const url = `${this.baseURL}/ershoufang/${district}/pg${currentPage}/`;
                console.log(`   📄 Page ${currentPage}: ${url}`);
                
                const response = await this.antiBot.makeRequest(url);
                const $ = cheerio.load(response.body);
                
                // Extract houses from the page
                const pageHouses = this.extractHouses($, district, currentPage);
                
                if (pageHouses.length === 0) {
                    consecutiveEmptyPages++;
                    console.log(`   ⚠️  No houses found on page ${currentPage} (${consecutiveEmptyPages}/${maxConsecutiveEmpty})`);
                    
                    if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
                        console.log(`   🛑 Stopping crawl for ${district} - too many empty pages`);
                        break;
                    }
                } else {
                    consecutiveEmptyPages = 0; // Reset counter on successful page
                    houses.push(...pageHouses);
                    console.log(`   ✅ Page ${currentPage}: ${pageHouses.length} houses extracted`);
                }
                
                currentPage++;
                
                // Adaptive delay between pages
                if (currentPage <= this.maxPages && consecutiveEmptyPages < maxConsecutiveEmpty) {
                    const pageDelay = this.calculatePageDelay(district, currentPage, houses.length);
                    await this.antiBot.sleep(pageDelay);
                }
                
            } catch (error) {
                logger.warn(`Page crawl failed: ${district} page ${currentPage}`, { error: error.message });
                console.log(`   ❌ Page ${currentPage} failed: ${error.message}`);
                
                // Try alternative approach for remaining pages
                if (currentPage < this.maxPages) {
                    console.log(`   🔄 Attempting alternative approach for remaining pages...`);
                    const altHouses = await this.tryAlternativeApproach(district, currentPage);
                    if (altHouses.length > 0) {
                        houses.push(...altHouses);
                        console.log(`   ✅ Alternative approach yielded ${altHouses.length} houses`);
                    }
                }
                break;
            }
        }
        
        return houses;
    }

    extractHouses($, district, page) {
        const houses = [];
        const houseElements = $('.sellListContent .clear .info, .listContent .item, .m-list .item');
        
        houseElements.each((index, element) => {
            try {
                const $element = $(element);
                const house = this.parseHouseElement($element, district, page);
                
                // Validate and add to results
                if (this.isValidHouse(house)) {
                    houses.push(house);
                }
                
            } catch (error) {
                logger.debug('House extraction failed', { error: error.message, district, page });
            }
        });
        
        return houses;
    }

    parseHouseElement($element, district, page) {
        const house = {};
        
        // Multiple selector strategies for robustness
        const titleSelectors = [
            '.title a', 
            '.house-title a', 
            '.item-main h3 a',
            '[class*="title"] a'
        ];
        
        for (const selector of titleSelectors) {
            const titleElement = $element.find(selector);
            if (titleElement.length > 0) {
                house.title = titleElement.text().trim();
                house.link = titleElement.attr('href');
                if (house.title) break;
            }
        }
        
        // Community and area information
        const addressSelectors = [
            '.address .houseInfo',
            '.house-info',
            '.item-other',
            '[class*="address"]'
        ];
        
        for (const selector of addressSelectors) {
            const addressElement = $element.find(selector);
            if (addressElement.length > 0) {
                const addressText = addressElement.text();
                const parts = addressText.split('|').map(p => p.trim());
                
                house.community = parts[0] || '';
                house.area = parts[1] || '';
                house.layout = parts[2] || '';
                house.size = parts[3] || '';
                break;
            }
        }
        
        // Price information
        house.totalPrice = this.extractPrice($element);
        house.unitPrice = this.extractUnitPrice($element);
        
        // Additional details
        house.floor = this.extractFloorInfo($element);
        house.year = this.extractYearInfo($element);
        house.direction = this.extractDirection($element);
        
        house.district = district;
        house.page = page;
        house.crawlDate = new Date().toISOString();
        
        return house;
    }

    isValidHouse(house) {
        // House is valid if it has essential information
        return house.title && 
               (house.totalPrice > 0 || house.unitPrice > 0) &&
               house.community;
    }

    extractPrice($element) {
        const priceSelectors = [
            '.priceInfo .totalPrice span',
            '.total-price span',
            '[class*="price"] [class*="total"]',
            '.price .amount'
        ];
        
        for (const selector of priceSelectors) {
            const priceText = $element.find(selector).text();
            if (priceText) {
                const match = priceText.match(/[\d.]+/);
                if (match) return parseFloat(match[0]);
            }
        }
        return 0;
    }

    extractUnitPrice($element) {
        const unitSelectors = [
            '.unitPrice',
            '.unit-price',
            '[class*="unit"]',
            '.price .unit'
        ];
        
        for (const selector of unitSelectors) {
            const unitText = $element.find(selector).text();
            if (unitText) {
                const match = unitText.match(/[\d,]+/);
                if (match) return parseInt(match[0].replace(/,/g, ''));
            }
        }
        return 0;
    }

    extractFloorInfo($element) {
        const floorSelectors = [
            '.flood .positionInfo',
            '.floor-info',
            '[class*="floor"]',
            '.item-other'
        ];
        
        for (const selector of floorSelectors) {
            const floorText = $element.find(selector).text();
            if (floorText && floorText.includes('层')) {
                return floorText.split('(')[0]?.trim() || floorText.trim();
            }
        }
        return '';
    }

    extractYearInfo($element) {
        const yearSelectors = [
            '.flood .positionInfo',
            '.year-built',
            '[class*="year"]'
        ];
        
        for (const selector of yearSelectors) {
            const yearText = $element.find(selector).text();
            if (yearText) {
                const match = yearText.match(/\d{4}/);
                if (match) return parseInt(match[0]);
            }
        }
        return 0;
    }

    extractDirection($element) {
        const directionSelectors = [
            '.house-direction',
            '[class*="direction"]',
            '.item-other'
        ];
        
        for (const selector of directionSelectors) {
            const directionText = $element.find(selector).text();
            if (directionText && (directionText.includes('朝') || directionText.includes('南') || directionText.includes('北'))) {
                return directionText.trim();
            }
        }
        return '';
    }

    async tryAlternativeApproach(district, startPage) {
        const houses = [];
        
        try {
            // Try mobile endpoint first
            console.log(`   📱 Trying mobile endpoint for ${district}...`);
            const mobileUrl = `https://m.lianjia.com/sh/ershoufang/${district}/`;
            const response = await this.antiBot.makeRequest(mobileUrl);
            
            const $ = cheerio.load(response.body);
            const mobileHouses = this.extractHouses($, district, startPage);
            
            if (mobileHouses.length > 0) {
                houses.push(...mobileHouses);
                console.log(`   ✅ Mobile endpoint successful: ${mobileHouses.length} houses found`);
                return houses;
            }
            
            // Try alternative domain
            console.log(`   🔁 Trying alternative domain for ${district}...`);
            const altUrl = `https://sh.ke.com/ershoufang/${district}/`;
            const altResponse = await this.antiBot.makeRequest(altUrl);
            
            const alt$ = cheerio.load(altResponse.body);
            const altHouses = this.extractHouses(alt$, district, startPage);
            
            if (altHouses.length > 0) {
                houses.push(...altHouses);
                console.log(`   ✅ Alternative domain successful: ${altHouses.length} houses found`);
            }
            
        } catch (error) {
            logger.debug('Alternative approach failed', { error: error.message, district });
        }
        
        return houses;
    }

    generateFallbackData(district) {
        logger.info('Generating fallback simulation data', { district });
        console.log(`🎮 Generating simulation data for ${district} due to anti-bot protection`);
        
        const simulationCrawler = require('./simulationCrawler');
        const simCrawler = new simulationCrawler({ 
            districts: [district],
            dataDir: this.dataDir
        });
        
        return simCrawler.generateSimulatedData(district);
    }

    calculateAdaptiveDelay(district) {
        const stats = this.antiBot.getStats();
        const districtStat = this.districtStats.get(district);
        
        // Base delay
        let delay = this.antiBot.getRandomDelay();
        
        // Increase delay if previous district had failures
        if (districtStat && !districtStat.success) {
            delay *= 1.5;
        }
        
        // Increase delay if overall success rate is low
        if (stats.successRate < 0.3) {
            delay *= 2;
        }
        
        return delay;
    }

    calculatePageDelay(district, page, housesCollected) {
        const baseDelay = this.antiBot.getRandomDelay();
        
        // Reduce delay for later pages if we're collecting data successfully
        if (housesCollected > 0 && page > 1) {
            return baseDelay * 0.7;
        }
        
        return baseDelay;
    }

    showProgressStats(currentDistrict) {
        const stats = this.antiBot.getStats();
        const districtStat = this.districtStats.get(currentDistrict);
        
        if (districtStat && districtStat.housesCollected > 0) {
            console.log(`   📊 Progress: ${this.collectedHouses.length} total houses, ${stats.successRate.toFixed(1)}% success rate`);
        }
    }

    generateFinalResults(duration) {
        return {
            houses: this.collectedHouses,
            metadata: {
                crawlDate: new Date().toISOString(),
                districts: this.districts,
                successfulDistricts: Array.from(this.successfulDistricts),
                failedDistricts: Array.from(this.failedDistricts),
                totalHouses: this.collectedHouses.length,
                crawlDuration: `${duration}s`,
                antiBotStats: this.antiBot.getStats(),
                districtStats: Object.fromEntries(this.districtStats),
                version: 'improved-protected-v3'
            }
        };
    }

    displayFinalResults(results) {
        const metadata = results.metadata;
        const stats = metadata.antiBotStats;
        
        console.log(`\n🏁 Improved crawl completed in ${metadata.crawlDuration}`);
        console.log(`📊 Total houses collected: ${results.houses.length}`);
        console.log(`✅ Successful districts: ${metadata.successfulDistricts.length}`);
        console.log(`❌ Failed districts: ${metadata.failedDistricts.length}`);
        console.log(`📈 Overall success rate: ${((metadata.successfulDistricts.length / metadata.districts.length) * 100).toFixed(1)}%`);
        
        // District breakdown
        console.log(`\n🏘️  District Performance:`);
        for (const [district, stat] of this.districtStats) {
            const status = stat.success ? '✅' : '❌';
            const houses = stat.housesCollected;
            const duration = stat.duration;
            const fallback = stat.fallback ? ' (simulated)' : '';
            console.log(`   ${status} ${district}: ${houses} houses in ${duration}s${fallback}`);
        }
        
        // Anti-Bot performance
        console.log(`\n🛡️  Anti-Bot Performance:`);
        console.log(`   • Requests made: ${stats.requestCount}`);
        console.log(`   • Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`   • Recent success rate: ${(stats.recentSuccessRate * 100).toFixed(1)}%`);
        console.log(`   • Strategy used: ${stats.strategy.toUpperCase()}`);
        console.log(`   • Consecutive failures: ${stats.consecutiveFailures}`);
        console.log(`   • Active sessions: ${stats.activeSessions}`);
        
        // Data files
        console.log(`\n📁 Data Saved:`);
        console.log(`   • Main file: houses_improved_protected_*.json`);
        console.log(`   • District files: houses_[district]_improved_*.json`);
    }

    async saveResults() {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `houses_improved_protected_${timestamp}.json`;
        const filePath = path.join(this.dataDir, fileName);
        
        const dataToSave = {
            houses: this.collectedHouses,
            metadata: {
                crawlDate: new Date().toISOString(),
                districts: this.districts,
                successfulDistricts: Array.from(this.successfulDistricts),
                failedDistricts: Array.from(this.failedDistricts),
                districtStats: Object.fromEntries(this.districtStats),
                antiBotStats: this.antiBot.getStats()
            }
        };
        
        await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
        logger.info('Results saved', { filePath, houseCount: this.collectedHouses.length });
        
        // Also save individual district files
        for (const district of this.districts) {
            const districtHouses = this.collectedHouses.filter(house => house.district === district);
            if (districtHouses.length > 0) {
                const districtFileName = `houses_${district}_improved_${timestamp}.json`;
                const districtFilePath = path.join(this.dataDir, districtFileName);
                await fs.writeFile(districtFilePath, JSON.stringify(districtHouses, null, 2));
            }
        }
    }

    async close() {
        // Clean up resources
        this.antiBot.resetSession();
    }
}

module.exports = ImprovedProtectedCrawler;