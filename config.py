import os
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class DatabaseConfig:
    """数据库配置"""
    name: str = "shanghai_houses.db"
    path: str = "./data"
    
    @property
    def full_path(self) -> str:
        """获取完整路径"""
        os.makedirs(self.path, exist_ok=True)
        return os.path.join(self.path, self.name)

@dataclass
class CrawlerConfig:
    """爬虫配置"""
    # 目标区域
    target_districts: List[str] = None
    base_url: str = "https://sh.lianjia.com/ershoufang/"
    
    # 请求配置
    max_pages_per_district: int = 3
    request_delay_min: float = 3.0
    request_delay_max: float = 8.0
    timeout: int = 30
    
    # 浏览器配置
    headless: bool = True
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    def __post_init__(self):
        if self.target_districts is None:
            self.target_districts = [
                "黄浦", "静安", "徐汇", "长宁", "虹口", "杨浦",
                "浦东", "闵行", "宝山", "嘉定", "金山", "松江"
            ]

@dataclass
class AnalysisConfig:
    """分析配置"""
    # 分析时间范围
    default_days_back: int = 30
    trend_window: int = 7  # 趋势分析窗口
    
    # 异常检测
    anomaly_threshold: float = 2.0  # Z-score阈值
    
    # 图表配置
    figure_size: tuple = (12, 8)
    dpi: int = 300

@dataclass
class SchedulerConfig:
    """调度器配置"""
    # 定时任务时间
    crawl_hour: int = 2
    crawl_minute: int = 0
    analysis_hour: int = 3
    analysis_minute: int = 0
    health_check_interval: int = 60  # 分钟
    
    # 重试配置
    max_retries: int = 3
    retry_delay: int = 60  # 秒

@dataclass
class ProxyConfig:
    """代理配置"""
    enabled: bool = False
    proxy_list: List[Dict] = None
    api_endpoint: str = ""
    username: str = ""
    password: str = ""
    
    def __post_init__(self):
        if self.proxy_list is None:
            self.proxy_list = []

@dataclass
class NotificationConfig:
    """通知配置"""
    email_enabled: bool = False
    email_host: str = ""
    email_port: int = 587
    email_username: str = ""
    email_password: str = ""
    recipients: List[str] = None
    
    webhook_enabled: bool = False
    webhook_url: str = ""
    
    def __post_init__(self):
        if self.recipients is None:
            self.recipients = []

class Config:
    """主配置类"""
    def __init__(self):
        self.database = DatabaseConfig()
        self.crawler = CrawlerConfig()
        self.analysis = AnalysisConfig()
        self.scheduler = SchedulerConfig()
        self.proxy = ProxyConfig()
        self.notification = NotificationConfig()
        
        # 从环境变量加载配置
        self._load_from_env()
    
    def _load_from_env(self):
        """从环境变量加载配置"""
        # 数据库配置
        db_name = os.getenv('DB_NAME')
        if db_name:
            self.database.name = db_name
            
        # 爬虫配置
        headless = os.getenv('HEADLESS')
        if headless is not None:
            self.crawler.headless = headless.lower() == 'true'
            
        max_pages = os.getenv('MAX_PAGES_PER_DISTRICT')
        if max_pages:
            self.crawler.max_pages_per_district = int(max_pages)
            
        # 调度器配置
        crawl_hour = os.getenv('CRAWL_HOUR')
        if crawl_hour:
            self.scheduler.crawl_hour = int(crawl_hour)
            
        # 代理配置
        proxy_enabled = os.getenv('PROXY_ENABLED')
        if proxy_enabled:
            self.proxy.enabled = proxy_enabled.lower() == 'true'

# 全局配置实例
config = Config()

# 导出常用配置
DATABASE_CONFIG = config.database
CRAWLER_CONFIG = config.crawler
ANALYSIS_CONFIG = config.analysis
SCHEDULER_CONFIG = config.scheduler
PROXY_CONFIG = config.proxy
NOTIFICATION_CONFIG = config.notification