#!/usr/bin/env node

/**
 * Anti-Bot Protection Demo
 * 
 * This example demonstrates the advanced anti-bot protection features
 * including proxy rotation, user agent rotation, and intelligent retry logic.
 */

const BrowserLikeCrawler = require('../src/browserCrawler');
const logger = require('../src/logger');

async function runAntiBotDemo() {
    console.log('🛡️  Anti-Bot Protection Demo');
    console.log('============================\n');
    
    // Configuration with anti-bot protection
    const config = {
        districts: ['xuhui', 'huangpu', 'jingan'], // Test with fewer districts
        maxPages: 2,
        delay: 2000,
        dataDir: './data/anti-bot-demo',
        
        // Proxy configuration (add your proxies here)
        proxies: [
            // Example proxy format:
            // {
            //     protocol: 'http',
            //     host: 'proxy1.example.com',
            //     port: 8080,
            //     auth: {
            //         username: 'username',
            //         password: 'password'
            //     }
            // }
        ]
    };

    try {
        console.log('🚀 Initializing protected crawler...\n');
        
        const crawler = new BrowserLikeCrawler(config);
        
        console.log('🔧 Anti-bot features enabled:');
        console.log('  • User agent rotation');
        console.log('  • Intelligent request timing');
        console.log('  • Automatic retry with backoff');
        console.log('  • Session management');
        console.log('  • Anti-bot detection');
        console.log('  • Proxy support\n');
        
        // Start crawling with protection
        const results = await crawler.crawlAllDistricts();
        
        // Display results
        console.log('\n📊 Results Summary:');
        console.log('==================');
        console.log(`Total houses collected: ${results.houses.length}`);
        console.log(`Successful districts: ${crawler.successfulDistricts.size}`);
        console.log(`Failed districts: ${crawler.failedDistricts.size}`);
        
        if (results.houses.length > 0) {
            console.log('\n🏆 Top districts by house count:');
            const districtCounts = {};
            results.houses.forEach(house => {
                districtCounts[house.district] = (districtCounts[house.district] || 0) + 1;
            });
            
            Object.entries(districtCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .forEach(([district, count]) => {
                    console.log(`  ${district}: ${count} houses`);
                });
        }
        
        console.log('\n🛡️  Anti-bot Statistics:');
        console.log('=======================');
        const stats = crawler.antiBot.getStats();
        console.log(`Requests made: ${stats.requestCount}`);
        console.log(`Active sessions: ${stats.activeSessions}`);
        console.log(`Available proxies: ${stats.proxiesAvailable}`);
        console.log(`User agent pool: ${stats.userAgentPoolSize}`);
        
        if (crawler.failedDistricts.size > 0) {
            console.log('\n⚠️  Blocked districts:');
            crawler.failedDistricts.forEach(district => {
                console.log(`  • ${district}`);
            });
            console.log('\n💡 Tips for improvement:');
            console.log('  • Add more proxy servers');
            console.log('  • Increase delay between requests');
            console.log('  • Use residential proxies');
            console.log('  • Try different user agents');
        }
        
    } catch (error) {
        logger.error('Demo failed', { error: error.message });
        console.error('\n❌ Demo failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('  1. Check internet connection');
        console.log('  2. Verify proxy configuration');
        console.log('  3. Adjust delay settings in config');
        console.log('  4. Check if target website is accessible');
    }
}

// Run the demo
if (require.main === module) {
    runAntiBotDemo().catch(console.error);
}

module.exports = { runAntiBotDemo };