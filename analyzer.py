import sqlite3
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

# 配置中文字体和样式
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
plt.style.use('seaborn-v0_8-whitegrid')

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HouseDataAnalyzer:
    def __init__(self, db_name="shanghai_houses.db"):
        self.db_name = db_name
        self.setup_plot_style()

    def setup_plot_style(self):
        """设置图表样式"""
        sns.set_palette("husl")
        plt.rcParams['figure.figsize'] = (12, 8)
        plt.rcParams['font.size'] = 10

    def load_data(self, days_back: int = 30) -> pd.DataFrame:
        """从数据库加载数据"""
        try:
            conn = sqlite3.connect(self.db_name)
            
            query = '''
                SELECT 
                    hl.*,
                    cs.avg_price as district_avg_price,
                    cs.total_listings
                FROM house_listings hl
                LEFT JOIN crawl_stats cs 
                    ON hl.district = cs.district AND hl.crawl_date = cs.crawl_date
                WHERE hl.crawl_date >= date('now', '-{} days')
                ORDER BY hl.crawl_date, hl.district
            '''.format(days_back)
            
            df = pd.read_sql_query(query, conn)
            conn.close()
            
            if df.empty:
                logger.warning("数据库中没有足够的数据进行分析")
                return pd.DataFrame()
            
            # 数据预处理
            df['crawl_date'] = pd.to_datetime(df['crawl_date'])
            df['created_at'] = pd.to_datetime(df['created_at'])
            
            # 清理异常数据
            df = self.clean_data(df)
            
            logger.info(f"成功加载 {len(df)} 条记录")
            return df
            
        except Exception as e:
            logger.error(f"数据加载失败: {e}")
            return pd.DataFrame()

    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """清理异常数据"""
        # 移除价格异常的数据（过低或过高）
        price_lower_bound = 10000  # 1万元/平
        price_upper_bound = 200000  # 20万元/平
        
        original_count = len(df)
        df = df[
            (df['unit_price'] >= price_lower_bound) & 
            (df['unit_price'] <= price_upper_bound) &
            (df['total_price'] > 0) &
            (df['area'] > 10)  # 面积大于10平米
        ].copy()
        
        cleaned_count = len(df)
        logger.info(f"数据清理: {original_count} -> {cleaned_count} 条记录")
        
        return df

    def analyze_price_trends(self, df: pd.DataFrame) -> Dict:
        """分析价格趋势"""
        if df.empty:
            return {}
            
        analysis_results = {}
        
        # 按日期和区域分组计算均价
        daily_stats = df.groupby(['crawl_date', 'district']).agg({
            'unit_price': ['mean', 'median', 'std', 'count'],
            'total_price': 'mean',
            'area': 'mean'
        }).round(2)
        
        daily_stats.columns = ['avg_price', 'median_price', 'price_std', 'listing_count', 'avg_total_price', 'avg_area']
        daily_stats = daily_stats.reset_index()
        
        # 计算全市均价趋势
        city_wide_trend = df.groupby('crawl_date').agg({
            'unit_price': ['mean', 'median'],
            'total_price': 'mean'
        }).round(2)
        city_wide_trend.columns = ['city_avg_price', 'city_median_price', 'city_avg_total_price']
        
        # 计算移动平均线
        daily_stats = daily_stats.sort_values('crawl_date')
        for district in daily_stats['district'].unique():
            mask = daily_stats['district'] == district
            daily_stats.loc[mask, 'ma7'] = daily_stats.loc[mask, 'avg_price'].rolling(window=7, min_periods=1).mean()
            daily_stats.loc[mask, 'ma30'] = daily_stats.loc[mask, 'avg_price'].rolling(window=30, min_periods=1).mean()
        
        analysis_results.update({
            'daily_stats': daily_stats,
            'city_wide_trend': city_wide_trend,
            'latest_data': df.nlargest(10, 'created_at')  # 最新10条数据
        })
        
        return analysis_results

    def plot_price_trends(self, df: pd.DataFrame, save_path: str = "price_trends.png"):
        """绘制价格趋势图"""
        if df.empty:
            logger.warning("没有数据可绘制")
            return
            
        # 准备数据
        daily_stats = df.groupby(['crawl_date', 'district'])['unit_price'].mean().reset_index()
        
        plt.figure(figsize=(15, 10))
        
        # 为每个区域绘制趋势线
        districts = daily_stats['district'].unique()
        colors = plt.cm.Set3(np.linspace(0, 1, len(districts)))
        
        for i, district in enumerate(districts):
            district_data = daily_stats[daily_stats['district'] == district]
            plt.plot(district_data['crawl_date'], district_data['unit_price'], 
                    marker='o', linewidth=2, markersize=4, 
                    label=district, color=colors[i])
        
        plt.title('上海市中心各区二手房单价趋势', fontsize=16, pad=20)
        plt.xlabel('日期', fontsize=12)
        plt.ylabel('单价 (元/平米)', fontsize=12)
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.grid(True, alpha=0.3)
        
        # 格式化x轴日期
        plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        plt.gca().xaxis.set_major_locator(mdates.DayLocator(interval=max(1, len(daily_stats['crawl_date'].unique())//10)))
        plt.gcf().autofmt_xdate()
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
        logger.info(f"价格趋势图已保存至: {save_path}")

    def plot_price_distribution(self, df: pd.DataFrame, save_path: str = "price_distribution.png"):
        """绘制价格分布图"""
        if df.empty:
            return
            
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # 1. 整体价格分布直方图
        axes[0, 0].hist(df['unit_price'], bins=50, alpha=0.7, color='skyblue', edgecolor='black')
        axes[0, 0].set_title('二手房单价分布', fontsize=14)
        axes[0, 0].set_xlabel('单价 (元/平米)')
        axes[0, 0].set_ylabel('房源数量')
        
        # 2. 按区域的价格箱线图
        df.boxplot(column='unit_price', by='district', ax=axes[0, 1])
        axes[0, 1].set_title('各区价格分布对比')
        axes[0, 1].set_xlabel('区域')
        axes[0, 1].set_ylabel('单价 (元/平米)')
        axes[0, 1].tick_params(axis='x', rotation=45)
        
        # 3. 面积vs单价散点图
        scatter = axes[1, 0].scatter(df['area'], df['unit_price'], 
                                   alpha=0.6, c=df['unit_price'], 
                                   cmap='viridis', s=20)
        axes[1, 0].set_title('面积 vs 单价关系')
        axes[1, 0].set_xlabel('面积 (平米)')
        axes[1, 0].set_ylabel('单价 (元/平米)')
        plt.colorbar(scatter, ax=axes[1, 0])
        
        # 4. 房屋类型分布饼图
        house_type_counts = df['house_type'].value_counts()
        if not house_type_counts.empty:
            axes[1, 1].pie(house_type_counts.values, labels=house_type_counts.index, autopct='%1.1f%%')
            axes[1, 1].set_title('房屋户型分布')
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
        logger.info(f"价格分布图已保存至: {save_path}")

    def generate_report(self, days_back: int = 30) -> Dict:
        """生成综合分析报告"""
        logger.info("开始生成分析报告...")
        
        # 加载数据
        df = self.load_data(days_back)
        if df.empty:
            return {"error": "没有足够的数据进行分析"}
        
        # 执行各项分析
        analysis_results = self.analyze_price_trends(df)
        
        # 生成统计摘要
        summary_stats = {
            'report_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'analysis_period': f"最近{days_back}天",
            'total_records': len(df),
            'coverage_districts': df['district'].nunique(),
            'districts': df['district'].unique().tolist(),
            'overall_stats': {
                'average_price': df['unit_price'].mean(),
                'median_price': df['unit_price'].median(),
                'price_range': (df['unit_price'].min(), df['unit_price'].max()),
                'average_area': df['area'].mean()
            }
        }
        
        # 区域对比分析
        district_analysis = df.groupby('district').agg({
            'unit_price': ['mean', 'median', 'std', 'count'],
            'area': 'mean'
        }).round(2)
        district_analysis.columns = ['平均单价', '中位数单价', '价格标准差', '房源数量', '平均面积']
        
        report = {
            'summary': summary_stats,
            'district_comparison': district_analysis.to_dict(),
            'trend_analysis': analysis_results,
            'data_sample': df.head(10).to_dict('records')
        }
        
        # 保存报告
        self.save_report(report)
        logger.info("分析报告生成完成")
        
        return report

    def save_report(self, report: Dict, filename: str = "analysis_report.json"):
        """保存分析报告"""
        import json
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2, default=str)
            logger.info(f"分析报告已保存至: {filename}")
        except Exception as e:
            logger.error(f"保存报告失败: {e}")

    def compare_districts(self, df: pd.DataFrame) -> pd.DataFrame:
        """区域对比分析"""
        if df.empty:
            return pd.DataFrame()
            
        comparison = df.groupby('district').agg({
            'unit_price': ['mean', 'median', 'std', 'min', 'max', 'count'],
            'area': ['mean', 'median'],
            'total_price': 'mean'
        }).round(2)
        
        # 重命名列
        comparison.columns = [
            '均价', '中位数价', '价格波动', '最低价', '最高价', '房源数',
            '平均面积', '面积中位数', '平均总价'
        ]
        
        # 添加性价比指标（总价/面积比）
        comparison['性价比排名'] = comparison['均价'].rank(ascending=True)
        
        return comparison.sort_values('均价', ascending=False)

    def detect_price_anomalies(self, df: pd.DataFrame, threshold: float = 2.0) -> pd.DataFrame:
        """检测价格异常值"""
        if df.empty:
            return pd.DataFrame()
            
        # 按区域计算统计信息
        region_stats = df.groupby('district')['unit_price'].agg(['mean', 'std']).reset_index()
        
        # 标记异常值
        anomalies = []
        for _, row in region_stats.iterrows():
            district_data = df[df['district'] == row['district']]
            mean_price = row['mean']
            std_price = row['std']
            
            # 使用Z-score方法检测异常值
            district_data['z_score'] = abs(district_data['unit_price'] - mean_price) / std_price
            district_anomalies = district_data[district_data['z_score'] > threshold]
            
            if not district_anomalies.empty:
                anomalies.append(district_anomalies)
        
        if anomalies:
            return pd.concat(anomalies).sort_values('z_score', ascending=False)
        else:
            return pd.DataFrame()

if __name__ == "__main__":
    # 测试分析功能
    analyzer = HouseDataAnalyzer()
    
    # 生成完整报告
    report = analyzer.generate_report(days_back=30)
    
    # 如果有数据，绘制图表
    df = analyzer.load_data(days_back=30)
    if not df.empty:
        analyzer.plot_price_trends(df, "shanghai_price_trends.png")
        analyzer.plot_price_distribution(df, "shanghai_price_distribution.png")
        
        # 显示区域对比
        comparison = analyzer.compare_districts(df)
        print("\n区域对比分析:")
        print(comparison)