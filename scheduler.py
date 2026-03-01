import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from shanghai_spider import ShanghaiHouseSpider
from analyzer import HouseDataAnalyzer
import signal
import sys

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scheduler.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class HouseCrawlerScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.spider = ShanghaiHouseSpider()
        self.analyzer = HouseDataAnalyzer()
        self.is_running = False

    async def crawl_job(self):
        """定时抓取任务"""
        try:
            logger.info("=" * 60)
            logger.info(f"开始执行定时抓取任务 - {datetime.now()}")
            logger.info("=" * 60)
            
            # 执行爬虫任务
            await self.spider.run(max_pages_per_district=3, headless=True)
            
            logger.info("抓取任务完成")
            
        except Exception as e:
            logger.error(f"抓取任务执行失败: {e}")

    async def analysis_job(self):
        """定时分析任务"""
        try:
            logger.info("=" * 60)
            logger.info(f"开始执行定时分析任务 - {datetime.now()}")
            logger.info("=" * 60)
            
            # 生成分析报告
            report = self.analyzer.generate_report(days_back=30)
            
            # 生成可视化图表
            df = self.analyzer.load_data(days_back=30)
            if not df.empty:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                self.analyzer.plot_price_trends(df, f"trends_{timestamp}.png")
                self.analyzer.plot_price_distribution(df, f"distribution_{timestamp}.png")
            
            logger.info("分析任务完成")
            
        except Exception as e:
            logger.error(f"分析任务执行失败: {e}")

    async def health_check_job(self):
        """健康检查任务"""
        try:
            logger.info("执行健康检查...")
            
            # 检查数据库连接
            latest_data = self.spider.get_latest_data(limit=5)
            if latest_data:
                logger.info(f"数据库状态正常，最新数据时间: {latest_data[0].get('created_at', 'N/A')}")
            else:
                logger.warning("数据库中暂无数据")
                
            # 检查磁盘空间等...
            
        except Exception as e:
            logger.error(f"健康检查失败: {e}")

    def setup_jobs(self):
        """配置定时任务"""
        # 主要抓取任务 - 每天凌晨2点执行
        self.scheduler.add_job(
            self.crawl_job,
            CronTrigger(hour=2, minute=0),
            id='daily_crawl',
            name='每日房产数据抓取',
            misfire_grace_time=3600  # 允许1小时的延迟执行
        )
        
        # 分析任务 - 每天凌晨3点执行（抓取完成后）
        self.scheduler.add_job(
            self.analysis_job,
            CronTrigger(hour=3, minute=0),
            id='daily_analysis',
            name='每日数据分析',
            misfire_grace_time=3600
        )
        
        # 健康检查 - 每小时执行一次
        self.scheduler.add_job(
            self.health_check_job,
            CronTrigger(minute=0),
            id='health_check',
            name='系统健康检查'
        )
        
        # 每周报告 - 每周一凌晨4点
        self.scheduler.add_job(
            self.weekly_report_job,
            CronTrigger(day_of_week=0, hour=4, minute=0),
            id='weekly_report',
            name='每周综合报告'
        )

    async def weekly_report_job(self):
        """每周综合报告任务"""
        try:
            logger.info("生成每周综合报告...")
            
            # 生成详细的周报
            weekly_report = self.generate_weekly_report()
            
            # 发送通知（可以扩展为邮件、微信等）
            self.send_notification(weekly_report)
            
        except Exception as e:
            logger.error(f"周报任务失败: {e}")

    def generate_weekly_report(self):
        """生成周报内容"""
        try:
            # 获取本周数据
            df = self.analyzer.load_data(days_back=7)
            
            if df.empty:
                return {"status": "no_data", "message": "本周无数据"}
            
            # 计算周度统计
            weekly_stats = {
                "period": "最近一周",
                "total_listings": len(df),
                "unique_communities": df['community_name'].nunique(),
                "avg_price": df['unit_price'].mean(),
                "price_change": self.calculate_price_change(df),
                "hot_districts": self.get_hot_districts(df),
                "top_communities": self.get_top_communities(df)
            }
            
            return weekly_stats
            
        except Exception as e:
            logger.error(f"生成周报失败: {e}")
            return {"status": "error", "message": str(e)}

    def calculate_price_change(self, df):
        """计算价格变化"""
        try:
            # 按日期分组计算均价
            daily_avg = df.groupby('crawl_date')['unit_price'].mean()
            
            if len(daily_avg) < 2:
                return {"change": 0, "percentage": 0, "trend": "insufficient_data"}
            
            # 计算首尾两天的变化
            first_day = daily_avg.iloc[0]
            last_day = daily_avg.iloc[-1]
            
            change = last_day - first_day
            percentage = (change / first_day) * 100
            
            trend = "上涨" if change > 0 else "下跌" if change < 0 else "持平"
            
            return {
                "change": round(change, 2),
                "percentage": round(percentage, 2),
                "trend": trend,
                "first_day_price": round(first_day, 2),
                "last_day_price": round(last_day, 2)
            }
            
        except Exception as e:
            logger.error(f"计算价格变化失败: {e}")
            return {"change": 0, "percentage": 0, "trend": "error"}

    def get_hot_districts(self, df):
        """获取热门区域"""
        try:
            district_counts = df['district'].value_counts().head(5)
            return district_counts.to_dict()
        except Exception as e:
            logger.error(f"获取热门区域失败: {e}")
            return {}

    def get_top_communities(self, df):
        """获取热门小区"""
        try:
            # 按小区名称分组，计算均价和房源数量
            community_stats = df.groupby('community_name').agg({
                'unit_price': 'mean',
                'title': 'count'
            }).round(2)
            
            community_stats.columns = ['avg_price', 'listing_count']
            
            # 按房源数量排序，取前10
            top_communities = community_stats.nlargest(10, 'listing_count')
            return top_communities.to_dict('index')
            
        except Exception as e:
            logger.error(f"获取热门小区失败: {e}")
            return {}

    def send_notification(self, report):
        """发送通知（可扩展为邮件、微信等）"""
        try:
            # 简单的日志通知
            logger.info("=== 周报通知 ===")
            logger.info(f"统计周期: {report.get('period', 'N/A')}")
            logger.info(f"总房源数: {report.get('total_listings', 0)}")
            logger.info(f"均价: {report.get('avg_price', 0):.2f} 元/平")
            
            price_change = report.get('price_change', {})
            if isinstance(price_change, dict):
                logger.info(f"价格变化: {price_change.get('trend', 'N/A')} "
                           f"{price_change.get('change', 0):+.2f}元 "
                           f"({price_change.get('percentage', 0):+.2f}%)")
            
        except Exception as e:
            logger.error(f"发送通知失败: {e}")

    async def manual_run(self):
        """手动执行任务（用于测试）"""
        logger.info("手动执行任务...")
        await self.crawl_job()
        await self.analysis_job()

    def signal_handler(self, signum, frame):
        """信号处理器"""
        logger.info(f"收到信号 {signum}，准备关闭调度器...")
        self.is_running = False
        self.scheduler.shutdown()
        logger.info("调度器已关闭")
        sys.exit(0)

    async def start(self, manual_mode=False):
        """启动调度器"""
        try:
            # 注册信号处理器
            signal.signal(signal.SIGINT, self.signal_handler)
            signal.signal(signal.SIGTERM, self.signal_handler)
            
            # 配置任务
            self.setup_jobs()
            
            # 启动调度器
            self.scheduler.start()
            self.is_running = True
            
            logger.info("调度器启动成功")
            logger.info("已配置的任务:")
            for job in self.scheduler.get_jobs():
                logger.info(f"  - {job.name}: {job.trigger}")
            
            if manual_mode:
                # 手动模式：立即执行一次任务
                logger.info("手动模式：立即执行任务")
                await self.manual_run()
            else:
                # 自动模式：持续运行
                logger.info("自动模式：调度器将持续运行...")
                while self.is_running:
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"调度器启动失败: {e}")
            raise

async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='上海房产数据爬虫调度器')
    parser.add_argument('--manual', action='store_true', help='手动执行模式')
    parser.add_argument('--test', action='store_true', help='测试模式（只执行一次）')
    
    args = parser.parse_args()
    
    scheduler = HouseCrawlerScheduler()
    
    if args.test:
        # 测试模式：只执行一次抓取和分析
        logger.info("测试模式启动...")
        await scheduler.manual_run()
    else:
        # 正常模式
        await scheduler.start(manual_mode=args.manual)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("程序被用户中断")
    except Exception as e:
        logger.error(f"程序执行出错: {e}")