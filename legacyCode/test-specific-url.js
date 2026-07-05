#!/usr/bin/env node

/**
 * Simple Direct Test for Specific Lianjia URL
 * Tests: https://sh.lianjia.com/ershoufang/xuhui/pg1
 */

const https = require('https');
const fs = require('fs').promises;

async function testSpecificUrl() {
    console.log('🔍 Testing Specific Lianjia URL');
    console.log('===============================\n');
    
    const targetUrl = 'https://sh.lianjia.com/ershoufang/xuhui/pg1';
    console.log(`🎯 Testing: ${targetUrl}\n`);
    
    // Test with different approaches
    const approaches = [
        { name: 'Basic Request', func: makeBasicRequest },
        { name: 'Enhanced Headers', func: makeEnhancedRequest },
        { name: 'Mobile Approach', func: makeMobileRequest }
    ];
    
    for (const approach of approaches) {
        console.log(`🧪 ${approach.name}:`);
        try {
            const result = await approach.func(targetUrl);
            analyzeResult(result, approach.name);
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}\n`);
        }
        await sleep(2000); // Wait between tests
    }
}

function makeBasicRequest(url) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'sh.lianjia.com',
            port: 443,
            path: '/ershoufang/xuhui/pg1',
            method: 'GET',
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    approach: 'basic'
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

function makeEnhancedRequest(url) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'sh.lianjia.com',
            port: 443,
            path: '/ershoufang/xuhui/pg1',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    approach: 'enhanced'
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

function makeMobileRequest(url) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'm.lianjia.com', // Try mobile version
            port: 443,
            path: '/sh/ershoufang/xuhui/',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Ch-Ua-Mobile': '?1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            },
            timeout: 12000
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    approach: 'mobile'
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

function analyzeResult(result, approachName) {
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Content Length: ${result.body.length} characters`);
    
    // Check for anti-bot indicators
    const html = result.body.toLowerCase();
    const antiBotIndicators = [
        '验证码', 'verification', 'captcha', 'blocked', 'forbidden',
        'checking your browser', 'just a moment', 'rate limit',
        'access denied', 'security check'
    ];
    
    let antiBotFound = false;
    for (const indicator of antiBotIndicators) {
        if (html.includes(indicator.toLowerCase())) {
            console.log(`   ⚠️  Anti-bot detected: ${indicator}`);
            antiBotFound = true;
            break;
        }
    }
    
    // Check for housing content
    const housingIndicators = ['selllistcontent', 'ershoufang', 'houseinfo', 'totalprice'];
    let housingFound = 0;
    for (const indicator of housingIndicators) {
        if (html.includes(indicator)) {
            housingFound++;
        }
    }
    
    if (housingFound >= 2) {
        console.log(`   🏠 Housing content found (${housingFound}/4 indicators)`);
    } else {
        console.log(`   ❌ No housing content found (${housingFound}/4 indicators)`);
    }
    
    if (!antiBotFound && housingFound >= 2) {
        console.log(`   ✅ SUCCESS: ${approachName} worked!`);
    } else if (antiBotFound) {
        console.log(`   🛡️  BLOCKED: Anti-bot protection active`);
    } else {
        console.log(`   ⚠️  UNCLEAR: Content validation failed`);
    }
    
    console.log('');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
if (require.main === module) {
    testSpecificUrl().catch(console.error);
}