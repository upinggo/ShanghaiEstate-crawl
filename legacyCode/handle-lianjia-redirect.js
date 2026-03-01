#!/usr/bin/env node

/**
 * Specialized Handler for Lianjia Anti-Bot Redirects
 * Specifically handles the 302 redirect issue with https://sh.lianjia.com/ershoufang/xuhui/pg1
 */

const https = require('https');
const http = require('http');

async function handleLianjiaRedirect() {
    console.log('🔄 Lianjia Anti-Bot Redirect Handler');
    console.log('===================================\n');
    
    const targetUrl = 'https://sh.lianjia.com/ershoufang/xuhui/pg1';
    console.log(`🎯 Target: ${targetUrl}\n`);
    
    // Test multiple approaches to handle the redirect
    const approaches = [
        { name: 'Follow Redirect Chain', func: followRedirectChain },
        { name: 'Direct Mobile Endpoint', func: tryMobileEndpoint },
        { name: 'Alternative Domain Access', func: tryAlternativeDomains },
        { name: 'Session Establishment', func: establishSessionFirst }
    ];
    
    for (const approach of approaches) {
        console.log(`🔧 ${approach.name}:`);
        try {
            const result = await approach.func();
            if (result.success) {
                console.log(`   ✅ SUCCESS: ${result.message}`);
                if (result.data) {
                    console.log(`   📊 Data extracted: ${result.data.length} characters`);
                    if (result.houses && result.houses.length > 0) {
                        console.log(`   🏠 Houses found: ${result.houses.length}`);
                        result.houses.slice(0, 2).forEach((house, i) => {
                            console.log(`      ${i+1}. ${house.title || 'Unknown'} - ${house.price || 'N/A'}`);
                        });
                    }
                }
                return result;
            } else {
                console.log(`   ❌ Failed: ${result.message}`);
            }
        } catch (error) {
            console.log(`   ⚠️  Error: ${error.message}`);
        }
        console.log('');
        await sleep(3000);
    }
    
    console.log('🛡️  All approaches failed - Anti-bot protection is active');
    return { success: false, message: 'Unable to bypass anti-bot protection' };
}

async function followRedirectChain() {
    console.log('   Following redirect chain...');
    
    let currentUrl = 'https://sh.lianjia.com/ershoufang/xuhui/pg1';
    let redirectCount = 0;
    const maxRedirects = 5;
    
    while (redirectCount < maxRedirects) {
        const response = await makeRequest(currentUrl);
        
        if (response.statusCode === 200) {
            // Success - we reached the final destination
            const houses = extractHousingData(response.body);
            return {
                success: true,
                message: `Reached final page after ${redirectCount} redirects`,
                data: response.body,
                houses: houses
            };
        } else if (response.statusCode === 302 || response.statusCode === 301) {
            // Handle redirect
            const location = response.headers.location;
            if (location) {
                currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
                console.log(`   → Redirected to: ${currentUrl}`);
                redirectCount++;
            } else {
                return { success: false, message: 'Redirect without location header' };
            }
        } else {
            return { success: false, message: `Unexpected status: ${response.statusCode}` };
        }
    }
    
    return { success: false, message: `Too many redirects (${redirectCount})` };
}

async function tryMobileEndpoint() {
    console.log('   Trying mobile endpoint...');
    
    const mobileUrls = [
        'https://m.lianjia.com/sh/ershoufang/xuhui/',
        'https://m.lianjia.com/sh/ershoufang/xuhui/pg1/',
        'https://m.lianjia.com/sh/ershoufang/xuhui/pg1'
    ];
    
    for (const url of mobileUrls) {
        try {
            console.log(`   → Testing: ${url}`);
            const response = await makeEnhancedRequest(url, 'mobile');
            
            if (response.statusCode === 200 && response.body.length > 1000) {
                const houses = extractHousingData(response.body);
                if (houses.length > 0) {
                    return {
                        success: true,
                        message: 'Mobile endpoint accessible',
                        data: response.body,
                        houses: houses
                    };
                }
            }
        } catch (error) {
            console.log(`   → Failed: ${error.message}`);
        }
    }
    
    return { success: false, message: 'Mobile endpoints not accessible' };
}

