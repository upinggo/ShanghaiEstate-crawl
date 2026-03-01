#!/usr/bin/env node

/**
 * Anti-Bot Protection Bypass Demo
 * 
 * This demo showcases the advanced anti-bot detection and bypass capabilities
 * of the lianjia-node crawler system.
 */

const path = require('path');
const AutoDetectCrawler = require('../src/autoDetectCrawler');
const logger = require('../src/logger');

async function runAntiBotDemo() {
    console.log('🛡️  Anti-Bot Protection Bypass Demo');
    console.log('=====================================\n');
    
    try {
        // Configure crawler with multiple districts to test detection
        const crawler = new AutoDetectCrawler({
            districts: ['xuhui', 'pudong', 'huangpu', 'jingan', 'changning'],
            dataDir: './data',
            testSampleSize: 3, // Test 3 districts for detection
            fallbackEnabled: true
        });

        // Run the full automated process
        console.log('🚀 Starting automated anti-bot detection and bypass...\n');
        
        const results = await crawler.crawlAllDistricts();
        
        // Display comprehensive results
        displayResults(results, crawler);
        
    } catch (error) {
        logger.error('Demo failed', { error: error.message });
        console.error('\n❌ Demo failed:', error.message);
        process.exit(1);
    }
}

function displayResults(results, crawler) {
    const metadata = results.metadata;
    const detection = metadata.detection;
    
    console.log('\n🏆 Anti-Bot Bypass Results');
    console.log('==========================');
    
    console.log(`\n📊 Overall Performance:`);
    console.log(`   • Total Houses Collected: ${results.houses.length}`);
    console.log(`   • Districts Processed: ${metadata.districts.length}`);
    console.log(`   • Detection Mode Used: ${detection.mode.toUpperCase()}`);
    console.log(`   • Timestamp: ${detection.timestamp}`);
    
    console.log(`\n🔍 Detection Details:`);
    console.log(`   • Tested Districts: ${detection.testResults.testedDistricts.join(', ')}`);
    console.log(`   • Accessible Districts: ${detection.testResults.accessible.length}`);
    console.log(`   • Blocked Districts: ${detection.testResults.blocked.length}`);
    
    if (detection.testResults.accessible.length > 0) {
        console.log(`\n✅ Accessible Districts:`);
        detection.testResults.accessible.forEach(district => {
            console.log(`   • ${district.district}: ${district.housesFound} houses found (${district.responseTime}ms)`);
        });
    }
    
    if (detection.testResults.blocked.length > 0) {
        console.log(`\n❌ Blocked Districts:`);
        detection.testResults.blocked.forEach(district => {
            console.log(`   • ${district.district}: ${district.reason}`);
        });
    }
    
    // District breakdown
    const districtStats = {};
    results.houses.forEach(house => {
        if (!districtStats[house.district]) {
            districtStats[house.district] = { count: 0, totalPrice: 0 };
        }
        districtStats[house.district].count++;
        districtStats[house.district].totalPrice += house.totalPrice || 0;
    });
    
    console.log(`\n🏘️  District Breakdown:`);
    Object.entries(districtStats).forEach(([district, stats]) => {
        const avgPrice = stats.count > 0 ? Math.round(stats.totalPrice / stats.count) : 0;
        console.log(`   • ${district}: ${stats.count} houses (avg ¥${avgPrice}万)`);
    });
    
    console.log(`\n📁 Data Files Generated:`);
    console.log(`   • Main data file: shanghai_*_crawl_*.json`);
    console.log(`   • District files: houses_*_*.json`);
    console.log(`   • Summary file: *_summary_*.json`);
    console.log(`   • Detection report: detection_report_*.json`);
    
    console.log(`\n✨ Key Features Demonstrated:`);
    console.log(`   • Automatic anti-bot detection`);
    console.log(`   • Intelligent mode selection (real/hybrid/simulation)`);
    console.log(`   • Graceful fallback mechanisms`);
    console.log(`   • Advanced browser fingerprinting`);
    console.log(`   • Session establishment techniques`);
    console.log(`   • Request timing optimization`);
    
    if (detection.mode === 'real') {
        console.log(`\n🎯 SUCCESS: Full real-mode crawling achieved!`);
        console.log(`   The website is accessible and anti-bot measures were bypassed.`);
    } else if (detection.mode === 'hybrid') {
        console.log(`\n🔄 PARTIAL SUCCESS: Hybrid approach used`);
        console.log(`   Some districts worked in real mode, others used simulation fallback.`);
    } else {
        console.log(`\n🎮 FALLBACK ACTIVATED: Simulation mode used`);
        console.log(`   Website appears blocked, but data generation continues.`);
    }
    
    console.log(`\n💡 Pro Tips for Production Use:`);
    console.log(`   1. Run detection during off-peak hours for better success rates`);
    console.log(`   2. Adjust delay settings based on website responsiveness`);
    console.log(`   3. Monitor detection reports for changing website behavior`);
    console.log(`   4. Consider rotating IP addresses for persistent real crawling`);
    console.log(`   5. Use the hybrid mode for production reliability`);
}

// Quick status check function
async function checkCurrentStatus() {
    console.log('🔍 Quick Website Status Check\n');
    
    try {
        const mode = await AutoDetectCrawler.checkWebsiteStatus();
        console.log(`📡 Current Recommended Mode: ${mode.toUpperCase()}`);
        
        switch (mode) {
            case 'real':
                console.log('✅ Website is currently accessible for real crawling');
                break;
            case 'hybrid':
                console.log('⚠️  Website has partial restrictions, hybrid approach recommended');
                break;
            case 'simulation':
                console.log('🛡️  Website is currently blocking access, simulation mode active');
                break;
        }
    } catch (error) {
        console.log(`❌ Status check failed: ${error.message}`);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--status')) {
        checkCurrentStatus();
    } else if (args.includes('--demo')) {
        runAntiBotDemo();
    } else {
        console.log('🛡️  Anti-Bot Protection Bypass Demo');
        console.log('====================================');
        console.log('\nUsage:');
        console.log('  node examples/anti-bot-bypass-demo.js --demo     Run full demo');
        console.log('  node examples/anti-bot-bypass-demo.js --status   Check current status only');
        console.log('\nFeatures:');
        console.log('  • Automatic anti-bot detection');
        console.log('  • Intelligent mode selection');
        console.log('  • Graceful fallback mechanisms');
        console.log('  • Comprehensive reporting');
    }
}

module.exports = { runAntiBotDemo, checkCurrentStatus };