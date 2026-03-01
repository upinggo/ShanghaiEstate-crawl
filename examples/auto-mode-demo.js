/**
 * Auto Mode Demo - Demonstrates automatic crawler selection
 * 
 * This demo shows how the system automatically detects whether
 * to use live crawling or simulation mode based on website availability.
 */

const RealEstateAnalyzer = require('../src/main');

async function runAutoModeDemo() {
    console.log('🤖 Auto Mode Detection Demo');
    console.log('===========================\n');

    console.log('🎯 The system will automatically:');
    console.log('   1. Attempt live website crawling');
    console.log('   2. Detect if website is accessible');
    console.log('   3. Fall back to simulation if needed');
    console.log('   4. Continue with analysis regardless\n');

    try {
        // Run with auto mode (default behavior)
        console.log('🚀 Starting auto mode analysis...\n');
        
        const analyzer = new RealEstateAnalyzer({
            mode: 'both',  // crawl + analyze
            districts: ['xuhui', 'pudong'],
            maxPages: 1
        });

        const result = await analyzer.run();
        
        if (result) {
            console.log('\n✅ Auto mode completed successfully!');
            
            // Show which mode was actually used
            const dataFiles = result.houses || [];
            const isSimulated = result.metadata?.dataSource === 'simulated';
            
            console.log('\n📊 Execution Summary:');
            console.log(`   Mode Used: ${isSimulated ? '_simulation_' : '_live crawling_'}`);
            console.log(`   Houses Processed: ${dataFiles.length}`);
            console.log(`   Districts: ${(result.metadata?.districts || []).join(', ')}`);
            
            if (isSimulated) {
                console.log('   ℹ️  Live website was unavailable, used simulation mode');
            } else {
                console.log('   ✅ Live website data was successfully collected');
            }
        }

    } catch (error) {
        console.error('❌ Auto mode demo failed:', error.message);
    }
}

if (require.main === module) {
    runAutoModeDemo();
}

module.exports = { runAutoModeDemo };