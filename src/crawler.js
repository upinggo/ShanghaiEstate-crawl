const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class LianjiaCrawler {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.districts = options.districts || [
            'xuhui', 'huangpu', 'jingan', 'changning', 
            'putuo', 'hongkou', 'yangpu', 'minhang',
            'baoshan', 'jiading', 'pudong', 'jinshan',
            'songjiang', 'qingpu', 'fengxian', 'chongming'
        ];
        this.delay = options.delay || 1000; // ms between requests
        this.maxPages = options.maxPages || 10;
        this.dataDir = options.dataDir || './data';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        
        logger.info('LianjiaCrawler initialized', {
            districts: this.districts.length,
            maxPages: this.maxPages,
            delay: this.delay
        });
    }

    async init() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            logger.info('Data directory created', { path: this.dataDir });
            console.log(`Data directory created: ${this.dataDir}`);
        } catch (error) {
            logger.error('Failed to create data directory', { error: error.message });
            console.error('Failed to create data directory:', error);
        }
    }

    async request(url) {
        logger.debug('Making HTTP request', { url });
        
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    logger.debug('HTTP request completed', { 
                        url, 
                        statusCode: res.statusCode,
                        dataLength: data.length 
                    });
                    resolve(data);
                });
            }).on('error', (err) => {
                logger.error('HTTP request failed', { url, error: err.message });
                reject(err);
            });
        });
    }

    parsePage(html, district, pageNum) {
        const $ = cheerio.load(html);
        const houses = [];
        
        $('.sellListContent .clear').each((index, element) => {
            try {
                const house = {};
                
                // Basic info
                house.title = $(element).find('.title a').text().trim();
                house.link = $(element).find('.title a').attr('href');
                house.community = $(element).find('.positionInfo a').first().text().trim();
                
                // Location
                const positionInfo = $(element).find('.positionInfo').text().trim();
                const positionParts = positionInfo.split('-');
                house.district = district;
                house.area = positionParts[0]?.trim() || '';
                
                // Price info
                house.totalPrice = parseFloat($(element).find('.totalPrice span').text()) || 0;
                house.unitPrice = parseFloat($(element).find('.unitPrice span').text().replace(/[^0-9]/g, '')) || 0;
                
                // House details
                const houseInfo = $(element).find('.houseInfo').text().trim();
                const infoParts = houseInfo.split('|');
                
                if (infoParts.length >= 5) {
                    house.layout = infoParts[1]?.trim() || '';
                    house.square = parseFloat(infoParts[2]?.replace(/[^0-9.]/g, '')) || 0;
                    house.direction = infoParts[3]?.trim() || '';
                    house.decoration = infoParts[4]?.trim() || '';
                }
                
                house.floor = $(element).find('.positionInfo').eq(1)?.text().trim() || '';
                house.year = parseInt($(element).find('.positionInfo').eq(1)?.text().match(/\d+/)?.[0]) || 0;
                
                house.page = pageNum;
                house.timestamp = new Date().toISOString();
                
                if (house.title && house.totalPrice > 0) {
                    houses.push(house);
                }
            } catch (error) {
                logger.warn('Error parsing house item', { 
                    district, 
                    pageNum, 
                    error: error.message 
                });
                console.warn('Error parsing house item:', error.message);
            }
        });
        
        logger.debug('Page parsed', { district, pageNum, housesFound: houses.length });
        return houses;
    }

    async getTotalCount(html) {
        const $ = cheerio.load(html);
        const totalText = $('.resultDes .total span').text();
        const count = parseInt(totalText.replace(/,/g, '')) || 0;
        logger.debug('Total count extracted', { count });
        return count;
    }

    async crawlDistrict(district) {
        logger.info('Starting district crawl', { district });
        console.log(`\n🚀 Starting crawl for district: ${district}`);
        const allHouses = [];
        let currentPage = 1;
        
        try {
            // Get first page to determine total count
            const firstPageUrl = `${this.baseURL}/ershoufang/${district}/`;
            const firstPageHtml = await this.request(firstPageUrl);
            const totalCount = await this.getTotalCount(firstPageHtml);
            const totalPages = Math.min(Math.ceil(totalCount / 30), this.maxPages);
            
            logger.info('District statistics', { 
                district, 
                totalCount, 
                totalPages,
                maxPages: this.maxPages
            });
            
            console.log(`📊 Found ${totalCount} listings, will crawl ${totalPages} pages`);
            
            // Crawl each page
            while (currentPage <= totalPages) {
                try {
                    logger.debug('Crawling page', { district, currentPage, totalPages });
                    console.log(`📄 Crawling page ${currentPage}/${totalPages} for ${district}`);
                    
                    const pageUrl = currentPage === 1 
                        ? `${this.baseURL}/ershoufang/${district}/`
                        : `${this.baseURL}/ershoufang/${district}/pg${currentPage}/`;
                    
                    const html = await this.request(pageUrl);
                    const houses = this.parsePage(html, district, currentPage);
                    
                    logger.info('Page crawled successfully', { 
                        district, 
                        page: currentPage, 
                        housesFound: houses.length 
                    });
                    
                    console.log(`🏠 Found ${houses.length} houses on page ${currentPage}`);
                    allHouses.push(...houses);
                    
                    // Delay between requests to be respectful
                    if (currentPage < totalPages) {
                        logger.debug('Delaying before next request', { delay: this.delay });
                        await this.sleep(this.delay);
                    }
                    
                    currentPage++;
                } catch (error) {
                    logger.error('Error crawling page', { 
                        district, 
                        page: currentPage, 
                        error: error.message 
                    });
                    console.error(`❌ Error crawling page ${currentPage}:`, error.message);
                    currentPage++;
                    continue;
                }
            }
            
            logger.info('District crawl completed', { 
                district, 
                totalHouses: allHouses.length 
            });
            
            console.log(`✅ Completed ${district}: ${allHouses.length} houses collected`);
            return allHouses;
            
        } catch (error) {
            logger.error('Failed to crawl district', { 
                district, 
                error: error.message 
            });
            console.error(`❌ Failed to crawl district ${district}:`, error.message);
            return [];
        }
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
                version: '2.0'
            },
            houses: []
        };
        
        logger.info('Starting comprehensive crawl', { 
            districts: this.districts.length,
            maxPages: this.maxPages
        });
        
        console.log('🎯 Starting comprehensive Shanghai real estate crawl');
        console.log(`📍 Districts to crawl: ${this.districts.join(', ')}`);
        
        for (const district of this.districts) {
            try {
                const houses = await this.crawlDistrict(district);
                allData.houses.push(...houses);
                
                // Save intermediate results
                await this.saveIntermediateData(district, houses);
                
            } catch (error) {
                logger.error('Failed to process district', { 
                    district, 
                    error: error.message 
                });
                console.error(`❌ Failed to process district ${district}:`, error.message);
            }
            
            // Longer delay between districts
            await this.sleep(this.delay * 2);
        }
        
        // Save final consolidated data
        await this.saveFinalData(allData);
        await this.generateSummary(allData);
        
        logger.info('Crawl completed', { 
            totalHouses: allData.houses.length,
            districtsProcessed: this.districts.length
        });
        
        console.log('\n🎉 Crawl completed successfully!');
        console.log(`📈 Total houses collected: ${allData.houses.length}`);
        
        return allData;
    }

    async saveIntermediateData(district, houses) {
        try {
            const filename = `houses_${district}_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            await fs.writeFile(filepath, JSON.stringify({
                district,
                date: new Date().toISOString(),
                count: houses.length,
                houses
            }, null, 2));
            
            logger.info('Intermediate data saved', { 
                district, 
                houses: houses.length,
                filepath 
            });
            
            console.log(`💾 Saved ${houses.length} houses for ${district}`);
        } catch (error) {
            logger.error('Failed to save intermediate data', { 
                district, 
                error: error.message 
            });
            console.error(`❌ Failed to save intermediate data for ${district}:`, error.message);
        }
    }

    async saveFinalData(data) {
        try {
            const filename = `shanghai_real_estate_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            
            logger.info('Final data saved', { 
                houses: data.houses.length,
                filepath 
            });
            
            console.log(`💾 Final data saved to: ${filepath}`);
        } catch (error) {
            logger.error('Failed to save final data', { error: error.message });
            console.error('❌ Failed to save final data:', error.message);
        }
    }

    async generateSummary(data) {
        try {
            const summary = {
                totalHouses: data.houses.length,
                averagePrice: 0,
                priceByDistrict: {},
                housesByDistrict: {},
                topExpensiveAreas: [],
                timestamp: new Date().toISOString()
            };
            
            // Calculate statistics
            let totalPrice = 0;
            const districtStats = {};
            
            data.houses.forEach(house => {
                totalPrice += house.totalPrice;
                
                if (!districtStats[house.district]) {
                    districtStats[house.district] = {
                        count: 0,
                        totalPrice: 0,
                        totalSquare: 0,
                        avgUnitPrice: 0
                    };
                }
                
                districtStats[house.district].count++;
                districtStats[house.district].totalPrice += house.totalPrice;
                districtStats[house.district].totalSquare += house.square;
            });
            
            summary.averagePrice = totalPrice / data.houses.length;
            
            // Process district statistics
            Object.keys(districtStats).forEach(district => {
                const stats = districtStats[district];
                summary.housesByDistrict[district] = stats.count;
                summary.priceByDistrict[district] = {
                    count: stats.count,
                    avgTotalPrice: stats.totalPrice / stats.count,
                    avgSquare: stats.totalSquare / stats.count,
                    avgUnitPrice: stats.totalPrice / (stats.totalSquare / 10000) // 元/平米
                };
            });
            
            // Top expensive areas
            summary.topExpensiveAreas = Object.entries(summary.priceByDistrict)
                .sort(([,a], [,b]) => b.avgUnitPrice - a.avgUnitPrice)
                .slice(0, 10)
                .map(([district, stats]) => ({
                    district,
                    avgUnitPrice: Math.round(stats.avgUnitPrice),
                    count: stats.count
                }));
            
            const summaryFile = path.join(this.dataDir, `summary_${new Date().toISOString().split('T')[0]}.json`);
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            
            logger.info('Summary generated', { 
                totalHouses: summary.totalHouses,
                districts: Object.keys(summary.priceByDistrict).length,
                summaryFile 
            });
            
            console.log(`📊 Summary generated: ${summaryFile}`);
            
        } catch (error) {
            logger.error('Failed to generate summary', { error: error.message });
            console.error('❌ Failed to generate summary:', error.message);
        }
    }
}

module.exports = LianjiaCrawler;