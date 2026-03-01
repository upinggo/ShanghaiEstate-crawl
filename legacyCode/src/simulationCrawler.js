const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class SimulationCrawler {
    constructor(options = {}) {
        this.dataDir = options.dataDir || './data';
        this.districts = options.districts || ['xuhui', 'pudong', 'huangpu'];
        this.simulationMode = options.simulationMode || 'sample'; // 'sample', 'trend', 'random'
    }

    async crawlAllDistricts() {
        logger.info('Starting simulation mode crawl', { 
            mode: this.simulationMode,
            districts: this.districts 
        });
        
        console.log('🎮 Starting simulation mode (website unavailable)');
        console.log('===============================================\n');

        const allData = {
            metadata: {
                crawlDate: new Date().toISOString(),
                districts: this.districts,
                version: 'simulation-v1',
                dataSource: 'simulated',
                simulationMode: this.simulationMode
            },
            houses: []
        };

        console.log(`📍 Simulating data for districts: ${this.districts.join(', ')}`);

        for (const district of this.districts) {
            const houses = this.generateSimulatedData(district);
            allData.houses.push(...houses);
            
            console.log(`📊 ${district}: ${houses.length} simulated houses`);
            await this.saveDistrictData(district, houses);
        }

        await this.saveFinalData(allData);
        await this.generateSummary(allData);

        logger.info('Simulation completed', { totalHouses: allData.houses.length });
        console.log(`\n🎉 Simulation completed!`);
        console.log(`📈 Houses generated: ${allData.houses.length}`);

        return allData;
    }

    generateSimulatedData(district) {
        const houses = [];
        const count = this.getDistrictHouseCount(district);
        
        // District-specific base prices (yuan per square meter)
        const basePrices = {
            'xuhui': 120000,
            'pudong': 95000,
            'huangpu': 135000,
            'jingan': 110000,
            'changning': 98000,
            'putuo': 75000,
            'hongkou': 70000,
            'yangpu': 68000,
            'minhang': 65000,
            'baoshan': 55000,
            'jiading': 48000,
            'jinshan': 35000
        };

        const basePrice = basePrices[district] || 60000;
        const areas = this.getDistrictAreas(district);

        for (let i = 0; i < count; i++) {
            const area = areas[Math.floor(Math.random() * areas.length)];
            const square = this.getRandomSquare();
            const pricePerSquare = this.getRandomPrice(basePrice);
            const totalPrice = Math.round((pricePerSquare * square) / 10000);
            
            houses.push({
                district: district,
                area: area,
                community: this.generateCommunityName(district, area),
                title: this.generateTitle(district, area, square),
                totalPrice: totalPrice,
                unitPrice: pricePerSquare,
                square: square,
                layout: this.getRandomLayout(),
                direction: this.getRandomDirection(),
                decoration: this.getRandomDecoration(),
                floor: this.getRandomFloor(),
                year: this.getRandomYear(),
                page: Math.floor(i / 30) + 1,
                timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        return houses;
    }

    getDistrictHouseCount(district) {
        const counts = {
            'xuhui': 150,
            'pudong': 200,
            'huangpu': 120,
            'jingan': 100,
            'changning': 90,
            'putuo': 180,
            'hongkou': 160,
            'yangpu': 140,
            'minhang': 250,
            'baoshan': 220,
            'jiading': 180,
            'jinshan': 80
        };
        return counts[district] || 100;
    }

    getDistrictAreas(district) {
        const areaMap = {
            'xuhui': ['徐汇滨江', '漕河泾', '万体馆', '复兴西路', '衡山路'],
            'pudong': ['陆家嘴', '世纪公园', '张江', '金桥', '外高桥', '塘桥'],
            'huangpu': ['人民广场', '南京东路', '豫园', '新天地', '淮海中路'],
            'jingan': ['静安寺', '南京西路', '苏州河', '大宁'],
            'changning': ['中山公园', '古北', '虹桥', '天山'],
            'putuo': ['长寿路', '曹杨', '真如', '桃浦'],
            'hongkou': ['北外滩', '四川北路', '凉城', '江湾'],
            'yangpu': ['五角场', '新江湾城', '控江路', '黄兴公园']
        };
        return areaMap[district] || ['中心区域', '周边区域'];
    }

    getRandomSquare() {
        const sizes = [50, 60, 70, 80, 90, 100, 120, 150, 180, 200];
        return sizes[Math.floor(Math.random() * sizes.length)];
    }

    getRandomPrice(basePrice) {
        const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
        return Math.round(basePrice * (1 + variation));
    }

    generateCommunityName(district, area) {
        const prefixes = ['绿城', '万科', '保利', '融创', '龙湖', '华润', '中海', '碧桂园'];
        const suffixes = ['花园', '公寓', '小区', '苑', '庭', '府', '城'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return `${prefix}${area}${suffix}`;
    }

    generateTitle(district, area, square) {
        const layouts = ['一室一厅', '两室一厅', '两室两厅', '三室一厅', '三室两厅', '四室两厅'];
        const layout = layouts[Math.floor(Math.random() * layouts.length)];
        return `${district}${area}${square}㎡${layout}精装修`;
    }

    getRandomLayout() {
        const layouts = ['1室1厅', '2室1厅', '2室2厅', '3室1厅', '3室2厅', '4室2厅'];
        return layouts[Math.floor(Math.random() * layouts.length)];
    }

    getRandomDirection() {
        const directions = ['南', '南北', '东南', '西南', '东', '西'];
        return directions[Math.floor(Math.random() * directions.length)];
    }

    getRandomDecoration() {
        const decorations = ['精装修', '简装修', '毛坯', '豪华装修'];
        return decorations[Math.floor(Math.random() * decorations.length)];
    }

    getRandomFloor() {
        const floors = ['低楼层', '中楼层', '高楼层'];
        return floors[Math.floor(Math.random() * floors.length)];
    }

    getRandomYear() {
        return 2000 + Math.floor(Math.random() * 24); // 2000-2023
    }

    async saveDistrictData(district, houses) {
        try {
            const filename = `houses_${district}_simulated_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify({
                district,
                date: new Date().toISOString(),
                count: houses.length,
                houses,
                dataSource: 'simulated'
            }, null, 2));
            
            logger.info('Saved simulated district data', { district, count: houses.length });
        } catch (error) {
            logger.error('Failed saving simulated data', { district, error: error.message });
        }
    }

    async saveFinalData(data) {
        try {
            const filename = `shanghai_real_estate_simulated_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.dataDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            logger.info('Saved final simulated data', { houses: data.houses.length });
            console.log(`💾 Final simulated data saved`);
        } catch (error) {
            logger.error('Final save failed', { error: error.message });
        }
    }

    async generateSummary(data) {
        try {
            const summary = {
                totalHouses: data.houses.length,
                districts: {},
                averagePrice: 0,
                crawlDate: data.metadata.crawlDate,
                dataSource: 'simulated'
            };

            let totalPrice = 0;
            
            data.houses.forEach(house => {
                totalPrice += house.totalPrice;
                
                if (!summary.districts[house.district]) {
                    summary.districts[house.district] = { 
                        count: 0, 
                        totalPrice: 0, 
                        totalSquare: 0 
                    };
                }
                
                summary.districts[house.district].count++;
                summary.districts[house.district].totalPrice += house.totalPrice;
                summary.districts[house.district].totalSquare += house.square;
            });

            summary.averagePrice = totalPrice / data.houses.length;

            Object.keys(summary.districts).forEach(district => {
                const stats = summary.districts[district];
                summary.districts[district] = {
                    count: stats.count,
                    avgPrice: Math.round(stats.totalPrice / stats.count),
                    avgSquare: Math.round(stats.totalSquare / stats.count),
                    avgUnitPrice: Math.round((stats.totalPrice * 10000) / stats.totalSquare)
                };
            });

            const summaryFile = path.join(this.dataDir, `simulation_summary_${new Date().toISOString().split('T')[0]}.json`);
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            
            logger.info('Generated simulation summary', { districts: Object.keys(summary.districts).length });
            console.log(`📊 Simulation summary generated`);

        } catch (error) {
            logger.error('Summary generation failed', { error: error.message });
        }
    }
}

module.exports = SimulationCrawler;