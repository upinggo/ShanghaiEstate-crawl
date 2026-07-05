const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const AntiBotBypass = require('./antiBotBypass');

class BrowserLikeCrawler {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.districts = options.districts || ['xuhui'];
        this.delay = options.delay || 3000;
        this.maxPages = options.maxPages || 2;
        this.dataDir = options.dataDir || './data';
        
        // Initialize anti-bot bypass system
        this.antiBot = new AntiBotBypass({
            proxies: options.proxies || [],
            maxRetries: 5,
            delayRange: { min: 2000, max: 5000 },
            userAgentRotation: true
        });

        // Enhanced browser headers
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
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
            'Cache-Control': 'max-age=0'
        };

        this.sessionEstablished = false;
        this.failedDistricts = new Set();
        this.successfulDistricts = new Set();
    }

    async init() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            logger.info('Data directory ready', { path: this.dataDir });
            
            // Establish session with anti-bot measures
            if (!this.sessionEstablished) {
                await this.establishSession();
            }
        } catch (error) {
            logger.error('Initialization failed', { error: error.message });
        }
    }

    async establishSession() {
        try {
            logger.info('Establishing session with anti-bot bypass');
            console.log('🌐 Establishing secure connection to Lianjia...');
            
            // Visit homepage with anti-bot protection
            const homeResult = await this.antiBot.smartRequest(this.baseURL);
            logger.debug('Homepage visited successfully', { status: homeResult.status });
            
            // Visit some random pages to appear legitimate
            await this.antiBot.visitRandomPages(this.baseURL, 2);
            
            // Small delay to simulate human behavior
            await this.antiBot.sleep(1500);
            
            // Test district access
            const testResult = await this.antiBot.smartRequest(`${this.baseURL}/ershoufang/xuhui/`);
            logger.debug('Test district page accessed', { status: testResult.status });
            
            this.sessionEstablished = true;
            console.log('✅ Secure connection established');
            
        } catch (error) {
            logger.error('Session establishment failed', { error: error.message });
            console.log('⚠️  Session establishment failed, attempting fallback...');
            // Continue anyway - anti-bot system will handle retries
        }
    }

    async request(url) {
        try {
            logger.debug('Making protected request', { url });
            
            const result = await this.antiBot.smartRequest(url);
            
            logger.debug('Protected request successful', { 
                url, 
                status: result.status,
                contentLength: result.data.length 
            });
            
            return result.data;
            
        } catch (error) {
            logger.error('Protected request failed', { 
                url, 
                error: error.message 
            });
            throw error;
        }
    }

    async crawlDistrict(district) {
        logger.info('Starting district crawl with anti-bot protection', { district });
        console.log(`\n🚀 Crawling ${district} district (protected mode)...`);
        
        const allHouses = [];
        let currentPage = 1;

        try {
            // Get first page with anti-bot protection
            const firstPageUrl = `${this.baseURL}/ershoufang/${district}/`;
            const html = await this.request(firstPageUrl);
            const $ = cheerio.load(html);
            
            // Enhanced anti-bot detection
            const antiBotCheck = this.performAntiBotCheck($, html, district);
            if (antiBotCheck.blocked) {
                logger.warn('Strong anti-bot protection detected', { 
                    district, 
                    reason: antiBotCheck.reason 
                });
                console.log(`❌ Strong anti-bot protection for ${district}: ${antiBotCheck.reason}`);
                
                // Mark as failed and return empty results
                this.failedDistricts.add(district);
                return [];
            }

            // Try to find listings
            const houses = this.extractHouses($, district, 1);
            logger.info('First page results', { district, houses: houses.length });
            console.log(`📄 Page 1: ${houses.length} houses found`);
            
            if (houses.length === 0) {
                logger.warn('No houses found on first page', { district });
                console.log(`⚠️  No houses found on ${district} first page`);
                // Still continue to try additional pages
            }
            
            allHouses.push(...houses);

            // Get total pages if we found houses
            if (houses.length > 0 || true) { // Always try additional pages
                const totalPages = Math.min(this.maxPages, 3); // Conservative approach
                
                // Crawl additional pages with anti-bot protection
                for (let page = 2; page <= totalPages; page++) {
                    try {
                        // Random delay between pages
                        const pageDelay = 2000 + Math.random() * 3000;
                        await this.antiBot.sleep(pageDelay);
                        
                        const pageUrl = `${this.baseURL}/ershoufang/${district}/pg${page}/`;
                        const pageHtml = await this.request(pageUrl);
                        const page$ = cheerio.load(pageHtml);
                        
                        // Check for anti-bot on each page
                        const pageAntiBotCheck = this.performAntiBotCheck(page$, pageHtml, district, page);
                        if (pageAntiBotCheck.blocked) {
                            logger.warn('Anti-bot protection on page', { 
                                district, 
                                page, 
                                reason: pageAntiBotCheck.reason 
                            });
                            console.log(`❌ Anti-bot protection on page ${page} of ${district}`);
                            break; // Stop crawling this district
                        }
                        
                        const pageHouses = this.extractHouses(page$, district, page);
                        
                        logger.info('Page results', { district, page, houses: pageHouses.length });
                        console.log(`📄 Page ${page}: ${pageHouses.length} houses`);
                        
                        allHouses.push(...pageHouses);
                        
                    } catch (error) {
                        logger.error('Page crawl failed', { district, page, error: error.message });
                        console.log(`❌ Page ${page} failed: ${error.message}`);
                        // Continue with next page instead of breaking
                        continue;
                    }
                }
            }

            if (allHouses.length > 0) {
                this.successfulDistricts.add(district);
                logger.info('District completed successfully', { district, total: allHouses.length });
                console.log(`✅ ${district}: ${allHouses.length} houses total`);
            } else {
                this.failedDistricts.add(district);
                logger.warn('District completed with no data', { district });
                console.log(`⚠️  ${district}: No houses found`);
            }

        } catch (error) {
            logger.error('District crawl failed', { district, error: error.message });
            console.log(`❌ ${district} failed: ${error.message}`);
            this.failedDistricts.add(district);
        }

        return allHouses;
    }

    performAntiBotCheck($, html, district, page = 1) {
        const result = {
            blocked: false,
            reason: ''
        };

        // Check page title for anti-bot indicators
        const title = $('title').text().toLowerCase();
        const bodyText = $('body').text().toLowerCase();

        // Common anti-bot phrases
        const antiBotPhrases = [
            '验证码',
            '验证',
            'captcha',
            'security check',
            'access denied',
            'blocked',
            'rate limit exceeded',
            'please try again',
            'checking your browser',
            'just a moment',
            'enable javascript',
            '请稍后再试',
            '访问过于频繁'
        ];

        for (const phrase of antiBotPhrases) {
            if (title.includes(phrase) || bodyText.includes(phrase)) {
                result.blocked = true;
                result.reason = `Anti-bot phrase detected: ${phrase}`;
                return result;
            }
        }

        // Check for missing expected content
        const expectedElements = [
            '.sellListContent',
            '.listContent',
            '.house-list',
            '[class*="list"][class*="content"]'
        ];

        let foundExpectedContent = false;
        for (const selector of expectedElements) {
            if ($(selector).length > 0) {
                foundExpectedContent = true;
                break;
            }
        }

        if (!foundExpectedContent && page === 1) {
            result.blocked = true;
            result.reason = 'Missing expected page structure - likely blocked';
            return result;
        }

        // Check for unusual response characteristics
        if (html.length < 1000 && page === 1) {
            result.blocked = true;
            result.reason = 'Unusually short response - possible blocking';
            return result;
        }

        return result;
    }

    extractHouses($, district, page) {
        const houses = [];
        
        // Try multiple selectors for robustness
        const selectors = [
            '.sellListContent .clear .info',           // Primary selector
            '.listContent .listItem .info',            // Alternative
            '.house-list .item .info',                 // Another possibility
            '[class*="list"][class*="content"] .info'  // Generic pattern
        ];

        let foundSelector = null;
        let elements = [];

        // Find working selector
        for (const selector of selectors) {
            elements = $(selector);
            if (elements.length > 0) {
                foundSelector = selector;
                break;
            }
        }

        if (!foundSelector) {
            // Try direct house containers
            const containerSelectors = [
                '.sellListContent .clear',
                '.listContent .listItem',
                '.house-list .item'
            ];
            
            for (const selector of containerSelectors) {
                elements = $(selector);
                if (elements.length > 0) {
                    foundSelector = selector;
                    break;
                }
            }
        }

        if (elements.length === 0) {
            logger.debug('No house elements found', { district, page });
            return houses;
        }

        logger.debug('Found house elements', { 
            district, 
            page, 
            selector: foundSelector, 
            count: elements.length 
        });

        elements.each((index, element) => {
            try {
                const house = this.parseHouseElement($, element, district, page);
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

    parseHouseElement($, element, district, page) {
        const house = {
            district: district,
            page: page,
            timestamp: new Date().toISOString()
        };

        try {
            // Title and link
            const titleElement = $(element).find('.title a, .house-title a, h3 a').first();
            house.title = titleElement.text().trim();
            house.link = titleElement.attr('href');
            
            // Community and location
            const communityElement = $(element).find('.positionInfo a, .community-name, .resblock-name').first();
            house.community = communityElement.text().trim();
            
            const positionText = $(element).find('.positionInfo, .house-position').text().trim();
            const positionParts = positionText.split('-');
            house.area = positionParts[0]?.trim() || '';
            
            // Prices
            const totalPriceText = $(element).find('.totalPrice span, .price-total').first().text();
            house.totalPrice = this.extractPrice(totalPriceText);
            
            const unitPriceText = $(element).find('.unitPrice span, .price-unit').first().text();
            house.unitPrice = this.extractUnitPrice(unitPriceText);
            
            // House details
            const houseInfo = $(element).find('.houseInfo, .house-details').text().trim();
            const infoParts = houseInfo.split('|');
            
            if (infoParts.length >= 2) {
                house.layout = infoParts[1]?.trim() || '';
                house.square = this.extractNumber(infoParts[2]) || 0;
            }
            
            house.direction = $(element).find('.house-direction').text().trim() || '';
            house.decoration = $(element).find('.house-decoration').text().trim() || '';
            house.floor = $(element).find('.positionInfo').eq(1).text().trim() || '';
            house.year = this.extractNumber($(element).find('.positionInfo').eq(1).text()) || 0;

            // Validation
            if (house.title && house.totalPrice > 0) {
                return house;
            }

        } catch (error) {
            logger.debug('House element parsing failed', { error: error.message });
        }

        return null;
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
                version: 'browser-like-v2',
                userAgent: this.headers['User-Agent'],
                antiBotStats: this.antiBot.getStats()
            },
            houses: []
        };

        logger.info('Starting browser-like crawl with anti-bot protection', { 
            districts: this.districts.length,
            maxPages: this.maxPages
        });

        console.log('🤖 Starting protected Shanghai real estate crawl');
        console.log(`📍 Districts: ${this.districts.join(', ')}`);
        console.log(`🛡️  Anti-bot protection: ACTIVE`);

        for (const district of this.districts) {
            try {
                const houses = await this.crawlDistrict(district);
                allData.houses.push(...houses);
                
                if (houses.length > 0) {
                    await this.saveData(district, houses);
                }
                
            } catch (error) {
                logger.error('District failed', { district, error: error.message });
            }
            
            // Variable delay between districts
            const districtDelay = 3000 + Math.random() * 4000;
            await this.antiBot.sleep(districtDelay);
        }

        await this.saveFinalData(allData);
        await this.generateSummary(allData);

        // Log final statistics
        const stats = this.antiBot.getStats();
        logger.info('Crawl completed with anti-bot statistics', { 
            totalHouses: allData.houses.length,
            successfulDistricts: this.successfulDistricts.size,
            failedDistricts: this.failedDistricts.size,
            ...stats
        });
        
        console.log(`\n🎉 Protected crawl completed!`);
        console.log(`📈 Houses collected: ${allData.houses.length}`);
        console.log(`✅ Successful districts: ${this.successfulDistricts.size}`);
        console.log(`❌ Failed districts: ${this.failedDistricts.size}`);
        console.log(`📊 Anti-bot requests: ${stats.requestCount}`);

        return allData;
    }

    async saveData(district, houses) {
        try {
            const filename = `houses_${district}_${new Date().toISOString().split('T')[0]}_protected.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify({
                district,
                date: new Date().toISOString(),
                count: houses.length,
                houses,
                crawler: 'browser-like-v2-protected'
            }, null, 2));
            
            logger.info('Saved district data', { district, count: houses.length });
            console.log(`💾 ${district}: ${houses.length} houses saved`);
        } catch (error) {
            logger.error('Save failed', { district, error: error.message });
        }
    }

    async saveFinalData(data) {
        try {
            const filename = `shanghai_protected_crawl_${new Date().toISOString().split('T')[0]}.json`;
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
                antiBotStats: data.metadata.antiBotStats,
                successfulDistricts: Array.from(this.successfulDistricts),
                failedDistricts: Array.from(this.failedDistricts)
            };

            data.houses.forEach(house => {
                if (!summary.districts[house.district]) {
                    summary.districts[house.district] = { count: 0, totalPrice: 0 };
                }
                summary.districts[house.district].count++;
                summary.districts[house.district].totalPrice += house.totalPrice || 0;
            });

            Object.keys(summary.districts).forEach(district => {
                const stats = summary.districts[district];
                summary.districts[district] = {
                    count: stats.count,
                    avgPrice: stats.count > 0 ? Math.round(stats.totalPrice / stats.count) : 0
                };
            });

            const summaryFile = path.join(this.dataDir, `protected_summary_${new Date().toISOString().split('T')[0]}.json`);
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            
            logger.info('Generated summary', { districts: Object.keys(summary.districts).length });
            console.log(`📊 Summary generated`);

        } catch (error) {
            logger.error('Summary generation failed', { error: error.message });
        }
    }
}

module.exports = BrowserLikeCrawler;