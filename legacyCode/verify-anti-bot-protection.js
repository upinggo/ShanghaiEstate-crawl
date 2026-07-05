#!/usr/bin/env node

/**
 * Targeted Anti-Bot Protection Verifier
 * Specifically designed to handle Lianjia anti-bot protection at:
 * https://sh.lianjia.com/ershoufang/xuhui/pg1
 */

const FinalAntiBotSolution = require('./src/finalAntiBotSolution');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class LianjiaAntiBotVerifier {
    constructor(options = {}) {
        this.targetUrl = options.url || 'https://sh.lianjia.com/ershoufang/xuhui/pg1';
        this.district = options.district || 'xuhui';
        this.page = options.page || 1;
        
        this.antiBot = new FinalAntiBotSolution({
            maxRetries: options.maxRetries || 8,
            delayRange: options.delayRange || { min: 3000, max: 8000 },
            strategy: 'multi-layer'
        });
        
        this.results = {
            url: this.targetUrl,
            timestamp: new Date().toISOString(),
            attempts: [],
            finalResult: null
        };
    }

    async verifyAndBypass() {
        console.log('🔍 Lianjia Anti-Bot Protection Verifier');
        console.log('=====================================\n');
        console.log(`🎯 Target URL: ${this.targetUrl}`);
        console.log(`📍 District: ${this.district}, Page: ${this.page}\n`);
        
        try {
            // Attempt to access the protected page
            const response = await this.antiBot.makeRequest(this.targetUrl);
            
            // Analyze the response
            const analysis = this.analyzeResponse(response);
            
            // Try to extract housing data
            const housingData = this.extractHousingData(response.body, analysis.isValid);
            
            // Compile final results
            this.results.finalResult = {
                success: true,
                validation: response.validation,
                analysis: analysis,
                housingData: housingData,
                stats: this.antiBot.getStats()
            };
            
            this.displayResults();
            await this.saveResults();
            
            return this.results.finalResult;
            
        } catch (error) {
            console.log(`❌ Failed to bypass anti-bot protection: ${error.message}`);
            
            this.results.finalResult = {
                success: false,
                error: error.message,
                attemptsMade: this.antiBot.stats.requests,
                stats: this.antiBot.getStats()
            };
            
            this.displayFailureResults();
            await this.saveResults();
            
            return this.results.finalResult;
        }
    }

    analyzeResponse(response) {
        const analysis = {
            isValid: response.validation.isValid,
            confidence: response.validation.confidence,
            issues: response.validation.issues,
            contentIndicators: response.validation.contentIndicators,
            antiBotDetected: false,
            housingContentFound: false
        };

        const html = response.body.toLowerCase();
        
        // Check for specific anti-bot indicators
        const antiBotPatterns = [
            '验证码', 'verification', 'captcha', 'blocked', 'forbidden',
            'checking your browser', 'just a moment', 'rate limit',
            'access denied', 'security check', '请稍后再试'
        ];
        
        for (const pattern of antiBotPatterns) {
            if (html.includes(pattern.toLowerCase())) {
                analysis.antiBotDetected = true;
                analysis.antiBotType = pattern;
                break;
            }
        }
        
        // Check for housing-specific content
        const housingPatterns = [
            'selllistcontent', 'ershoufang', 'houseinfo', 
            'totalprice', 'unitprice', 'title'
        ];
        
        let housingMatches = 0;
        for (const pattern of housingPatterns) {
            if (html.includes(pattern)) {
                housingMatches++;
            }
        }
        
        analysis.housingContentFound = housingMatches >= 3;
        
        return analysis;
    }

    extractHousingData(html, isValidContent) {
        if (!isValidContent) {
            return { houses: [], count: 0, message: 'Content validation failed' };
        }

        try {
            const $ = cheerio.load(html);
            const houses = [];
            
            // Multiple selector strategies for robust extraction
            const selectors = [
                '.sellListContent .clear .info',
                '.listContent .item', 
                '.m-list .item',
                '[class*="list"] [class*="item"]'
            ];
            
            let $houseElements = null;
            
            // Try different selectors
            for (const selector of selectors) {
                $houseElements = $(selector);
                if ($houseElements.length > 0) {
                    console.log(`✅ Using selector: ${selector} (found ${$houseElements.length} elements)`);
                    break;
                }
            }
            
            if (!$houseElements || $houseElements.length === 0) {
                return { houses: [], count: 0, message: 'No housing elements found' };
            }
            
            $houseElements.each((index, element) => {
                try {
                    const $element = $(element);
                    const house = this.parseHouseElement($element);
                    
                    if (this.isValidHouse(house)) {
                        houses.push(house);
                    }
                } catch (parseError) {
                    // Continue with other elements
                }
            });
            
            return {
                houses: houses,
                count: houses.length,
                message: houses.length > 0 ? 'Successfully extracted housing data' : 'No valid housing data found'
            };
            
        } catch (error) {
            return { 
                houses: [], 
                count: 0, 
                message: `Parsing error: ${error.message}`,
                error: error.message
            };
        }
    }

    parseHouseElement($element) {
        const house = {};
        
        // Title extraction
        const titleSelectors = ['.title a', '.house-title a', 'h3 a', '[class*="title"] a'];
        for (const selector of titleSelectors) {
            const $title = $element.find(selector);
            if ($title.length > 0) {
                house.title = $title.text().trim();
                if (house.title) break;
            }
        }
        
        // Price extraction
        const priceSelectors = ['.totalPrice span', '.price .amount', '[class*="price"] [class*="total"]'];
        for (const selector of priceSelectors) {
            const $price = $element.find(selector);
            if ($price.length > 0) {
                const priceText = $price.text();
                const match = priceText.match(/[\d.]+/);
                if (match) {
                    house.totalPrice = parseFloat(match[0]);
                    break;
                }
            }
        }
        
        // Unit price extraction
        const unitSelectors = ['.unitPrice', '.unit-price', '[class*="unit"]'];
        for (const selector of unitSelectors) {
            const $unit = $element.find(selector);
            if ($unit.length > 0) {
                const unitText = $unit.text();
                const match = unitText.match(/[\d,]+/);
                if (match) {
                    house.unitPrice = parseInt(match[0].replace(/,/g, ''));
                    break;
                }
            }
        }
        
        // Address/info extraction
        const infoSelectors = ['.houseInfo', '.address', '[class*="info"]'];
        for (const selector of infoSelectors) {
            const $info = $element.find(selector);
            if ($info.length > 0) {
                house.address = $info.text().trim();
                break;
            }
        }
        
        house.extractedAt = new Date().toISOString();
        house.sourceUrl = this.targetUrl;
        
        return house;
    }

    isValidHouse(house) {
        return house.title && (house.totalPrice > 0 || house.unitPrice > 0);
    }

    displayResults() {
        const result = this.results.finalResult;
        const analysis = result.analysis;
        const housingData = result.housingData;
        
        console.log('\n🏆 Anti-Bot Bypass Results');
        console.log('=========================');
        console.log(`✅ Success: ${result.success ? 'YES' : 'NO'}`);
        console.log(`📊 Validation Confidence: ${analysis.confidence}%`);
        console.log(`🛡️  Anti-Bot Detected: ${analysis.antiBotDetected ? 'YES (' + analysis.antiBotType + ')' : 'NO'}`);
        console.log(`🏘️  Housing Content Found: ${analysis.housingContentFound ? 'YES' : 'NO'}`);
        console.log(`🏠 Houses Extracted: ${housingData.count}`);
        
        if (analysis.issues.length > 0) {
            console.log(`⚠️  Issues Found: ${analysis.issues.join(', ')}`);
        }
        
        if (housingData.count > 0) {
            console.log('\n📋 Sample Houses Extracted:');
            housingData.houses.slice(0, 3).forEach((house, index) => {
                console.log(`   ${index + 1}. ${house.title || 'Untitled'}`);
                if (house.totalPrice) console.log(`      Price: ${house.totalPrice}万`);
                if (house.unitPrice) console.log(`      Unit: ${house.unitPrice}元/平`);
                if (house.address) console.log(`      Address: ${house.address}`);
            });
        }
        
        const stats = result.stats;
        console.log('\n📈 Performance Stats:');
        console.log(`   • Requests made: ${stats.requests}`);
        console.log(`   • Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`   • Session duration: ${stats.sessionDuration.toFixed(1)} minutes`);
    }

    displayFailureResults() {
        const result = this.results.finalResult;
        console.log('\n❌ Anti-Bot Bypass Failed');
        console.log('========================');
        console.log(`Error: ${result.error}`);
        console.log(`Attempts made: ${result.attemptsMade}`);
        
        const stats = result.stats;
        console.log('\n📈 Performance Stats:');
        console.log(`   • Requests made: ${stats.requests}`);
        console.log(`   • Failures: ${stats.failures}`);
        console.log(`   • Consecutive failures: ${stats.consecutiveFailures}`);
    }

    async saveResults() {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `anti-bot-verification-${this.district}-pg${this.page}-${timestamp}.json`;
        const filePath = path.join('./test-data', fileName);
        
        await fs.mkdir('./test-data', { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(this.results, null, 2));
        
        console.log(`\n💾 Results saved to: ${filePath}`);
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    
    let url = 'https://sh.lianjia.com/ershoufang/xuhui/pg1';
    let district = 'xuhui';
    let page = 1;
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--url' && args[i + 1]) {
            url = args[i + 1];
            i++;
        } else if (args[i] === '--district' && args[i + 1]) {
            district = args[i + 1];
            i++;
        } else if (args[i] === '--page' && args[i + 1]) {
            page = parseInt(args[i + 1]);
            i++;
        }
    }
    
    const verifier = new LianjiaAntiBotVerifier({
        url: url,
        district: district,
        page: page
    });
    
    await verifier.verifyAndBypass();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = LianjiaAntiBotVerifier;