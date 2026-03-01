const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class EnhancedLianjiaCrawler {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.districts = options.districts || ['xuhui'];
        this.delay = options.delay || 2000;
        this.maxPages = options.maxPages || 3;
        this.dataDir = options.dataDir || './data';
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.retryAttempts = 3;
        this.timeout = 10000;
    }

    async init() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            logger.info('Data directory ready', { path: this.dataDir });
        } catch (error) {
            logger.error('Failed to create data directory', { error: error.message });
        }
    }

    async requestWithRetry(url, attempt = 1) {
        try {
            logger.debug(`Requesting URL (attempt ${attempt}): ${url}`);
            return await this.makeRequest(url);
        } catch (error) {
            if (attempt < this.retryAttempts) {
                logger.warn(`Request failed, retrying (${attempt}/${this.retryAttempts}):`, error.message);
                await this.sleep(2000 * attempt); // Exponential backoff
                return this.requestWithRetry(url, attempt + 1);
            }
            throw error;
        }
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, this.timeout);

            const options = {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none'
                }
            };

            const req = https.get(url, options, (res) => {
                clearTimeout(timeoutId);
                
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }

                let data = '';
                res.setEncoding('utf8');
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve(data);
                });
            });

            req.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });

            req.setTimeout(this.timeout, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    detectWebsiteStructure($) {
        // Try different selectors for various website structures
        const selectors = [
            '.sellListContent .clear',      // Original structure
            '.listContent . listItem',      // Alternative structure
            '.house-list .item',            // Another possible structure
            '[class*="list"][class*="item"]' // Generic pattern
        ];

        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                logger.info('Detected website structure', { selector, count: elements.length });
                return selector;
            }
        }

        // Fallback to body content check
        const bodyText = $('body').text();
        if (bodyText.includes('链家') || bodyText.includes('lianjia')) {
            logger.warn('Website detected but no listings found - possibly anti-bot protection');
            return null;
        }

        throw new Error('Not a Lianjia website or structure changed');
    }

    parseHouseItem($, element, district, pageNum) {
        try {
            const house = {
                district: district,
                page: pageNum,
                timestamp: new Date().toISOString()
            };

            // Multiple selector strategies for robustness
            house.title = this.getText($, element, ['.title a', '.house-title a', 'h3 a']);
            house.community = this.getText($, element, ['.positionInfo a:first', '.community-name', '.resblock-name']);
            house.totalPrice = this.getNumber($, element, ['.totalPrice span', '.price-total']);
            house.unitPrice = this.getNumber($, element, ['.unitPrice span', '.price-unit'], true);
            
            // Area information
            const positionText = this.getText($, element, ['.positionInfo', '.house-position']);
            const positionParts = positionText.split('-');
            house.area = positionParts[0]?.trim() || '';

            // House details
            const houseInfo = this.getText($, element, ['.houseInfo', '.house-details']);
            const infoParts = houseInfo.split('|');
            
            if (infoParts.length >= 2) {
                house.layout = infoParts[1]?.trim() || '';
                house.square = this.extractNumber(infoParts[2]) || 0;
            }

            house.direction = this.getText($, element, ['.house-direction']) || '';
            house.decoration = this.getText($, element, ['.house-decoration']) || '';
            house.floor = this.getText($, element, ['.positionInfo:eq(1)', '.floor-info']) || '';
            house.year = this.extractNumber(this.getText($, element, ['.positionInfo:eq(1)', '.year-built'])) || 0;

            // Validate essential fields
            if (house.title && house.totalPrice > 0) {
                return house;
            }

            logger.debug('House item validation failed', { title: !!house.title, price: house.totalPrice });
            return null;

        } catch (error) {
            logger.warn('Error parsing house item', { error: error.message });
            return null;
        }
    }

    getText($, element, selectors) {
        for (const selector of selectors) {
            try {
                const text = $(element).find(selector).first().text().trim();
                if (text) return text;
            } catch (error) {
                continue;
            }
        }
        return '';
    }

    getNumber($, element, selectors, clean = false) {
        const text = this.getText($, element, selectors);
        if (!text) return 0;
        
        const cleaned = clean ? text.replace(/[^\d]/g, '') : text;
        return parseFloat(cleaned) || 0;
    }

    extractNumber(text) {
        if (!text) return 0;
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }

    async getTotalCount(html) {
        const $ = cheerio.load(html);
        
        // Try multiple selectors for total count
        const selectors = [
            '.resultDes .total span',
            '.resblock-have-find span',
            '[class*="total"] span',
            'span:contains("共")'
        ];

        for (const selector of selectors) {
            try {
                const element = $(selector);
                if (element.length > 0) {
                    const text = element.text().replace(/[^\d]/g, '');
                    const count = parseInt(text);
                    if (count > 0) {
                        logger.debug('Total count found', { selector, count });
                        return count;
                    }
                }
            } catch (error) {
                continue;
            }
        }

        logger.warn('Could not determine total count, using default');
        return 300; // Default assumption
    }

    async crawlDistrict(district) {
        logger.info('Starting district crawl', { district });
        console.log(`\n🚀 Starting crawl for district: ${district}`);
        
        const allHouses = [];
        let currentPage = 1;

        try {
            // Test connection and get structure
            const testUrl = `${this.baseURL}/ershoufang/${district}/`;
            const html = await this.requestWithRetry(testUrl);
            const $ = cheerio.load(html);
            
            // Check if we're blocked
            if ($('title').text().includes('验证码') || $('body').text().includes('验证')) {
                logger.error('Blocked by anti-bot protection', { district });
                console.log(`❌ Blocked by anti-bot protection for ${district}`);
                return [];
            }

            const itemSelector = this.detectWebsiteStructure($);
            if (!itemSelector) {
                logger.warn('No listings found - website structure may have changed', { district });
                console.log(`⚠️  No listings found for ${district} - website may have changed`);
                return [];
            }

            const totalCount = await this.getTotalCount(html);
            const totalPages = Math.min(Math.ceil(totalCount / 30), this.maxPages);
            
            logger.info('District statistics', { district, totalCount, totalPages });
            console.log(`📊 Planning to crawl ${totalPages} pages (${totalCount} total listings)`);

            // Crawl pages
            while (currentPage <= totalPages) {
                try {
                    logger.debug('Crawling page', { district, page: currentPage });
                    console.log(`📄 Page ${currentPage}/${totalPages}`);
                    
                    const pageUrl = currentPage === 1 
                        ? `${this.baseURL}/ershoufang/${district}/`
                        : `${this.baseURL}/ershoufang/${district}/pg${currentPage}/`;
                    
                    const pageHtml = await this.requestWithRetry(pageUrl);
                    const pageHouses = this.parsePage(pageHtml, district, currentPage, itemSelector);
                    
                    logger.info('Page processed', { 
                        district, 
                        page: currentPage, 
                        houses: pageHouses.length 
                    });
                    
                    console.log(`🏠 Found ${pageHouses.length} houses`);
                    allHouses.push(...pageHouses);
                    
                    if (currentPage < totalPages) {
                        await this.sleep(this.delay);
                    }
                    
                    currentPage++;
                } catch (error) {
                    logger.error('Page crawl failed', { 
                        district, 
                        page: currentPage, 
                        error: error.message 
                    });
                    console.log(`❌ Failed to crawl page ${currentPage}: ${error.message}`);
                    currentPage++; // Continue with next page
                }
            }

            logger.info('District completed', { district, total: allHouses.length });
            console.log(`✅ Completed ${district}: ${allHouses.length} houses`);

        } catch (error) {
            logger.error('District crawl failed', { district, error: error.message });
            console.log(`❌ Failed ${district}: ${error.message}`);
        }

        return allHouses;
    }

    parsePage(html, district, pageNum, itemSelector) {
        const $ = cheerio.load(html);
        const houses = [];
        const items = $(itemSelector);

        logger.debug('Parsing page', { 
            district, 
            page: pageNum, 
            itemsFound: items.length,
            selector: itemSelector 
        });

        items.each((index, element) => {
            const house = this.parseHouseItem($, element, district, pageNum);
            if (house) {
                houses.push(house);
            }
        });

        return houses;
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
                version: '2.1-enhanced',
                userAgent: this.userAgent
            },
            houses: []
        };

        logger.info('Starting enhanced crawl', { 
            districts: this.districts.length,
            maxPages: this.maxPages
        });

        console.log('🎯 Starting enhanced Shanghai real estate crawl');
        console.log(`📍 Districts: ${this.districts.join(', ')}`);

        for (const district of this.districts) {
            try {
                const houses = await this.crawlDistrict(district);
                allData.houses.push(...houses);
                
                if (houses.length > 0) {
                    await this.saveIntermediateData(district, houses);
                }
                
            } catch (error) {
                logger.error('District processing failed', { district, error: error.message });
            }
            
            await this.sleep(this.delay * 2);
        }

        await this.saveFinalData(allData);
        await this.generateSummary(allData);

        logger.info('Enhanced crawl completed', { totalHouses: allData.houses.length });
        console.log(`\n🎉 Enhanced crawl completed!`);
        console.log(`📈 Houses collected: ${allData.houses.length}`);

        return allData;
    }

    async saveIntermediateData(district, houses) {
        try {
            const filename = `houses_${district}_${new Date().toISOString().split('T')[0]}_enhanced.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify({
                district,
                date: new Date().toISOString(),
                count: houses.length,
                houses,
                crawlerVersion: '2.1-enhanced'
            }, null, 2));
            
            logger.info('Saved intermediate data', { district, count: houses.length });
            console.log(`💾 Saved ${houses.length} houses for ${district}`);
        } catch (error) {
            logger.error('Failed saving intermediate data', { district, error: error.message });
        }
    }

    async saveFinalData(data) {
        try {
            const filename = `shanghai_real_estate_enhanced_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            logger.info('Saved final data', { houses: data.houses.length, filepath });
            console.log(`💾 Final data: ${filepath}`);
        } catch (error) {
            logger.error('Failed saving final data', { error: error.message });
        }
    }

    async generateSummary(data) {
        try {
            const summary = {
                totalHouses: data.houses.length,
                crawlDate: data.metadata.crawlDate,
                version: data.metadata.version,
                districts: {},
                timestamp: new Date().toISOString()
            };

            // Group by district
            data.houses.forEach(house => {
                if (!summary.districts[house.district]) {
                    summary.districts[house.district] = {
                        count: 0,
                        totalPrice: 0,
                        totalSquare: 0
                    };
                }
                
                summary.districts[house.district].count++;
                summary.districts[house.district].totalPrice += house.totalPrice || 0;
                summary.districts[house.district].totalSquare += house.square || 0;
            });

            // Calculate averages
            Object.keys(summary.districts).forEach(district => {
                const stats = summary.districts[district];
                summary.districts[district] = {
                    count: stats.count,
                    avgPrice: stats.count > 0 ? Math.round(stats.totalPrice / stats.count) : 0,
                    avgSquare: stats.count > 0 ? Math.round(stats.totalSquare / stats.count) : 0
                };
            });

            const summaryFile = path.join(this.dataDir, `summary_enhanced_${new Date().toISOString().split('T')[0]}.json`);
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            
            logger.info('Generated summary', { file: summaryFile });
            console.log(`📊 Summary: ${summaryFile}`);

        } catch (error) {
            logger.error('Failed generating summary', { error: error.message });
        }
    }
}

module.exports = EnhancedLianjiaCrawler;