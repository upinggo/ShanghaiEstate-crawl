/**
 * Comprehensive Demo - Shanghai Real Estate Analyzer
 * 
 * This demo showcases all the features of the real estate analyzer:
 * 1. Data collection (simulation mode)
 * 2. Multi-period trend analysis
 * 3. Market reporting
 * 4. Data export capabilities
 */

const RealEstateAnalyzer = require('../src/main');
const fs = require('fs').promises;
const path = require('path');

async function runComprehensiveDemo() {
    console.log('🏢 Shanghai Real Estate Analyzer - Comprehensive Demo');
    console.log('====================================================\n');

    try {
        // Phase 1: Generate multiple time periods of simulated data
        console.log('📊 Phase 1: Generating Historical Data Sets');
        console.log('------------------------------------------');
        
        // Generate 3 different time periods with varying market conditions
        const timePeriods = [
            { name: 'baseline', districts: ['xuhui', 'pudong'], modifier: 1.0 },
            { name: 'growth', districts: ['xuhui', 'pudong', 'huangpu'], modifier: 1.1 }, // 10% growth
            { name: 'premium', districts: ['xuhui', 'huangpu', 'jingan'], modifier: 1.2 }  // 20% growth
        ];

        for (const period of timePeriods) {
            console.log(`\n📅 Generating ${period.name} period data...`);
            
            const analyzer = new RealEstateAnalyzer({
                mode: 'crawl',
                crawlerType: 'simulation',
                districts: period.districts,
                simulationModifier: period.modifier
            });

            await analyzer.run();
            console.log(`✅ ${period.name} period completed`);
            
            // Wait between periods to create time separation
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Phase 2: Analyze trends across all periods
        console.log('\n\n📈 Phase 2: Trend Analysis Across Periods');
        console.log('----------------------------------------');
        
        const trendAnalyzer = new RealEstateAnalyzer({
            mode: 'analyze'
        });

        const report = await trendAnalyzer.run();
        
        if (report) {
            console.log('\n✅ Trend analysis completed!');
        }

        // Phase 3: Export data in multiple formats
        console.log('\n\n📤 Phase 3: Data Export');
        console.log('----------------------');
        
        await trendAnalyzer.exportData('csv');
        await trendAnalyzer.exportData('excel');
        
        console.log('\n✅ All exports completed!');

        // Phase 4: Show data insights
        console.log('\n\n🔍 Phase 4: Data Insights');
        console.log('------------------------');
        
        await showDataInsights();

        console.log('\n\n🎉 Comprehensive Demo Completed Successfully!');
        console.log('\n📁 Files generated in ./data/:');
        console.log('   • JSON data files with raw housing data');
        console.log('   • CSV exports for spreadsheet analysis');
        console.log('   • Excel files for professional reporting');
        console.log('   • Market analysis reports');
        console.log('   • Summary statistics');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    }
}

async function showDataInsights() {
    try {
        const dataDir = './data';
        const files = await fs.readdir(dataDir);
        
        // Find the latest summary file
        const summaryFiles = files.filter(f => f.startsWith('simulation_summary_') && f.endsWith('.json'));
        if (summaryFiles.length > 0) {
            const latestSummary = summaryFiles.sort().pop();
            const summaryData = JSON.parse(await fs.readFile(path.join(dataDir, latestSummary), 'utf8'));
            
            console.log('📊 Latest Market Summary:');
            console.log(`   Total Houses: ${summaryData.totalHouses}`);
            console.log(`   Average Price: ¥${summaryData.averagePrice.toLocaleString()}`);
            console.log(`   Districts Covered: ${Object.keys(summaryData.districts).length}`);
            
            console.log('\n🏆 Top Districts by Average Unit Price:');
            const sortedDistricts = Object.entries(summaryData.districts)
                .sort(([,a], [,b]) => b.avgUnitPrice - a.avgUnitPrice)
                .slice(0, 5);
                
            sortedDistricts.forEach(([district, stats], index) => {
                console.log(`   ${index + 1}. ${district}: ¥${stats.avgUnitPrice.toLocaleString()}/㎡ (${stats.count} listings)`);
            });
        }

        // Count total data files
        const jsonDataFiles = files.filter(f => f.startsWith('shanghai_real_estate_simulated_') && f.endsWith('.json'));
        const csvFiles = files.filter(f => f.endsWith('.csv'));
        const excelFiles = files.filter(f => f.endsWith('.xlsx'));
        
        console.log(`\n📁 Data Repository Status:`);
        console.log(`   JSON Datasets: ${jsonDataFiles.length}`);
        console.log(`   CSV Exports: ${csvFiles.length}`);
        console.log(`   Excel Files: ${excelFiles.length}`);

    } catch (error) {
        console.log('ℹ️  Could not generate insights:', error.message);
    }
}

// Run the demo
if (require.main === module) {
    runComprehensiveDemo();
}

module.exports = { runComprehensiveDemo };