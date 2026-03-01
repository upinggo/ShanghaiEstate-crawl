#!/usr/bin/env python3
"""
上海房产爬虫系统演示脚本
展示系统核心功能和架构设计
"""

import sqlite3
import json
import random
from datetime import datetime, timedelta
import os

def create_demo_database(db_name="demo_shanghai_houses.db"):
    """创建演示数据库"""
    print("🔧 创建演示数据库...")
    
    conn = sqlite3.connect(db_name)
    c = conn.cursor()
    
    # 创建房源表
    c.execute('''
        CREATE TABLE IF NOT EXISTS house_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            community_id TEXT,
            community_name TEXT,
            district TEXT,
            title TEXT,
            total_price REAL,
            unit_price REAL,
            area REAL,
            floor_info TEXT,
            house_type TEXT,
            crawl_date DATE,
            source_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 创建统计表
    c.execute('''
        CREATE TABLE IF NOT EXISTS crawl_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crawl_date DATE,
            district TEXT,
            total_listings INTEGER,
            avg_price REAL,
            min_price REAL,
            max_price REAL
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"✅ 数据库 {db_name} 创建完成")
    return db_name

def generate_demo_data(db_name, days=30):
    """生成演示数据"""
    print(f"📊 生成 {days} 天的演示数据...")
    
    districts = ["黄浦", "静安", "徐汇", "长宁", "虹口", "杨浦", "浦东", "闵行"]
    communities = [
        "绿城雅居", "万科城市花园", "保利国际", "融创壹号院", 
        "中海寰宇天下", "华润幸福里", "龙湖天街", "金地自在城"
    ]
    
    house_types = ["2室1厅", "3室2厅", "1室1厅", "4室2厅"]
    floor_infos = ["高层/共30层", "中层/共18层", "低层/共6层"]
    
    conn = sqlite3.connect(db_name)
    c = conn.cursor()
    
    # 生成历史数据
    for i in range(days):
        crawl_date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        
        for district in districts:
            # 每个区域每天生成3-8条数据
            listing_count = random.randint(3, 8)
            
            for j in range(listing_count):
                community = random.choice(communities)
                house_type = random.choice(house_types)
                floor_info = random.choice(floor_infos)
                
                # 生成合理的价格范围（根据不同区域）
                base_prices = {
                    "黄浦": 120000, "静安": 110000, "徐汇": 95000,
                    "长宁": 85000, "虹口": 75000, "杨浦": 70000,
                    "浦东": 80000, "闵行": 65000
                }
                
                base_price = base_prices.get(district, 70000)
                # 添加随机波动 ±20%
                price_multiplier = random.uniform(0.8, 1.2)
                unit_price = int(base_price * price_multiplier)
                
                # 生成合理面积
                area = random.uniform(50, 150)
                total_price = round(unit_price * area / 10000, 2)
                
                title = f"{community} {house_type} {int(area)}平 {unit_price}元/平"
                
                c.execute('''
                    INSERT INTO house_listings 
                    (community_id, community_name, district, title, total_price, unit_price, 
                     area, floor_info, house_type, crawl_date, source_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    f"{community}_{hash(community) % 1000}",
                    community,
                    district,
                    title,
                    total_price,
                    unit_price,
                    area,
                    floor_info,
                    house_type,
                    crawl_date,
                    f"https://example.com/house/{random.randint(1000, 9999)}"
                ))
    
    conn.commit()
    conn.close()
    print("✅ 演示数据生成完成")

def analyze_demo_data(db_name):
    """分析演示数据"""
    print("📈 分析演示数据...")
    
    conn = sqlite3.connect(db_name)
    
    # 总体统计
    total_query = '''
        SELECT 
            COUNT(*) as total_listings,
            AVG(unit_price) as avg_price,
            MIN(unit_price) as min_price,
            MAX(unit_price) as max_price
        FROM house_listings
    '''
    
    total_stats = conn.execute(total_query).fetchone()
    
    # 按区域统计
    district_query = '''
        SELECT 
            district,
            COUNT(*) as listing_count,
            AVG(unit_price) as avg_price,
            MIN(unit_price) as min_price,
            MAX(unit_price) as max_price
        FROM house_listings
        GROUP BY district
        ORDER BY avg_price DESC
    '''
    
    district_stats = conn.execute(district_query).fetchall()
    
    # 时间趋势
    trend_query = '''
        SELECT 
            crawl_date,
            AVG(unit_price) as avg_price,
            COUNT(*) as listing_count
        FROM house_listings
        GROUP BY crawl_date
        ORDER BY crawl_date
    '''
    
    trend_stats = conn.execute(trend_query).fetchall()
    
    conn.close()
    
    # 输出分析结果
    print("\n" + "="*50)
    print("📊 房产数据分析报告")
    print("="*50)
    print(f"总房源数: {total_stats[0]:,}")
    print(f"平均单价: {total_stats[1]:,.0f} 元/平")
    print(f"价格区间: {total_stats[2]:,.0f} - {total_stats[3]:,.0f} 元/平")
    
    print("\n🏙️ 各区域价格对比:")
    print("-" * 40)
    for district, count, avg_price, min_price, max_price in district_stats:
        print(f"{district:6} | 均价: {avg_price:6.0f} | 数量: {count:3d}")
    
    print("\n📈 价格趋势 (最近10天):")
    print("-" * 40)
    for date, avg_price, count in trend_stats[-10:]:
        print(f"{date} | 均价: {avg_price:6.0f} | 数量: {count:3d}")
    
    # 计算价格变化趋势
    if len(trend_stats) >= 2:
        first_avg = trend_stats[0][1]
        last_avg = trend_stats[-1][1]
        change = last_avg - first_avg
        change_percent = (change / first_avg) * 100
        
        trend = "上涨" if change > 0 else "下跌" if change < 0 else "持平"
        print(f"\n🎯 总体趋势: {trend} {change:+.0f}元 ({change_percent:+.1f}%)")

def generate_simple_report(db_name):
    """生成简单报告"""
    print("📄 生成分析报告...")
    
    conn = sqlite3.connect(db_name)
    
    # 获取最新数据样本
    sample_query = '''
        SELECT district, community_name, unit_price, area, crawl_date
        FROM house_listings
        ORDER BY created_at DESC
        LIMIT 10
    '''
    
    samples = conn.execute(sample_query).fetchall()
    conn.close()
    
    # 生成报告内容
    report = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "report_type": "上海房产市场分析",
            "data_period": "演示数据集",
            "analysis_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "market_insights": [
            "黄浦、静安等核心区域价格保持高位",
            "外围区域如闵行性价比较高",
            "整体市场价格相对稳定",
            "不同户型价格差异明显"
        ],
        "recent_listings": [
            {
                "district": row[0],
                "community": row[1],
                "price_per_sqm": f"{row[2]:,.0f}元/平",
                "area": f"{row[3]:.0f}平",
                "date": row[4]
            }
            for row in samples
        ]
    }
    
    # 保存报告
    with open("demo_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("✅ 分析报告已保存至 demo_report.json")
    return report

def main():
    """主函数"""
    print("🏠 上海房产爬虫系统演示")
    print("=" * 40)
    
    # 创建演示数据库
    db_name = create_demo_database()
    
    # 生成演示数据
    generate_demo_data(db_name, days=30)
    
    # 分析数据
    analyze_demo_data(db_name)
    
    # 生成报告
    report = generate_simple_report(db_name)
    
    print("\n" + "="*50)
    print("🎉 演示完成!")
    print("="*50)
    print("系统功能展示:")
    print("✅ 数据库设计与初始化")
    print("✅ 数据抓取模拟")
    print("✅ 数据分析与统计")
    print("✅ 报告生成")
    print("\n实际使用时，请安装完整依赖:")
    print("pip install -r requirements.txt")
    print("playwright install")

if __name__ == "__main__":
    main()