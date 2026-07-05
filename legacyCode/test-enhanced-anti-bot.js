#!/usr/bin/env node

/**
 * Enhanced Anti-Bot Protection Test Suite
 * Tests the comprehensive anti-bot bypass system with multiple strategies
 */

const EnhancedAntiBotBypass = require('./src/enhancedAntiBotBypass');
const EnhancedProtectedCrawler = require('./src/enhancedProtectedCrawler');
const fs = require('fs').promises;
const path = require('path');

async function runEnhancedAntiBotTest() {
    console.log('🛡️  Enhanced Anti-Bot Protection Test Suite');
    console.log('===========================================\n');
    
    try {
        // Test 1: Enhanced detection accuracy
        await testEnhancedDetection();
        
        // Test 2: HTTP strategy testing
        await testHttpStrategy();
        
        // Test 3: Puppeteer strategy testing
        await testPuppeteerStrategy();
        
        // Test 4: Hybrid strategy testing
        await testHybridStrategy();
        
        // Test 5: Full crawl demonstration
        await testFullCrawl();
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

async function testEnhancedDetection() {
    console.log('🔬 Test 1: Enhanced Anti-Bot Detection Accuracy');
    console.log('---------------------------------------------');
    
    const antiBot = new EnhancedAntiBotBypass();
    
    const testCases = [
        {
            name: 'Normal Response',
            html: `
                <html>
                    <head><title>链家网 - 上海二手房</title></head>
                    <body>
                        <div class="sellListContent">
                            <div class="clear">
                                <div class="info">House 1</div>
                            </div>
                        </div>
                    </body>
                </html>
            `,
            expected: { blocked: false },
            description: 'Standard legitimate response'
        },
        {
            name: 'CAPTCHA Detection',
            html: `
                <html>
                    <head><title>验证码 - 链家网</title></head>
                    <body>
                        <div>Please enter the verification code</div>
                        <div>人机验证</div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'CAPTCHA verification page'
        },
        {
            name: 'Cloudflare Challenge',
            html: `
                <html>
                    <head><title>Just a moment...</title></head>
                    <body>
                        <div>Checking your browser before accessing sh.lianjia.com</div>
                        <div id="cf-browser-verification"></div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'Cloudflare browser verification'
        },
        {
            name: 'Rate Limit Detection',
            html: `
                <html>
                    <head><title>Access Denied</title></head>
                    <body>
                        <div>Rate limit exceeded. Please try again later.</div>
                        <div>访问过于频繁</div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'Rate limiting protection'
        },
        {
            name: 'Empty/Suspicious Response',
            html: '<html><body></body></html>',
            expected: { blocked: true },
            description: 'Empty or minimal response'
        },
        {
            name: 'DDoS Protection',
            html: `
                <html>
                    <head><title>Security Check</title></head>
                    <body>
                        <div>Security check in progress</div>
                        <div>bot detected</div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'DDoS protection service'
        }
    ];
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
        console.log(`🔍 Testing: ${testCase.name}`);
        console.log(`   Description: ${testCase.description}`);
        
        // Mock headers for testing
        const mockHeaders = {
            'content-type': 'text/html',
            'server': testCase.name.includes('Cloudflare') ? 'cloudflare' : 
                     testCase.name.includes('DDoS') ? 'ddos-guard' : 'nginx'
        };
        
        const result = antiBot.detectAntiBotProtection(testCase.html, { headers: mockHeaders });
        
        const passed = result.detected === testCase.expected.blocked;
        
        console.log(`   Expected: ${testCase.expected.blocked ? 'BLOCKED' : 'ALLOWED'}`);
        console.log(`   Actual: ${result.detected ? 'BLOCKED' : 'ALLOWED'}`);
        console.log(`   Reason: ${result.reason || 'None'}`);
        console.log(`   Severity: ${result.severity || 'low'}`);
        
        if (passed) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log('   ❌ FAIL\n');
        }
    }
    
    console.log(`📊 Detection Test Results: ${passedTests}/${totalTests} passed (${(passedTests/totalTests*100).toFixed(1)}%)\n`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All detection tests passed!\n');
    } else {
        console.log('⚠️  Some detection tests failed.\n');
    }
}

