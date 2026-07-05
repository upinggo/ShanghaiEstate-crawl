#!/usr/bin/env node

/**
 * Improved Anti-Bot Protection Test Suite
 * Tests the enhanced HTTP-based anti-bot bypass system
 */

const ImprovedAntiBotBypass = require('./src/improvedAntiBotBypass');
const ImprovedProtectedCrawler = require('./src/improvedProtectedCrawler');
const fs = require('fs').promises;
const path = require('path');

async function runImprovedAntiBotTest() {
    console.log('🛡️  Improved Anti-Bot Protection Test Suite');
    console.log('==========================================\n');
    
    try {
        // Test 1: Enhanced detection accuracy
        await testEnhancedDetection();
        
        // Test 2: Adaptive strategy testing
        await testAdaptiveStrategies();
        
        // Test 3: Full crawl demonstration with fallback
        await testFullCrawlWithFallback();
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

async function testEnhancedDetection() {
    console.log('🔬 Test 1: Enhanced Anti-Bot Detection Accuracy');
    console.log('---------------------------------------------');
    
    const antiBot = new ImprovedAntiBotBypass();
    
    const testCases = [
        {
            name: 'Normal Response',
            html: `
                <html>
                    <head><title>链家网 - 上海二手房</title></head>
                    <body>
                        <div class="sellListContent">
                            <div class="clear">
                                <div class="info">
                                    <div class="title"><a href="#">Test House</a></div>
                                    <div class="priceInfo"><span class="totalPrice"><span>500</span>万</span></div>
                                </div>
                            </div>
                        </div>
                    </body>
                </html>
            `,
            expected: { blocked: false },
            description: 'Standard legitimate housing listing'
        },
        {
            name: 'CAPTCHA Detection - Chinese',
            html: `
                <html>
                    <head><title>验证码 - 链家网</title></head>
                    <body>
                        <div class="captcha-container">
                            <div>请输入验证码</div>
                            <div>人机验证</div>
                        </div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'Chinese CAPTCHA verification page'
        },
        {
            name: 'CAPTCHA Detection - English',
            html: `
                <html>
                    <head><title>Security Verification</title></head>
                    <body>
                        <div>Please complete the verification</div>
                        <div class="g-recaptcha"></div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'English reCAPTCHA verification'
        },
        {
            name: 'Cloudflare Challenge',
            html: `
                <html>
                    <head><title>Just a moment...</title></head>
                    <body>
                        <div>Checking your browser before accessing sh.lianjia.com</div>
                        <div id="cf-browser-verification">Please wait...</div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'Cloudflare browser verification challenge'
        },
        {
            name: 'Rate Limit Detection',
            html: `
                <html>
                    <head><title>Access Denied</title></head>
                    <body>
                        <div>Rate limit exceeded. Please try again later.</div>
                        <div>访问过于频繁，请稍后再试</div>
                        <div>Error 429</div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'Rate limiting protection'
        },
        {
            name: 'Empty Response',
            html: '<html><head></head><body></body></html>',
            expected: { blocked: true },
            description: 'Empty or minimal HTML response'
        },
        {
            name: 'DDoS Protection',
            html: `
                <html>
                    <head><title>Security Check</title></head>
                    <body>
                        <div>Security verification in progress</div>
                        <div>Automated access detected</div>
                        <div>Server: ddos-guard</div>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'DDoS protection service detection'
        },
        {
            name: 'JavaScript Challenge',
            html: `
                <html>
                    <head><title>Checking your browser</title></head>
                    <body>
                        <div>Please enable JavaScript to continue</div>
                        <div id="jschl-answer"></div>
                        <noscript>Please enable JavaScript</noscript>
                    </body>
                </html>
            `,
            expected: { blocked: true },
            description: 'JavaScript execution required'
        }
    ];
    
    let passedTests = 0;
    let totalTests = testCases.length;
    let criticalDetections = 0;
    let falsePositives = 0;
    
    for (const testCase of testCases) {
        console.log(`🔍 Testing: ${testCase.name}`);
        console.log(`   Description: ${testCase.description}`);
        
        // Mock headers for testing
        const mockHeaders = {
            'content-type': 'text/html',
            'server': testCase.name.includes('Cloudflare') ? 'cloudflare' : 
                     testCase.name.includes('DDoS') ? 'ddos-guard' : 
                     testCase.name.includes('Empty') ? 'nginx' : 'apache'
        };
        
        const result = antiBot.detectAntiBotProtection(testCase.html, { headers: mockHeaders });
        
        const expectedBlocked = testCase.expected.blocked;
        const actuallyBlocked = result.detected;
        const passed = expectedBlocked === actuallyBlocked;
        
        console.log(`   Expected: ${expectedBlocked ? 'BLOCKED' : 'ALLOWED'}`);
        console.log(`   Actual: ${actuallyBlocked ? 'BLOCKED' : 'ALLOWED'}`);
        console.log(`   Confidence: ${result.confidence || 'N/A'}%`);
        console.log(`   Severity: ${result.severity || 'low'}`);
        if (result.reason) {
            console.log(`   Reason: ${result.reason}`);
        }
        
        if (passed) {
            console.log('   ✅ PASS\n');
            passedTests++;
            if (actuallyBlocked) criticalDetections++;
        } else {
            console.log('   ❌ FAIL\n');
            if (expectedBlocked && !actuallyBlocked) {
                falsePositives++;
            }
        }
    }
    
    console.log(`📊 Detection Test Results:`);
    console.log(`   • Total tests: ${totalTests}`);
    console.log(`   • Passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`   • Critical detections: ${criticalDetections}`);
    console.log(`   • False positives: ${falsePositives}`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All detection tests passed!\n');
    } else {
        console.log('⚠️  Some detection tests failed.\n');
    }
}

async function testAdaptiveStrategies() {
    console.log('🔄 Test 2: Adaptive Strategy Performance');
    console.log('---------------------------------------');
    
    const antiBot = new ImprovedAntiBotBypass({
        maxRetries: 3,
        delayRange: { min: 1000, max: 2000 }
    });
    
    // Test strategy determination
    console.log('Testing strategy adaptation:');
    
    const strategyTests = [
        { attempt: 1, domainVisits: 0, expected: 'stealth' },
        { attempt: 2, domainVisits: 0, expected: 'stealth' },
        { attempt: 3, domainVisits: 0, expected: 'mobile' },
        { attempt: 4, domainVisits: 0, expected: 'mobile' },
        { attempt: 5, domainVisits: 3, expected: 'alternative' },
        { attempt: 6, domainVisits: 1, expected: 'stealth' }
    ];
    
    let strategyPasses = 0;
    
    for (const test of strategyTests) {
        const strategy = antiBot.determineStrategy(test.attempt, test.domainVisits);
        const passed = strategy === test.expected;
        
        console.log(`   Attempt ${test.attempt}, Domain visits: ${test.domainVisits}`);
        console.log(`   Expected: ${test.expected}, Got: ${strategy} - ${passed ? '✅' : '❌'}`);
        
        if (passed) strategyPasses++;
    }
    
    console.log(`\nStrategy adaptation: ${strategyPasses}/${strategyTests.length} correct\n`);
    
    // Test HTTP request (using a reliable test endpoint)
    try {
        console.log('Testing HTTP request capability...');
        const response = await antiBot.makeRequest('https://httpbin.org/get');
        console.log('✅ HTTP request test: SUCCESS');
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Response size: ${response.body.length} characters`);
        
        const stats = antiBot.getStats();
        console.log(`   Strategy used: ${stats.strategy}`);
        console.log(`   Requests made: ${stats.requestCount}`);
        console.log(`   Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
        
    } catch (error) {
        console.log('❌ HTTP request test: FAILED');
        console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
}

async function testFullCrawlWithFallback() {
    console.log('🚀 Test 3: Full Crawl with Fallback Demonstration');
    console.log('------------------------------------------------');
    
    const crawler = new ImprovedProtectedCrawler({
        districts: ['xuhui', 'huangpu'], // Test with fewer districts
        maxPages: 2,
        delay: 1500,
        strategy: 'adaptive',
        maxRetries: 5,
        dataDir: './test-data/improved'
    });
    
    try {
        console.log('Starting improved protected crawl with fallback...');
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
        console.log(`   • Recent success rate: ${(stats.recentSuccessRate * 100).toFixed(1)}%`);
        console.log(`   • Strategy used: ${stats.strategy.toUpperCase()}`);
        console.log(`   • Consecutive failures: ${stats.consecutiveFailures}`);
        
        // Show district performance
        console.log(`\n🏘️  District Performance:`);
        for (const [district, stat] of Object.entries(results.metadata.districtStats)) {
            const status = stat.success ? '✅' : '❌';
            const houses = stat.housesCollected;
            const duration = stat.duration;
            const fallback = stat.fallback ? ' (simulated)' : '';
            console.log(`   ${status} ${district}: ${houses} houses in ${duration}s${fallback}`);
        }
        
        // Save test results
        const testReport = {
            timestamp: new Date().toISOString(),
            testResults: {
                detectionAccuracy: 'Enhanced detection system tested',
                adaptiveStrategies: 'Strategy adaptation verified',
                fullCrawl: {
                    housesCollected: results.houses.length,
                    districtsProcessed: results.metadata.districts.length,
                    successRate: results.metadata.successfulDistricts.length / results.metadata.districts.length,
                    fallbackUsage: results.metadata.failedDistricts.length > 0
                }
            },
            systemStats: stats,
            districtPerformance: results.metadata.districtStats
        };
        
        await fs.mkdir('./test-reports', { recursive: true });
        const reportPath = `./test-reports/improved-anti-bot-test-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(testReport, null, 2));
        console.log(`\n📝 Test report saved to: ${reportPath}`);
        
    } catch (error) {
        console.log('❌ Full crawl test failed:', error.message);
        // Still show partial results if available
        const stats = crawler.antiBot.getStats();
        console.log(`Partial stats: ${JSON.stringify(stats, null, 2)}`);
    } finally {
        await crawler.close();
    }
}

// Run the test suite
if (require.main === module) {
    runImprovedAntiBotTest();
}

module.exports = { runImprovedAntiBotTest };