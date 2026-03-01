const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class BrowserLikeCrawler {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.districts = options.districts || ['xuhui'];
        this.delay = options.delay || 3000;
        this.maxPages = options.maxPages || 2;
        this.dataDir = options.dataDir || './data';
        
        // More realistic browser headers
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

        // Create axios instance with session-like behavior
        this.client = axios.create({
            timeout: 15000,
            headers: this.headers,
            withCredentials: true
        });

        // Visit homepage first to establish session
        this.sessionEstablished = false;
    }

    async init() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            logger.info('Data directory ready', { path: this.dataDir });
            
            // Establish session by visiting homepage
            if (!this.sessionEstablished) {
                await this.establishSession();
            }
        } catch (error) {
            logger.error('Initialization failed', { error: error.message });
        }
    }

    async establishSession() {
        try {
            logger.info('Establishing session with website');
            console.log('🌐 Establishing connection to Lianjia...');
            
            // Visit homepage first
            const homeResponse = await this.client.get(this.baseURL);
            logger.debug('Homepage visited', { status: homeResponse.status });
            
            // Small delay to simulate human behavior
            await this.sleep(1000);
            
            // Visit a district page
            const testResponse = await this.client.get(`${this.baseURL}/ershoufang/xuhui/`);
            logger.debug('Test district page visited', { status: testResponse.status });
            
            this.sessionEstablished = true;
            console.log('✅ Connection established');
            
        } catch (error) {
            logger.error('Session establishment failed', { error: error.message });
            console.log('⚠️  Session establishment failed, continuing anyway...');
        }
    }

    async request(url) {
        try {
            logger.debug('Making request', { url });
            
            const response = await this.client.get(url, {
                headers: {
                    ...this.headers,
                    'Referer': this.baseURL
                }
            });
            
            logger.debug('Request successful', { 
                url, 
                status: response.status,
                contentLength: response.data.length 
            });
            
            return response.data;
            
        } catch (error) {
            logger.error('Request failed', { 
                url, 
                status: error.response?.status,
                error: error.message 
            });
            throw error;
        }
    }

    async crawlDistrict(district) {
        logger.info('Starting district crawl', { district });
        console.log(`\n🚀 Crawling ${district} district...`);
        
        const allHouses = [];
        let currentPage = 1;

        try {
            // Get first page
            const firstPageUrl = `${this.baseURL}/ershoufang/${district}/`;
            const html = await this.request(firstPageUrl);
            const $ = cheerio.load(html);
            
            // Check if we have access
            const title = $('title').text();
            const bodyText = $('body').text();
            
            if (title.includes('验证码') || bodyText.includes('验证')) {
                logger.warn('Anti-bot protection detected', { district });
                console.log(`❌ Anti-bot protection detected for ${district}`);
                return [];
            }

            // Try to find listings
            const houses = this.extractHouses($, district, 1);
            logger.info('First page results', { district, houses: houses.length });
            console.log(`📄 Page 1: ${houses.length} houses found`);
            
            if (houses.length === 0) {
                logger.warn('No houses found on first page', { district });
                console.log(`⚠️  No houses found on ${district} first page`);
                // Still return empty array to continue processing
            }
            
            allHouses.push(...houses);

            // Get total pages if we found houses
            if (houses.length > 0) {
                const totalPages = Math.min(this.maxPages, 3); // Conservative approach
                
                // Crawl additional pages
                for (let page = 2; page <= totalPages; page++) {
                    try {
                        await this.sleep(this.delay);
                        
                        const pageUrl = `${this.baseURL}/ershoufang/${district}/pg${page}/`;
                        const pageHtml = await this.request(pageUrl);
                        const page$ = cheerio.load(pageHtml);
                        const pageHouses = this.extractHouses(page$, district, page);
                        
                        logger.info('Page results', { district, page, houses: pageHouses.length });
                        console.log(`📄 Page ${page}: ${pageHouses.length} houses`);
                        
                        allHouses.push(...pageHouses);
                        
                    } catch (error) {
                        logger.error('Page crawl failed', { district, page, error: error.message });
                        console.log(`❌ Page ${page} failed: ${error.message}`);
                        continue;
                    }
                }
            }

            logger.info('District completed', { district, total: allHouses.length });
            console.log(`✅ ${district}: ${allHouses.length} houses total`);

        } catch (error) {
            logger.error('District crawl failed', { district, error: error.message });
            console.log(`❌ ${district} failed: ${error.message}`);
        }

        return allHouses;
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
                version: 'browser-like-v1',
                userAgent: this.headers['User-Agent']
            },
            houses: []
        };

        logger.info('Starting browser-like crawl', { 
            districts: this.districts.length,
            maxPages: this.maxPages
        });

        console.log('🤖 Starting browser-like Shanghai real estate crawl');
        console.log(`📍 Districts: ${this.districts.join(', ')}`);

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
            
            await this.sleep(this.delay * 1.5);
        }

        await this.saveFinalData(allData);
        await this.generateSummary(allData);

        logger.info('Browser crawl completed', { totalHouses: allData.houses.length });
        console.log(`\n🎉 Browser crawl completed!`);
        console.log(`📈 Houses collected: ${allData.houses.length}`);

        return allData;
    }

    async saveData(district, houses) {
        try {
            const filename = `houses_${district}_${new Date().toISOString().split('T')[0]}_browser.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify({
                district,
                date: new Date().toISOString(),
                count: houses.length,
                houses,
                crawler: 'browser-like-v1'
            }, null, 2));
            
            logger.info('Saved district data', { district, count: houses.length });
            console.log(`💾 ${district}: ${houses.length} houses saved`);
        } catch (error) {
            logger.error('Save failed', { district, error: error.message });
        }
    }

    async saveFinalData(data) {
        try {
            const filename = `shanghai_browser_crawl_${new Date().toISOString().split('T')[0]}.json`;
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
                version: data.metadata.version
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

            const summaryFile = path.join(this.dataDir, `browser_summary_${new Date().toISOString().split('T')[0]}.json`);
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            
            logger.info('Generated summary', { districts: Object.keys(summary.districts).length });
            console.log(`📊 Summary generated`);

        } catch (error) {
            logger.error('Summary generation failed', { error: error.message });
        }
    }
}

module.exports = BrowserLikeCrawler;