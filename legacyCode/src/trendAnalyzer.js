const fs = require('fs').promises;
const path = require('path');

class TrendAnalyzer {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.trendData = [];
    }

    async loadHistoricalData() {
        try {
            const files = await fs.readdir(this.dataDir);
            const dataFiles = files.filter(file => 
                file.startsWith('shanghai_real_estate_') && file.endsWith('.json')
            ).sort();
            
            console.log(`📊 Loading ${dataFiles.length} historical datasets`);
            
            for (const file of dataFiles) {
                try {
                    const filePath = path.join(this.dataDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    this.trendData.push({
                        date: data.metadata.crawlDate,
                        houses: data.houses,
                        fileName: file
                    });
                } catch (error) {
                    console.warn(`⚠️ Failed to load ${file}:`, error.message);
                }
            }
            
            console.log(`✅ Loaded ${this.trendData.length} datasets for trend analysis`);
            return this.trendData;
            
        } catch (error) {
            console.error('❌ Failed to load historical data:', error.message);
            return [];
        }
    }

    analyzePriceTrends() {
        if (this.trendData.length < 2) {
            console.log('ℹ️ Need at least 2 datasets to analyze trends');
            return null;
        }

        const trends = {
            overall: {},
            byDistrict: {},
            byPropertyType: {},
            timeframe: {
                startDate: this.trendData[0].date,
                endDate: this.trendData[this.trendData.length - 1].date,
                periods: this.trendData.length
            }
        };

        // Overall price trends
        const priceHistory = this.trendData.map(dataset => {
            const avgPrice = dataset.houses.reduce((sum, house) => sum + house.totalPrice, 0) / dataset.houses.length;
            const avgUnitPrice = dataset.houses.reduce((sum, house) => sum + house.unitPrice, 0) / dataset.houses.length;
            
            return {
                date: dataset.date,
                avgPrice: avgPrice,
                avgUnitPrice: avgUnitPrice,
                count: dataset.houses.length
            };
        });

        trends.overall = {
            priceHistory,
            priceChange: this.calculatePercentageChange(priceHistory, 'avgPrice'),
            unitPriceChange: this.calculatePercentageChange(priceHistory, 'avgUnitPrice'),
            volumeChange: this.calculatePercentageChange(priceHistory, 'count')
        };

        // District-level trends
        const districts = [...new Set(this.trendData.flatMap(d => d.houses.map(h => h.district)))];
        
        districts.forEach(district => {
            const districtHistory = this.trendData.map(dataset => {
                const districtHouses = dataset.houses.filter(h => h.district === district);
                if (districtHouses.length === 0) return null;
                
                const avgPrice = districtHouses.reduce((sum, house) => sum + house.totalPrice, 0) / districtHouses.length;
                const avgUnitPrice = districtHouses.reduce((sum, house) => sum + house.unitPrice, 0) / districtHouses.length;
                
                return {
                    date: dataset.date,
                    avgPrice: avgPrice,
                    avgUnitPrice: avgUnitPrice,
                    count: districtHouses.length
                };
            }).filter(Boolean);

            if (districtHistory.length >= 2) {
                trends.byDistrict[district] = {
                    priceHistory: districtHistory,
                    priceChange: this.calculatePercentageChange(districtHistory, 'avgPrice'),
                    unitPriceChange: this.calculatePercentageChange(districtHistory, 'avgUnitPrice'),
                    volumeChange: this.calculatePercentageChange(districtHistory, 'count')
                };
            }
        });

        // Property type trends (based on layout)
        const layouts = [...new Set(this.trendData.flatMap(d => d.houses.map(h => h.layout)))];
        
        layouts.forEach(layout => {
            const layoutHistory = this.trendData.map(dataset => {
                const layoutHouses = dataset.houses.filter(h => h.layout === layout);
                if (layoutHouses.length === 0) return null;
                
                const avgPrice = layoutHouses.reduce((sum, house) => sum + house.totalPrice, 0) / layoutHouses.length;
                const avgUnitPrice = layoutHouses.reduce((sum, house) => sum + house.unitPrice, 0) / layoutHouses.length;
                
                return {
                    date: dataset.date,
                    avgPrice: avgPrice,
                    avgUnitPrice: avgUnitPrice,
                    count: layoutHouses.length
                };
            }).filter(Boolean);

            if (layoutHistory.length >= 2) {
                trends.byPropertyType[layout] = {
                    priceHistory: layoutHistory,
                    priceChange: this.calculatePercentageChange(layoutHistory, 'avgPrice'),
                    unitPriceChange: this.calculatePercentageChange(layoutHistory, 'avgUnitPrice'),
                    volumeChange: this.calculatePercentageChange(layoutHistory, 'count')
                };
            }
        });

        return trends;
    }

    calculatePercentageChange(history, field) {
        if (history.length < 2) return 0;
        
        const firstValue = history[0][field];
        const lastValue = history[history.length - 1][field];
        
        if (firstValue === 0) return 0;
        
        return ((lastValue - firstValue) / firstValue) * 100;
    }

    identifyHotSpots() {
        if (this.trendData.length === 0) return [];

        const latestData = this.trendData[this.trendData.length - 1];
        const previousData = this.trendData.length > 1 ? this.trendData[this.trendData.length - 2] : null;

        const hotSpots = [];

        // Group by district and area
        const districtAreas = {};
        latestData.houses.forEach(house => {
            const key = `${house.district}-${house.area}`;
            if (!districtAreas[key]) {
                districtAreas[key] = {
                    district: house.district,
                    area: house.area,
                    houses: [],
                    avgPrice: 0,
                    avgUnitPrice: 0,
                    count: 0
                };
            }
            districtAreas[key].houses.push(house);
        });

        // Calculate averages for each area
        Object.values(districtAreas).forEach(areaData => {
            areaData.count = areaData.houses.length;
            areaData.avgPrice = areaData.houses.reduce((sum, h) => sum + h.totalPrice, 0) / areaData.count;
            areaData.avgUnitPrice = areaData.houses.reduce((sum, h) => sum + h.unitPrice, 0) / areaData.count;
            
            // Compare with previous period if available
            let priceChange = 0;
            if (previousData) {
                const prevAreaHouses = previousData.houses.filter(h => 
                    h.district === areaData.district && h.area === areaData.area
                );
                if (prevAreaHouses.length > 0) {
                    const prevAvgUnitPrice = prevAreaHouses.reduce((sum, h) => sum + h.unitPrice, 0) / prevAreaHouses.length;
                    priceChange = ((areaData.avgUnitPrice - prevAvgUnitPrice) / prevAvgUnitPrice) * 100;
                }
            }

            hotSpots.push({
                district: areaData.district,
                area: areaData.area,
                count: areaData.count,
                avgPrice: Math.round(areaData.avgPrice),
                avgUnitPrice: Math.round(areaData.avgUnitPrice),
                priceChange: Math.round(priceChange * 100) / 100,
                trend: priceChange > 5 ? 'hot' : priceChange < -5 ? 'cooling' : 'stable'
            });
        });

        // Sort by price change and volume
        return hotSpots.sort((a, b) => {
            // Priority: hot trends first, then high volume, then high price change
            if (a.trend !== b.trend) {
                const trendPriority = { 'hot': 3, 'stable': 2, 'cooling': 1 };
                return trendPriority[b.trend] - trendPriority[a.trend];
            }
            if (a.count !== b.count) {
                return b.count - a.count;
            }
            return Math.abs(b.priceChange) - Math.abs(a.priceChange);
        });
    }

    generateMarketReport() {
        const trends = this.analyzePriceTrends();
        const hotSpots = this.identifyHotSpots();

        if (!trends) {
            return { error: 'Insufficient data for trend analysis' };
        }

        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalPeriods: trends.timeframe.periods,
                dateRange: `${trends.timeframe.startDate} to ${trends.timeframe.endDate}`,
                overallTrend: this.getOverallTrend(trends.overall.priceChange)
            },
            priceAnalysis: {
                overall: {
                    currentAvgPrice: Math.round(trends.overall.priceHistory[trends.overall.priceHistory.length - 1].avgPrice),
                    priceChangePercent: Math.round(trends.overall.priceChange * 100) / 100,
                    volumeChangePercent: Math.round(trends.overall.volumeChange * 100) / 100
                },
                topPerformingDistricts: this.getTopPerformers(trends.byDistrict, 'priceChange', 5),
                bottomPerformingDistricts: this.getBottomPerformers(trends.byDistrict, 'priceChange', 5)
            },
            marketHotSpots: hotSpots.slice(0, 15),
            recommendations: this.generateRecommendations(trends, hotSpots)
        };

        return report;
    }

    getOverallTrend(changePercent) {
        if (changePercent > 10) return 'Rapidly Increasing';
        if (changePercent > 5) return 'Moderately Increasing';
        if (changePercent > 0) return 'Slightly Increasing';
        if (changePercent > -5) return 'Stable';
        if (changePercent > -10) return 'Moderately Decreasing';
        return 'Rapidly Decreasing';
    }

    getTopPerformers(data, metric, limit) {
        return Object.entries(data)
            .filter(([, stats]) => stats[metric] !== undefined)
            .sort(([,a], [,b]) => b[metric] - a[metric])
            .slice(0, limit)
            .map(([key, stats]) => ({
                district: key,
                changePercent: Math.round(stats[metric] * 100) / 100,
                currentValue: Math.round(stats.priceHistory[stats.priceHistory.length - 1].avgUnitPrice)
            }));
    }

    getBottomPerformers(data, metric, limit) {
        return Object.entries(data)
            .filter(([, stats]) => stats[metric] !== undefined)
            .sort(([,a], [,b]) => a[metric] - b[metric])
            .slice(0, limit)
            .map(([key, stats]) => ({
                district: key,
                changePercent: Math.round(stats[metric] * 100) / 100,
                currentValue: Math.round(stats.priceHistory[stats.priceHistory.length - 1].avgUnitPrice)
            }));
    }

    generateRecommendations(trends, hotSpots) {
        const recommendations = [];

        // Price trend recommendations
        const overallChange = trends.overall.priceChange;
        if (overallChange > 10) {
            recommendations.push('Market is rapidly appreciating - consider selling if you own property');
        } else if (overallChange > 0) {
            recommendations.push('Market showing positive momentum - good time for investment');
        } else if (overallChange < -10) {
            recommendations.push('Market declining significantly - consider waiting for better entry point');
        }

        // Hot spot recommendations
        const hotAreas = hotSpots.filter(spot => spot.trend === 'hot');
        if (hotAreas.length > 0) {
            recommendations.push(`Hot areas identified: ${hotAreas.slice(0, 3).map(h => `${h.district}-${h.area}`).join(', ')}`);
        }

        // Volume trend recommendations
        const volumeChange = trends.overall.volumeChange;
        if (volumeChange > 20) {
            recommendations.push('High trading volume indicates strong market activity');
        } else if (volumeChange < -20) {
            recommendations.push('Low trading volume may indicate market uncertainty');
        }

        return recommendations;
    }

    async saveReport(report) {
        try {
            const filename = `market_report_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            console.log(`📋 Market report saved: ${filepath}`);
            return filepath;
        } catch (error) {
            console.error('❌ Failed to save report:', error.message);
            return null;
        }
    }
}

module.exports = TrendAnalyzer;