async function tryAlternativeDomains() {
    console.log('   Trying alternative domains...');
    
    const alternativeUrls = [
        'https://sh.ke.com/ershoufang/xuhui/pg1',
        'https://www.lianjia.com/city/shanghai/ershoufang/xuhui/pg1',
        'https://sh.centanet.com/esf/xuhui/pg1'
    ];
    
    for (const url of alternativeUrls) {
        try {
            console.log(`   → Testing: ${url}`);
            const response = await makeEnhancedRequest(url, 'desktop');
            
            if (response.statusCode === 200 && response.body.length > 1000) {
                const houses = extractHousingData(response.body);
                if (houses.length > 0) {
                    return {
                        success: true,
                        message: 'Alternative domain accessible',
                        data: response.body,
                        houses: houses
                    };
                }
            }
        } catch (error) {
            console.log(`   → Failed: ${error.message}`);
        }
    }
    
    return { success: false, message: 'Alternative domains not accessible' };
}

async function establishSessionFirst() {
    console.log('   Establishing session first...');
    
    // Try visiting homepage first to establish session
    try {
        console.log('   → Visiting homepage...');
        const homeResponse = await makeEnhancedRequest('https://sh.lianjia.com/', 'desktop');
        
        if (homeResponse.statusCode === 200) {
            console.log('   → Homepage accessible, now trying target page...');
            await sleep(2000);
            
            const targetResponse = await makeEnhancedRequest('https://sh.lianjia.com/ershoufang/xuhui/pg1', 'desktop');
            
            if (targetResponse.statusCode === 200 && targetResponse.body.length > 1000) {
                const houses = extractHousingData(targetResponse.body);
                if (houses.length > 0) {
                    return {
                        success: true,
                        message: 'Session establishment successful',
                        data: targetResponse.body,
                        houses: houses
                    };
                }
            }
        }
    } catch (error) {
        console.log(`   → Session establishment failed: ${error.message}`);
    }
    
    return { success: false, message: 'Session establishment failed' };
}

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            timeout: 15000
        };

        const req = lib.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
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

function makeEnhancedRequest(url, type = 'desktop') {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        };
        
        if (type === 'mobile') {
            headers['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1';
            headers['Sec-Ch-Ua-Mobile'] = '?1';
        } else {
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
            headers['Sec-Ch-Ua'] = '"Chromium";v="122", "Not(A:Brand";v="24"';
            headers['Sec-Ch-Ua-Mobile'] = '?0';
            headers['Sec-Ch-Ua-Platform'] = '"Windows"';
        }

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: headers,
            timeout: 20000
        };

        const req = lib.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
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

function extractHousingData(html) {
    if (!html || html.length < 100) return [];
    
    const houses = [];
    const patterns = [
        /<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/gi,
        /<span[^>]*class="[^"]*totalPrice[^"]*"[^>]*>(.*?)<\/span>/gi,
        /(\d+)室(\d+)厅/gi
    ];
    
    // Simple pattern matching for demonstration
    let match;
    while ((match = patterns[0].exec(html)) !== null) {
        if (match[1].includes('万') || match[1].includes('室')) {
            houses.push({
                title: match[1].substring(0, 50),
                price: match[1].includes('万') ? match[1] : 'N/A'
            });
        }
    }
    
    return houses.slice(0, 5); // Return first 5 matches
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the handler
if (require.main === module) {
    handleLianjiaRedirect().then(result => {
        console.log('\n📋 Final Result:');
        console.log('===============');
        console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
        console.log(`Message: ${result.message}`);
    }).catch(console.error);
}