#!/usr/bin/env node

/**
 * Lianjia Ban URL Decoder and Analyzer
 * Utility to decode and analyze anti-bot ban URLs
 */

function decodeBanUrl(banUrl) {
    try {
        const url = new URL(banUrl);
        const params = new URLSearchParams(url.search);
        
        const banInfo = {
            url: banUrl,
            baseUrl: `${url.protocol}//${url.host}${url.pathname}`,
            id: params.get('id') || 'unknown',
            reason: params.get('reason') ? decodeURIComponent(params.get('reason')) : 'No reason provided',
            timestamp: new Date().toISOString()
        };
        
        return banInfo;
    } catch (error) {
        return {
            url: banUrl,
            error: `Invalid URL format: ${error.message}`,
            timestamp: new Date().toISOString()
        };
    }
}

function analyzeBanReason(reason) {
    const analysis = {
        isAutomatedToolDetection: false,
        isRateLimiting: false,
        isIPBlocking: false,
        severity: 'unknown',
        suggestedActions: []
    };
    
    if (!reason) return analysis;
    
    const lowerReason = reason.toLowerCase();
    
    // Detect automated tool usage
    if (lowerReason.includes('自动化') || 
        lowerReason.includes('automatic') || 
        lowerReason.includes('bot') || 
        lowerReason.includes('spider')) {
        analysis.isAutomatedToolDetection = true;
        analysis.severity = 'high';
        analysis.suggestedActions = [
            'Use different account/IP',
            'Implement browser fingerprinting',
            'Add realistic delays',
            'Try mobile endpoints'
        ];
    }
    
    // Detect rate limiting
    if (lowerReason.includes('频繁') || 
        lowerReason.includes('rate') || 
        lowerReason.includes('limit') || 
        lowerReason.includes('often')) {
        analysis.isRateLimiting = true;
        analysis.severity = 'medium';
        analysis.suggestedActions = [
            'Increase request delays',
            'Implement exponential backoff',
            'Use request queuing'
        ];
    }
    
    // Detect IP blocking
    if (lowerReason.includes('ip') || 
        lowerReason.includes('地址') || 
        lowerReason.includes('location')) {
        analysis.isIPBlocking = true;
        analysis.severity = 'high';
        analysis.suggestedActions = [
            'Use proxy rotation',
            'Change IP address',
            'Try different geographic locations'
        ];
    }
    
    return analysis;
}

function formatBanInfo(banInfo) {
    console.log('🛡️  Lianjia Anti-Bot Ban Analysis');
    console.log('==================================\n');
    
    if (banInfo.error) {
        console.log(`❌ Error: ${banInfo.error}`);
        return;
    }
    
    console.log(`🆔 Ban ID: ${banInfo.id}`);
    console.log(`📅 Timestamp: ${banInfo.timestamp}`);
    console.log(`🔗 Ban URL: ${banInfo.url}`);
    console.log(`🌐 Base URL: ${banInfo.baseUrl}`);
    console.log(`📝 Reason: ${banInfo.reason}\n`);
    
    // Analyze the reason
    const analysis = analyzeBanReason(banInfo.reason);
    
    console.log('📊 Analysis Results:');
    console.log('===================');
    console.log(`🤖 Automated Tool Detection: ${analysis.isAutomatedToolDetection ? 'YES' : 'NO'}`);
    console.log(`⏱️  Rate Limiting: ${analysis.isRateLimiting ? 'YES' : 'NO'}`);
    console.log(`🌐 IP Blocking: ${analysis.isIPBlocking ? 'YES' : 'NO'}`);
    console.log(`⚠️  Severity: ${analysis.severity.toUpperCase()}\n`);
    
    if (analysis.suggestedActions.length > 0) {
        console.log('💡 Recommended Actions:');
        console.log('======================');
        analysis.suggestedActions.forEach((action, index) => {
            console.log(`${index + 1}. ${action}`);
        });
    }
    
    console.log('\n📋 Technical Details:');
    console.log('====================');
    console.log('Current anti-bot protection appears to be ACCOUNT-BASED blocking.');
    console.log('This means the specific account/identity has been permanently banned.');
    console.log('To continue data collection, you will need:');
    console.log('- A different account/IP combination');
    console.log('- Enhanced browser simulation');
    console.log('- Proper session management');
    console.log('- Ethical request timing');
}

// Command line interface
function main() {
    const args = process.argv.slice(2);
    
    let banUrl = 'https://hip.lianjia.com/forbidden?id=a102733513a84d21a75eb6f01ca8e5ee&reason=%E6%8A%B1%E6%AD%89%EF%BC%8C%E6%88%91%E4%BB%AC%E6%A3%80%E6%B5%8B%E5%88%B0%E6%82%A8%E7%9A%84%E8%B4%A6%E5%8F%B7%E5%9C%A8%E8%BF%87%E5%8E%BB%E4%BD%BF%E7%94%A8%E4%BA%86%E8%87%AA%E5%8A%A8%E5%8C%96%E5%B7%A5%E5%85%B7%E3%80%82%E4%B8%BA%E4%BA%86%E4%BF%9D%E6%8A%A4%E7%AB%99%E7%82%B9%E5%AE%89%E5%85%A8%EF%BC%8C%E6%82%A8%E7%9A%84%E5%B8%90%E5%8F%B7%E5%B7%B2%E8%A2%AB%E5%B0%81%E7%A6%81%E3%80%82';
    
    // Parse command line arguments
    if (args.length > 0 && !args[0].startsWith('--')) {
        banUrl = args[0];
    }
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--url' && args[i + 1]) {
            banUrl = args[i + 1];
            i++;
        }
    }
    
    const banInfo = decodeBanUrl(banUrl);
    formatBanInfo(banInfo);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { decodeBanUrl, analyzeBanReason, formatBanInfo };