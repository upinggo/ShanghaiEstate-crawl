const https = require('https');
const cheerio = require('cheerio');

async function testWebsite() {
    console.log('🔍 Testing Lianjia Website Access...\n');
    
    const urls = [
        'https://sh.lianjia.com/ershoufang/xuhui/',
        'https://sh.lianjia.com/ershoufang/pudong/',
        'https://sh.lianjia.com/'
    ];

    for (const url of urls) {
        try {
            console.log(`Testing: ${url}`);
            
            const html = await new Promise((resolve, reject) => {
                https.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                }).on('error', reject);
            });

            const $ = cheerio.load(html);
            
            // Check page title
            const title = $('title').text();
            console.log(`  Title: ${title}`);
            
            // Check for common elements
            const listings = $('.sellListContent .clear, .listContent .listItem, .house-list .item').length;
            console.log(`  Listings found: ${listings}`);
            
            // Check for anti-bot protection
            const hasCaptcha = $('body').text().includes('验证码') || $('title').text().includes('验证');
            console.log(`  Anti-bot protection: ${hasCaptcha ? 'YES' : 'NO'}`);
            
            // Show page snippet
            const bodyText = $('body').text().substring(0, 200);
            console.log(`  Body preview: ${bodyText}...`);
            
            console.log('');

        } catch (error) {
            console.log(`  ❌ Error: ${error.message}\n`);
        }
    }
}

testWebsite();