async function testHttpStrategy() {
    console.log('🌐 Test 2: HTTP Strategy Performance');
    console.log('-----------------------------------');
    
    const antiBot = new EnhancedAntiBotBypass({
        strategy: 'http',
        maxRetries: 3,
        delayRange: { min: 1000, max: 2000 }
    });
    
    try {
        const response = await antiBot.makeRequest('https://httpbin.org/get');
        console.log('✅ HTTP strategy test: SUCCESS');
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Response size: ${response.body.length} characters`);
        
        const stats = antiBot.getStats();
        console.log(`   Strategy: ${stats.strategy}`);
        console.log(`   Requests made: ${stats.requestCount}`);
        
    } catch (error) {
        console.log('❌ HTTP strategy test: FAILED');
        console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
}

async function testPuppeteerStrategy() {
    console.log('🤖 Test 3: Puppeteer Strategy Performance');
    console.log('----------------------------------------');
    
    const antiBot = new EnhancedAntiBotBypass({
        strategy: 'puppeteer',
        maxRetries: 2,
        delayRange: { min: 1500, max: 3000 }
    });
    
    try {
        const response = await antiBot.makeRequest('https://httpbin.org/get');
        console.log('✅ Puppeteer strategy test: SUCCESS');
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Response size: ${response.body.length} characters`);
        
        const stats = antiBot.getStats();
        console.log(`   Strategy: ${stats.strategy}`);
        console.log(`   Puppeteer enabled: ${stats.puppeteerEnabled ? 'YES' : 'NO'}`);
        console.log(`   Requests made: ${stats.requestCount}`);
        
    } catch (error) {
        console.log('❌ Puppeteer strategy test: FAILED');
        console.log(`   Error: ${error.message}`);
    } finally {
        await antiBot.close();
    }
    
    console.log('');
}

async function testHybridStrategy() {
    console.log('🔄 Test 4: Hybrid Strategy Performance');
    console.log('-------------------------------------');
    
    const antiBot = new EnhancedAntiBotBypass({
        strategy: 'hybrid',
        maxRetries: 3,
        delayRange: { min: 1000, max: 2500 }
    });
    
    try {
        const response = await antiBot.makeRequest('https://httpbin.org/get');
        console.log('✅ Hybrid strategy test: SUCCESS');
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Response size: ${response.body.length} characters`);
        
        const stats = antiBot.getStats();
        console.log(`   Strategy: ${stats.strategy}`);
        console.log(`   Puppeteer enabled: ${stats.puppeteerEnabled ? 'YES' : 'NO'}`);
        console.log(`   Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`   Consecutive failures: ${stats.consecutiveFailures}`);
        
    } catch (error) {
        console.log('❌ Hybrid strategy test: FAILED');
        console.log(`   Error: ${error.message}`);
    } finally {
        await antiBot.close();
    }
    
    console.log('');
}

async function testFullCrawl() {
    console.log('🚀 Test 5: Full Crawl Demonstration');
    console.log('----------------------------------');
    
    const crawler = new EnhancedProtectedCrawler({
        districts: ['xuhui', 'huangpu'],
        maxPages: 2,
        delay: 1500,
        strategy: 'hybrid',
        maxRetries: 3,
        dataDir: './test-data/enhanced'
    });
    
    try {
        console.log('Starting enhanced protected crawl...');
        const results = await crawler.crawlAllDistricts();
        
        console.log('\n🏆 Full Crawl Results:');
        console.log('=====================');
        console.log(`Total houses collected: ${results.houses.length}`);
        console.log(`Successful districts: ${results.metadata.successfulDistricts.length}`);
        console.log(`Failed districts: ${results.metadata.failedDistricts.length}`);
        console.log(`Crawl duration: ${results.metadata.crawlDuration}`);
        
        const stats = results.metadata.antiBotStats;
        console.log(`\n🛡️  Anti-Bot Performance:`);
        console.log(`   • Requests made: ${stats.requestCount}`);
        console.log(`   • Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`   • Strategy used: ${stats.strategy.toUpperCase()}`);
        console.log(`   • Puppeteer enabled: ${stats.puppeteerEnabled ? 'YES' : 'NO'}`);
        
        // Save test results
        const testReport = {
            timestamp: new Date().toISOString(),
            testResults: {
                detectionAccuracy: 'To be calculated',
                httpStrategy: 'Tested',
                puppeteerStrategy: 'Tested',
                hybridStrategy: 'Tested',
                fullCrawl: {
                    housesCollected: results.houses.length,
                    districtsProcessed: results.metadata.districts.length,
                    successRate: results.metadata.successfulDistricts.length / results.metadata.districts.length
                }
            },
            systemStats: stats
        };
        
        await fs.mkdir('./test-reports', { recursive: true });
        const reportPath = `./test-reports/enhanced-anti-bot-test-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(testReport, null, 2));
        console.log(`\n📝 Test report saved to: ${reportPath}`);
        
    } catch (error) {
        console.log('❌ Full crawl test failed:', error.message);
    } finally {
        await crawler.close();
    }
}

// Run the test suite
if (require.main === module) {
    runEnhancedAntiBotTest();
}

module.exports = { runEnhancedAntiBotTest };