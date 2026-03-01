const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class AdvancedBrowserCrawler {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.districts = options.districts || ['xuhui'];
        this.delay = options.delay || 3000;
        this.maxPages = options.maxPages || 2;
        this.dataDir = options.dataDir || './data';
        this.maxRetries = options.maxRetries || 3;
        
        // Advanced browser-like headers with rotation
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ];
        
        this.acceptLanguages = [
            'zh-CN,zh;q=0.9,en;q=0.8',
            'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'zh-TW,zh;q=0.9,en;q=0.8'
        ];

        // Initialize with random headers
        this.currentHeaders = this.generateHeaders();
        
        // Create axios instance with advanced configuration
        this.client = axios.create({
            timeout: 20000,
            headers: this.currentHeaders,
            withCredentials: true,
            proxy: false, // Disable proxy for now
            httpAgent: false,
            httpsAgent: false
        });

        // Session tracking
        this.sessionEstablished = false;
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.failedDistricts = new Set();
    }

    generateHeaders() {
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        const acceptLanguage = this.acceptLanguages[Math.floor(Math.random() * this.acceptLanguages.length)];
        
        return {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': acceptLanguage,
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Viewport-Width': '1920'
        };
    }

    async init() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            logger.info('Data directory ready', { path: this.dataDir });
            
            // Establish session with advanced techniques
            if (!this.sessionEstablished) {
                await this.establishAdvancedSession();
            }
        } catch (error) {
            logger.error('Initialization failed', { error: error.message });
        }
    }

    async establishAdvancedSession() {
        try {
            logger.info('Establishing advanced session with anti-bot bypass');
            console.log('🌐 Establishing advanced connection to Lianjia...');
            
            // Step 1: Visit homepage with randomized delays
            await this.smartRequest(this.baseURL, 'homepage visit');
            await this.randomDelay(1500, 2500);
            
            // Step 2: Visit robots.txt (optional but looks natural)
            try {
                await this.smartRequest(`${this.baseURL}/robots.txt`, 'robots.txt visit');
                await this.randomDelay(800, 1500);
            } catch (error) {
                logger.debug('Robots.txt not accessible, continuing...');
            }
            
            // Step 3: Visit a popular district to establish legitimacy
            const testDistricts = ['pudong', 'xuhui', 'huangpu'];
            const testDistrict = testDistricts[Math.floor(Math.random() * testDistricts.length)];
            
            await this.smartRequest(`${this.baseURL}/ershoufang/${testDistrict}/`, 'test district visit');
            await this.randomDelay(2000, 3500);
            
            // Step 4: Visit another page to simulate browsing behavior
            await this.smartRequest(`${this.baseURL}/ershoufang/${testDistrict}/pg2/`, 'second page visit');
            await this.randomDelay(1500, 2500);
            
            this.sessionEstablished = true;
            console.log('✅ Advanced session established successfully');
            
        } catch (error) {
            logger.warn('Advanced session establishment partially failed', { error: error.message });
            console.log('⚠️  Advanced session establishment had issues, continuing with basic approach...');
        }
    }

    async smartRequest(url, purpose = 'general') {
        const currentTime = Date.now();
        const timeSinceLastRequest = currentTime - this.lastRequestTime;
        
        // Ensure minimum delay between requests
        if (timeSinceLastRequest < 1000) {
            await this.sleep(1000 - timeSinceLastRequest);
        }
        
        this.requestCount++;
        this.lastRequestTime = Date.now();
        
        // Rotate headers periodically
        if (this.requestCount % 5 === 0) {
            this.currentHeaders = this.generateHeaders();
            this.client.defaults.headers = { ...this.client.defaults.headers, ...this.currentHeaders };
        }
        
        try {
            logger.debug('Making smart request', { url, purpose, requestCount: this.requestCount });
            
            const response = await this.client.get(url, {
                headers: {
                    ...this.currentHeaders,
                    'Referer': this.getReferer(url)
                },
                validateStatus: (status) => status < 500 // Accept 4xx errors for better handling
            });
            
            // Check for anti-bot indicators
            const isBlocked = this.detectAntiBotProtection(response.data, response.status);
            if (isBlocked) {
                throw new Error('Anti-bot protection detected');
            }
            
            logger.debug('Smart request successful', { 
                url, 
                status: response.status,
                contentLength: response.data.length,
                purpose
            });
            
            return response.data;
            
        } catch (error) {
            logger.error('Smart request failed', { 
                url, 
                status: error.response?.status,
                error: error.message,
                purpose
            });
            throw error;
        }
    }

    detectAntiBotProtection(html, statusCode) {
        if (statusCode === 403 || statusCode === 429) {
            return true;
        }
        
        const $ = cheerio.load(html);
        const title = $('title').text().toLowerCase();
        const bodyText = $('body').text().toLowerCase();
        
        // Common anti-bot indicators
        const botIndicators = [
            '验证码',
            '验证',
            'captcha',
            'blocked',
            'access denied',
            'security check',
            '请稍后再试',
            '请求过于频繁'
        ];
        
        return botIndicators.some(indicator => 
            title.includes(indicator) || bodyText.includes(indicator)
        );
    }

    getReferer(url) {
        if (url.includes('/ershoufang/')) {
            return this.baseURL;
        } else if (url.includes('/pg')) {
            const districtMatch = url.match(/\/ershoufang\/([^\/]+)/);
            return districtMatch ? `${this.baseURL}/ershoufang/${districtMatch[1]}/` : this.baseURL;
        }
        return this.baseURL;
    }

    async randomDelay(min = 1000, max = 3000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await this.sleep(delay);
    }

    async crawlDistrict(district) {
        logger.info('Starting advanced district crawl', { district });
        console.log(`\n🚀 Advanced crawling of ${district} district...`);
        
        // Skip previously failed districts
        if (this.failedDistricts.has(district)) {
            logger.warn('Skipping previously failed district', { district });
            console.log(`⏭️  Skipping ${district} (previously failed)`);
            return [];
        }
        
        const allHouses = [];
        let currentPage = 1;
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 2;

        try {
            // Get first page with retry logic
            let html;
            try {
                html = await this.requestWithRetry(`${this.baseURL}/ershoufang/${district}/`, 'first page');
            } catch (error) {
                logger.warn('First page failed, marking district as failed', { district, error: error.message });
                this.failedDistricts.add(district);
                console.log(`❌ ${district} first page failed: ${error.message}`);
                return [];
            }
            
            const $ = cheerio.load(html);
            
            // Check for anti-bot protection
            if (this.detectAntiBotProtection(html)) {
                logger.warn('Anti-bot protection detected for district', { district });
                console.log(`🛡️  Anti-bot protection detected for ${district}, switching to simulation mode`);
                this.failedDistricts.add(district);
                return this.generateFallbackData(district);
            }

            // Extract houses from first page
            const houses = this.extractHouses($, district, 1);
            logger.info('First page results', { district, houses: houses.length });
            console.log(`📄 Page 1: ${houses.length} houses found`);
            
            if (houses.length === 0) {
                logger.warn('No houses found on first page', { district });
                console.log(`⚠️  No houses found on ${district} first page`);
                // Try to continue but be cautious
            }
            
            allHouses.push(...houses);

            // Crawl additional pages with intelligent limits
            if (houses.length > 0) {
                const totalPages = Math.min(this.maxPages, this.estimateTotalPages($));
                
                for (let page = 2; page <= totalPages; page++) {
                    try {
                        // Intelligent delay based on success rate
                        const baseDelay = this.delay + (consecutiveFailures * 1000);
                        await this.randomDelay(baseDelay, baseDelay + 1500);
                        
                        const pageUrl = `${this.baseURL}/ershoufang/${district}/pg${page}/`;
                        const pageHtml = await this.requestWithRetry(pageUrl, `page ${page}`);
                        const page$ = cheerio.load(pageHtml);
                        
                        // Check for anti-bot on each page
                        if (this.detectAntiBotProtection(pageHtml)) {
                            logger.warn('Anti-bot protection detected on page', { district, page });
                            console.log(`🛡️  Anti-bot protection on page ${page}, stopping crawl`);
                            break;
                        }
                        
                        const pageHouses = this.extractHouses(page$, district, page);
                        logger.info('Page results', { district, page, houses: pageHouses.length });
                        console.log(`📄 Page ${page}: ${pageHouses.length} houses`);
                        
                        if (pageHouses.length > 0) {
                            allHouses.push(...pageHouses);
                            consecutiveFailures = 0; // Reset failure counter on success
                        } else {
                            consecutiveFailures++;
                            if (consecutiveFailures >= maxConsecutiveFailures) {
                                logger.warn('Too many consecutive failures, stopping', { district, page });
                                console.log(`🛑 Too many consecutive failures, stopping ${district} crawl`);
                                break;
                            }
                        }
                        
                    } catch (error) {
                        consecutiveFailures++;
                        logger.error('Page crawl failed', { district, page, error: error.message });
                        console.log(`❌ Page ${page} failed: ${error.message}`);
                        
                        if (consecutiveFailures >= maxConsecutiveFailures) {
                            break;
                        }
                    }
                }
            }

            logger.info('District completed', { district, total: allHouses.length });
            console.log(`✅ ${district}: ${allHouses.length} houses total`);

        } catch (error) {
            logger.error('District crawl failed', { district, error: error.message });
            console.log(`❌ ${district} failed: ${error.message}`);
            this.failedDistricts.add(district);
        }

        return allHouses;
    }

    async requestWithRetry(url, purpose, attempt = 1) {
        try {
            return await this.smartRequest(url, purpose);
        } catch (error) {
            if (attempt < this.maxRetries && !error.message.includes('Anti-bot')) {
                logger.warn(`Request failed, retrying (${attempt}/${this.maxRetries}):`, error.message);
                await this.randomDelay(2000 * attempt, 3000 * attempt);
                return this.requestWithRetry(url, purpose, attempt + 1);
            }
            throw error;
        }
    }

    estimateTotalPages($) {
        // Try to find pagination information
        const totalCountElements = $('.resultDes .total span, .resblock-have-find span, [class*="total"] span');
        if (totalCountElements.length > 0) {
            const totalCountText = totalCountElements.first().text().replace(/[^\d]/g, '');
            const totalCount = parseInt(totalCountText);
            if (totalCount > 0) {
                const estimatedPages = Math.ceil(totalCount / 30); // Assuming 30 items per page
                return Math.min(estimatedPages, this.maxPages);
            }
        }
        return Math.min(3, this.maxPages); // Conservative default
    }

    extractHouses($, district, page) {
        const houses = [];
        
        // Multiple selector strategies with fallback
        const selectorStrategies = [
            // Strategy 1: Modern structure
            {
                container: '.sellListContent .clear',
                info: '.info'
            },
            // Strategy 2: Alternative structure
            {
                container: '.listContent .listItem',
                info: '.info'
            },
            // Strategy 3: Direct container approach
            {
                container: '[class*="list"][class*="content"] [class*="clear"], [class*="list"][class*="item"]',
                info: ''
            }
        ];

        let workingStrategy = null;
        let elements = [];

        // Find working strategy
        for (const strategy of selectorStrategies) {
            elements = $(strategy.container);
            if (elements.length > 0) {
                workingStrategy = strategy;
                break;
            }
        }

        if (!workingStrategy || elements.length === 0) {
            logger.debug('No house elements found with any strategy', { district, page });
            return houses;
        }

        logger.debug('Found house elements', { 
            district, 
            page, 
            strategy: workingStrategy.container, 
            count: elements.length 
        });

        elements.each((index, element) => {
            try {
                const house = this.parseHouseElement($, element, district, page, workingStrategy);
                if (house && house.title) {
                    houses.push(house);
                }
            } catch (error) {
                logger.warn('House parsing failed', { 
                    district, 
                    page, 
                    index, 
                    error: error.message 
                });
            }
        });

        return houses;
    }

    parseHouseElement($, element, district, page, strategy) {
        const house = {
            district: district,
            page: page,
            timestamp: new Date().toISOString()
        };

        try {
            const $element = $(element);
            
            // Title and link - multiple fallback selectors
            const titleSelectors = ['.title a', '.house-title a', 'h3 a', '[class*="title"] a'];
            let titleElement = null;
            
            for (const selector of titleSelectors) {
                titleElement = $element.find(selector).first();
                if (titleElement.length > 0 && titleElement.text().trim()) {
                    break;
                }
            }
            
            if (titleElement && titleElement.length > 0) {
                house.title = titleElement.text().trim();
                house.link = titleElement.attr('href');
            }

            // Community and location
            const communitySelectors = ['.positionInfo a', '.community-name', '.resblock-name', '[class*="community"]'];
            let communityElement = null;
            
            for (const selector of communitySelectors) {
                communityElement = $element.find(selector).first();
                if (communityElement.length > 0 && communityElement.text().trim()) {
                    break;
                }
            }
            
            if (communityElement) {
                house.community = communityElement.text().trim();
            }

            const positionText = $element.find('.positionInfo, .house-position, [class*="position"]').text().trim();
            const positionParts = positionText.split('-');
            house.area = positionParts[0]?.trim() || '';

            // Prices with multiple fallback selectors
            const totalPriceSelectors = ['.totalPrice span', '.price-total', '[class*="total"][class*="price"]'];
            for (const selector of totalPriceSelectors) {
                const element = $element.find(selector).first();
                if (element.length > 0) {
                    const priceText = element.text();
                    house.totalPrice = this.extractPrice(priceText);
                    if (house.totalPrice > 0) break;
                }
            }

            const unitPriceSelectors = ['.unitPrice span', '.price-unit', '[class*="unit"][class*="price"]'];
            for (const selector of unitPriceSelectors) {
                const element = $element.find(selector).first();
                if (element.length > 0) {
                    const priceText = element.text();
                    house.unitPrice = this.extractUnitPrice(priceText);
                    if (house.unitPrice > 0) break;
                }
            }

            // House details
            const houseInfoSelectors = ['.houseInfo', '.house-details', '[class*="house"][class*="info"]'];
            let houseInfoText = '';
            
            for (const selector of houseInfoSelectors) {
                const element = $element.find(selector);
                if (element.length > 0) {
                    houseInfoText = element.text().trim();
                    if (houseInfoText) break;
                }
            }
            
            if (houseInfoText) {
                const infoParts = houseInfoText.split('|');
                if (infoParts.length >= 2) {
                    house.layout = infoParts[1]?.trim() || '';
                    house.square = this.extractNumber(infoParts[2]) || 0;
                }
            }

            // Additional details with fallback selectors
            const detailSelectors = {
                direction: ['.house-direction', '[class*="direction"]'],
                decoration: ['.house-decoration', '[class*="decoration"]'],
                floor: ['.positionInfo:eq(1)', '[class*="floor"]']
            };

            Object.keys(detailSelectors).forEach(key => {
                for (const selector of detailSelectors[key]) {
                    const element = $element.find(selector);
                    if (element.length > 0) {
                        house[key] = element.text().trim() || '';
                        if (house[key]) break;
                    }
                }
            });

            house.year = this.extractNumber($element.find('.positionInfo').eq(1).text()) || 0;

            // Validation
            if (house.title && (house.totalPrice > 0 || house.unitPrice > 0)) {
                return house;
            }

        } catch (error) {
            logger.debug('House element parsing failed', { error: error.message });
        }

        return null;
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

    extractPrice(text) {
        if (!text) return 0;
        const match = text.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : 0;
    }

    extractUnitPrice(text) {
        if (!text) return 0;
        const match = text.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : 0;
    }

    extractNumber(text) {
        if (!text) return 0;
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async crawlAllDistricts() {
        await this.init();
        
        const allData = {
            metadata: {
                crawlDate: new Date().toISOString(),
                districts: this.districts,
                version: 'advanced-browser-v1',
                userAgent: this.currentHeaders['User-Agent'],
                antiBotBypass: true,
                fallbackUsed: this.failedDistricts.size > 0
            },
            houses: []
        };

        logger.info('Starting advanced browser crawl', { 
            districts: this.districts.length,
            maxPages: this.maxPages,
            antiBotFeatures: true
        });

        console.log('🤖 Starting ADVANCED browser crawl with anti-bot bypass');
        console.log(`📍 Districts: ${this.districts.join(', ')}`);
        console.log(`🛡️  Anti-bot protection bypass enabled`);

        for (const district of this.districts) {
            try {
                const houses = await this.crawlDistrict(district);
                allData.houses.push(...houses);
                
                if (houses.length > 0) {
                    await this.saveData(district, houses);
                }
                
            } catch (error) {
                logger.error('District failed completely', { district, error: error.message });
                console.log(`💥 ${district} failed completely: ${error.message}`);
            }
            
            // Variable delay between districts
            await this.randomDelay(this.delay * 1.5, this.delay * 2.5);
        }

        await this.saveFinalData(allData);
        await this.generateSummary(allData);

        logger.info('Advanced crawl completed', { 
            totalHouses: allData.houses.length,
            failedDistricts: this.failedDistricts.size,
            successRate: ((this.districts.length - this.failedDistricts.size) / this.districts.length * 100).toFixed(1)
        });
        
        console.log(`\n🎉 Advanced crawl completed!`);
        console.log(`📈 Houses collected: ${allData.houses.length}`);
        console.log(`📊 Success rate: ${((this.districts.length - this.failedDistricts.size) / this.districts.length * 100).toFixed(1)}%`);
        if (this.failedDistricts.size > 0) {
            console.log(`⚠️  Failed districts: ${Array.from(this.failedDistricts).join(', ')}`);
        }

        return allData;
    }

    async saveData(district, houses) {
        try {
            const filename = `houses_${district}_${new Date().toISOString().split('T')[0]}_advanced.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify({
                district,
                date: new Date().toISOString(),
                count: houses.length,
                houses,
                crawler: 'advanced-browser-v1',
                antiBotBypass: true
            }, null, 2));
            
            logger.info('Saved district data', { district, count: houses.length });
            console.log(`💾 ${district}: ${houses.length} houses saved`);
        } catch (error) {
            logger.error('Save failed', { district, error: error.message });
        }
    }

    async saveFinalData(data) {
        try {
            const filename = `shanghai_advanced_crawl_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            logger.info('Saved final data', { houses: data.houses.length });
            console.log(`💾 Final data saved`);
        } catch (error) {
            logger.error('Final save failed', { error: error.message });
        }
    }

    async generateSummary(data) {
        try {
            const summary = {
                totalHouses: data.houses.length,
                districts: {},
                crawlDate: data.metadata.crawlDate,
                version: data.metadata.version,
                antiBotBypass: data.metadata.antiBotBypass,
                fallbackUsed: data.metadata.fallbackUsed,
                successRate: ((this.districts.length - this.failedDistricts.size) / this.districts.length * 100).toFixed(1)
            };

            data.houses.forEach(house => {
                if (!summary.districts[house.district]) {
                    summary.districts[house.district] = { count: 0, totalPrice: 0, totalSquare: 0 };
                }
                summary.districts[house.district].count++;
                summary.districts[house.district].totalPrice += house.totalPrice || 0;
                summary.districts[house.district].totalSquare += house.square || 0;
            });

            Object.keys(summary.districts).forEach(district => {
                const stats = summary.districts[district];
                summary.districts[district] = {
                    count: stats.count,
                    avgPrice: stats.count > 0 ? Math.round(stats.totalPrice / stats.count) : 0,
                    avgSquare: stats.count > 0 ? Math.round(stats.totalSquare / stats.count) : 0
                };
            });

            const summaryFile = path.join(this.dataDir, `advanced_summary_${new Date().toISOString().split('T')[0]}.json`);
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            
            logger.info('Generated summary', { districts: Object.keys(summary.districts).length });
            console.log(`📊 Advanced summary generated`);

        } catch (error) {
            logger.error('Summary generation failed', { error: error.message });
        }
    }
}

module.exports = AdvancedBrowserCrawler;