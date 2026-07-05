#!/usr/bin/env node

/**
 * Anti-Bot Detection Test
 * 
 * Tests the anti-bot detection capabilities against various scenarios
 */

const AntiBotBypass = require('./src/antiBotBypass');
const fs = require('fs').promises;
const path = require('path');

async function testAntiBotDetection() {
    console.log('🧪 Anti-Bot Detection Testing');
    console.log('=============================\n');
    
    const antiBot = new AntiBotBypass({
        maxRetries: 3,
        delayRange: { min: 1000, max: 2000 }
    });
    
    // Test cases
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
            expected: { blocked: false }
        },
        {
            name: 'Captcha Detection',
            html: `
                <html>
                    <head><title>验证码 - 链家网</title></head>
                    <body>
                        <div>Please enter the verification code</div>
                    </body>
                </html>
            `,
            expected: { blocked: true }
        },
        {
            name: 'Rate Limit Detection',
            html: `
                <html>
                    <head><title>Access Denied</title></head>
                    <body>
                        <div>Rate limit exceeded. Please try again later.</div>
                    </body>
                </html>
            `,
            expected: { blocked: true }
        },
        {
            name: 'Cloudflare Challenge',
            html: `
                <html>
                    <head><title>Just a moment...</title></head>
                    <body>
                        <div>Checking your browser before accessing sh.lianjia.com</div>
                    </body>
                </html>
            `,
            expected: { blocked: true }
        },
        {
            name: 'Empty/Bot Response',
            html: '<html><body></body></html>',
            expected: { blocked: true }
        }
    ];
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
        console.log(`🔍 Testing: ${testCase.name}`);
        
        // Mock headers for testing
        const mockHeaders = {
            'content-type': 'text/html',
            'server': testCase.name.includes('Cloudflare') ? 'cloudflare' : 'nginx'
        };
        
        const result = antiBot.detectAntiBotProtection(testCase.html, mockHeaders);
        
        const passed = result.detected === testCase.expected.blocked;
        
        console.log(`   Expected: ${testCase.expected.blocked ? 'BLOCKED' : 'ALLOWED'}`);
        console.log(`   Actual: ${result.detected ? 'BLOCKED' : 'ALLOWED'}`);
        console.log(`   Reason: ${result.reason || 'None'}`);
        
        if (passed) {
            console.log('   ✅ PASS\n');
            passedTests++;
        } else {
            console.log('   ❌ FAIL\n');
        }
    }
    
    console.log('📋 Test Results:');
    console.log('===============');
    console.log(`Passed: ${passedTests}/${totalTests}`);
    console.log(`Success Rate: ${(passedTests/totalTests*100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Anti-bot detection is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Review the detection logic.');
    }
    
    // Test actual request (if network available)
    console.log('\n🌐 Testing live request...');
    try {
        const result = await antiBot.smartRequest('https://sh.lianjia.com');
        console.log('✅ Live request successful');
        console.log(`   Status: ${result.status}`);
        console.log(`   Content Length: ${result.data.length} characters`);
        
        // Test anti-bot detection on real response
        const detection = antiBot.detectAntiBotProtection(result.data, result.headers);
        console.log(`   Anti-bot Detected: ${detection.detected}`);
        if (detection.detected) {
            console.log(`   Reason: ${detection.reason}`);
        }
        
    } catch (error) {
        console.log('⚠️  Live request failed (this is normal in some environments)');
        console.log(`   Error: ${error.message}`);
    }
    
    // Display system stats
    console.log('\n📊 System Statistics:');
    console.log('====================');
    const stats = antiBot.getStats();
    Object.entries(stats).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
}

// Run the test
if (require.main === module) {
    testAntiBotDetection().catch(console.error);
}

module.exports = { testAntiBotDetection };