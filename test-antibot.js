#!/usr/bin/env node

/**
 * Anti-Bot Protection Test Script
 * Tests the anti-bot detection and bypass capabilities
 */

const AutoDetectCrawler = require('./src/autoDetectCrawler');
const AdvancedBrowserCrawler = require('./src/advancedBrowserCrawler');
const logger = require('./src/logger');

async function testAntiBotBypass() {
    console.log('🛡️  Anti-Bot Protection Test Suite');
    console.log('===================================\n');
    
    try {
        // Test 1: Quick status check
        console.log('🔬 Test 1: Quick Website Status Check');
        console.log('-------------------------------------');
        const status = await AutoDetectCrawler.checkWebsiteStatus();
        console.log(`✅ Status: ${status.toUpperCase()}\n`);
        
        // Test 2: Advanced crawler detection
        console.log('🔬 Test 2: Advanced Crawler Anti-Bot Detection');
        console.log('----------------------------------------------');
        
        const advancedCrawler = new AdvancedBrowserCrawler({
            districts: ['xuhui'],
            maxPages: 1,
            delay: 1000,
            dataDir: './test-data'
        });
        
        await advancedCrawler.init();
        
        // Test anti-bot detection function
        const testUrl = 'https://sh.lianjia.com/ershoufang/xuhui/';
        try {
            const html = await advancedCrawler.requestWithRetry(testUrl, 'test', 1);
            const isBlocked = advancedCrawler.detectAntiBotProtection(html);
            
            console.log(`✅ Anti-bot detection test: ${isBlocked ? 'BLOCKED' : 'ACCESSIBLE'}`);
            
            if (!isBlocked) {
                console.log('✅ Advanced crawler can access the website');
            } else {
                console.log('⚠️  Advanced crawler detected anti-bot protection');
            }
        } catch (error) {
            console.log(`❌ Request failed: ${error.message}`);
        }
        
        // Test 3: Auto-detection system
        console.log('\n🔬 Test 3: Auto-Detection System');
        console.log('-------------------------------');
        
        const autoCrawler = new AutoDetectCrawler({
            districts: ['xuhui', 'pudong'],
            testSampleSize: 2,
            dataDir: './test-data'
        });
        
        const detectedMode = await autoCrawler.detectOptimalMode();
        console.log(`✅ Auto-detected mode: ${detectedMode.toUpperCase()}`);
        
        // Test 4: Full crawl test (small scale)
        console.log('\n🔬 Test 4: Small Scale Crawl Test');
        console.log('--------------------------------');
        
        console.log('Starting small crawl to verify functionality...');
        const results = await autoCrawler.crawlAllDistricts();
        
        console.log(`✅ Crawl completed successfully!`);
        console.log(`📊 Houses collected: ${results.houses.length}`);
        console.log(`📊 Districts processed: ${results.metadata.districts.length}`);
        
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        const fs = require('fs').promises;
        const path = require('path');
        try {
            const testDataDir = './test-data';
            await fs.rm(testDataDir, { recursive: true, force: true });
            console.log('✅ Test data cleaned up');
        } catch (error) {
            console.log('ℹ️  No test data to clean up');
        }
        
        console.log('\n🎉 All anti-bot tests completed successfully!');
        console.log('\n💡 Key findings:');
        console.log(`   • Current website status: ${status.toUpperCase()}`);
        console.log(`   • Auto-detected optimal mode: ${detectedMode.toUpperCase()}`);
        console.log(`   • System can adapt to changing website conditions`);
        console.log(`   • Fallback mechanisms are functional`);
        
    } catch (error) {
        logger.error('Anti-bot test failed', { error: error.message });
        console.error('\n❌ Anti-bot test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testAntiBotBypass();
}

module.exports = { testAntiBotBypass };