/**
 * Basic Usage Example
 * 
 * This example demonstrates how to use the Shanghai Real Estate Analyzer
 * for simple data collection and analysis tasks.
 */

const RealEstateAnalyzer = require('../src/main');
const path = require('path');

async function runExample() {
    console.log('🏢 Shanghai Real Estate Analyzer - Basic Example');
    console.log('================================================\n');

    try {
        // Example 1: Quick crawl of Xuhui district
        console.log('🔍 Example 1: Quick Xuhui District Scan');
        console.log('----------------------------------------');
        
        const xuhuiAnalyzer = new RealEstateAnalyzer({
            districts: ['xuhui'],
            maxPages: 2,
            delay: 1000,
            mode: 'crawl'
        });

        await xuhuiAnalyzer.run();
        console.log('✅ Xuhui scan completed!\n');

        // Example 2: Analyze existing data
        console.log('📊 Example 2: Market Trend Analysis');
        console.log('-----------------------------------');
        
        const analyzer = new RealEstateAnalyzer({
            mode: 'analyze',
            dataDir: './data'
        });

        const report = await analyzer.run();
        if (report) {
            console.log('✅ Analysis completed!\n');
        }

        // Example 3: Export data to CSV
        console.log('📤 Example 3: Export Data to CSV');
        console.log('--------------------------------');
        
        await analyzer.exportData('csv');
        console.log('✅ CSV export completed!\n');

        console.log('🎉 All examples completed successfully!');
        console.log('\n📁 Check the ./data directory for results:');
        console.log('   - JSON files with raw data');
        console.log('   - CSV files for spreadsheet analysis');
        console.log('   - Summary reports with market insights');

    } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
    }
}

// Run the example
if (require.main === module) {
    runExample();
}

module.exports = { runExample };