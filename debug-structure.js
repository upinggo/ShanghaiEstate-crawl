const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

async function debugWebsiteStructure() {
    console.log('🔍 Detailed Website Structure Analysis\n');
    
    const client = axios.create({
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }
    });

    try {
        // Visit homepage first
        console.log('1. Visiting homepage...');
        const homeResponse = await client.get('https://sh.lianjia.com/');
        console.log(`   Status: ${homeResponse.status}`);
        console.log(`   Title: ${cheerio.load(homeResponse.data)('title').text()}`);
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Visit district page
        console.log('\n2. Visiting Xuhui district page...');
        const districtResponse = await client.get('https://sh.lianjia.com/ershoufang/xuhui/');
        console.log(`   Status: ${districtResponse.status}`);
        
        const $ = cheerio.load(districtResponse.data);
        const title = $('title').text();
        console.log(`   Title: ${title}`);
        
        // Check for anti-bot
        const bodyText = $('body').text();
        const hasCaptcha = bodyText.includes('验证码') || title.includes('验证');
        console.log(`   Anti-bot protection: ${hasCaptcha ? 'YES' : 'NO'}`);
        
        // Save HTML for inspection
        await fs.writeFile('./debug_page.html', districtResponse.data);
        console.log('   Full HTML saved to debug_page.html');
        
        // Look for common listing containers
        console.log('\n3. Searching for listing containers...');
        
        const selectors = [
            '.sellListContent',
            '.listContent', 
            '.house-list',
            '[class*="list"]',
            '.content',
            '#content',
            '.main-content'
        ];
        
        selectors.forEach(selector => {
            const elements = $(selector);
            console.log(`   ${selector}: ${elements.length} elements`);
        });
        
        // Look for individual listings
        console.log('\n4. Searching for individual listings...');
        
        const itemSelectors = [
            '.clear',
            '.item',
            '.listItem',
            '[class*="item"]',
            '.house',
            '[class*="house"]'
        ];
        
        itemSelectors.forEach(selector => {
            const elements = $(selector);
            console.log(`   ${selector}: ${elements.length} elements`);
            if (elements.length > 0 && elements.length < 20) {
                elements.each((i, el) => {
                    const text = $(el).text().substring(0, 100).replace(/\s+/g, ' ').trim();
                    console.log(`     ${i+1}. ${text}...`);
                });
            }
        });
        
        // Check for price-related elements
        console.log('\n5. Searching for price elements...');
        
        const priceSelectors = [
            '.price',
            '.totalPrice',
            '.unitPrice',
            '[class*="price"]',
            '.money',
            '[class*="money"]'
        ];
        
        priceSelectors.forEach(selector => {
            const elements = $(selector);
            console.log(`   ${selector}: ${elements.length} elements`);
        });
        
        // Show page structure
        console.log('\n6. Page structure overview:');
        console.log(`   Body classes: ${$('body').attr('class')}`);
        console.log(`   Body ID: ${$('body').attr('id')}`);
        console.log(`   Content length: ${bodyText.length} characters`);
        
        // Show first part of body content
        console.log('\n7. Body content preview:');
        console.log(bodyText.substring(0, 500) + '...');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
        }
    }
}

debugWebsiteStructure();