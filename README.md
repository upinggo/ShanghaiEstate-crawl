# 上海市中心房产价格监测系统 🏠

一套高可用、抗反爬、数据清洗能力强的分布式房产数据爬虫系统，专门用于捕捉上海市中心房产价格及趋势分析。

## 🎯 项目特色

- **智能反爬**: 采用 Playwright + stealth 模式，有效规避反爬虫检测
- **数据清洗**: 自动处理字体加密、异常数据过滤
- **趋势分析**: 支持价格趋势、区域对比、异常检测等多种分析维度
- **定时调度**: 支持自动化定时抓取和分析
- **可视化展示**: 丰富的图表展示房价走势和分布

## 🏗️ 系统架构

```
ShanghaiEstate-crawl/
├── shanghai_spider.py     # 核心爬虫模块
├── analyzer.py           # 数据分析模块
├── scheduler.py          # 任务调度模块
├── config.py            # 配置管理
├── requirements.txt     # 依赖列表
├── install.sh          # 安装脚本
├── run.sh             # 运行脚本
└── data/              # 数据存储目录
```

## 🚀 快速开始

### 1. 环境要求

- Python 3.9+
- 现代Linux/macOS/Windows系统
- 至少4GB内存

### 2. 一键安装

```bash
# 克隆项目
git clone https://github.com/yourusername/ShanghaiEstate-crawl.git
cd ShanghaiEstate-crawl

# 运行安装脚本
chmod +x install.sh
./install.sh
```

### 3. 快速使用

```bash
# 激活虚拟环境
source venv/bin/activate

# 运行交互式界面
chmod +x run.sh
./run.sh
```

## 📊 功能详解

### 核心爬虫 (`shanghai_spider.py`)

主要特性：
- **智能选择器**: 多重CSS选择器备份，适应网站结构变化
- **反爬对抗**: 随机延时、User-Agent轮换、stealth模式
- **数据验证**: 自动过滤异常价格、面积数据
- **断点续传**: 支持重复数据自动去重

```python
from shanghai_spider import ShanghaiHouseSpider
import asyncio

# 创建爬虫实例
spider = ShanghaiHouseSpider()

# 执行抓取（测试模式）
asyncio.run(spider.run(max_pages_per_district=2, headless=False))

# 查看最新数据
latest_data = spider.get_latest_data(limit=10)
```

### 数据分析 (`analyzer.py`)

分析能力：
- **价格趋势**: 日/周/月度价格走势分析
- **区域对比**: 各区域均价、成交量对比
- **异常检测**: 基于统计学的价格异常识别
- **数据可视化**: 自动生成趋势图、分布图

```python
from analyzer import HouseDataAnalyzer

analyzer = HouseDataAnalyzer()

# 生成完整分析报告
report = analyzer.generate_report(days_back=30)

# 绘制价格趋势图
df = analyzer.load_data(days_back=30)
analyzer.plot_price_trends(df, "trends.png")
```

### 任务调度 (`scheduler.py`)

调度功能：
- **定时抓取**: 每日凌晨自动执行数据抓取
- **定期分析**: 自动生成分析报告和图表
- **健康监控**: 系统状态检查和异常告警
- **灵活配置**: 支持手动执行和测试模式

```bash
# 启动调度器（生产模式）
python scheduler.py

# 手动执行模式
python scheduler.py --manual

# 测试模式
python scheduler.py --test
```

## ⚙️ 配置说明

### 环境变量配置 (`.env`)

```bash
# 数据库配置
DB_NAME=shanghai_houses.db

# 爬虫配置
HEADLESS=true                    # 是否无头模式运行
MAX_PAGES_PER_DISTRICT=3         # 每个区域抓取页数

# 调度器配置
CRAWL_HOUR=2                     # 抓取时间（小时）
CRAWL_MINUTE=0                   # 抓取时间（分钟）

# 代理配置（可选）
PROXY_ENABLED=false
PROXY_API_ENDPOINT=              # 代理API地址
PROXY_USERNAME=                  # 代理用户名
PROXY_PASSWORD=                  # 代理密码
```

### 高级配置 (`config.py`)

```python
from config import CRAWLER_CONFIG, ANALYSIS_CONFIG

# 修改目标区域
CRAWLER_CONFIG.target_districts = ["黄浦", "静安", "徐汇"]

# 调整分析时间范围
ANALYSIS_CONFIG.default_days_back = 60
```

## 🔧 开发指南

### 项目结构

```
shanghai_spider.py    # 爬虫核心逻辑
├── ShanghaiHouseSpider
│   ├── __init__      # 初始化和数据库设置
│   ├── scrape_page   # 页面抓取
│   ├── extract_*     # 数据提取方法
│   └── run          # 主执行入口

analyzer.py          # 分析引擎
├── HouseDataAnalyzer
│   ├── load_data    # 数据加载
│   ├── analyze_*    # 各种分析方法
│   └── plot_*       # 图表生成

scheduler.py         # 调度系统
├── HouseCrawlerScheduler
│   ├── setup_jobs   # 任务配置
│   ├── crawl_job    # 抓取任务
│   └── analysis_job # 分析任务
```

### 扩展开发

#### 添加新的数据源

```python
class NewHouseSourceSpider(BaseSpider):
    def __init__(self):
        super().__init__()
        self.base_url = "https://new-source.com"
    
    async def extract_house_info(self, item):
        # 实现特定网站的数据提取逻辑
        pass
```

#### 自定义分析维度

```python
class CustomAnalyzer(HouseDataAnalyzer):
    def custom_analysis(self, df):
        # 实现自定义分析逻辑
        return analysis_result
```

## 🛡️ 风险控制

### 反爬虫对策

1. **频率控制**: 随机延时3-8秒，避免高频访问
2. **身份伪装**: 轮换User-Agent，模拟真实用户行为
3. **代理池**: 支持代理IP轮换（需配置）
4. **异常处理**: 完善的错误重试机制

### 法律合规

⚠️ **重要提醒**：
- 仅供个人学习研究使用
- 不得用于商业目的或大规模数据采集
- 遵守网站robots.txt协议
- 尊重数据隐私和版权

## 📈 数据质量保证

### 数据清洗流程

1. **格式标准化**: 统一价格、面积单位
2. **异常值过滤**: 移除明显错误的数据
3. **重复数据去重**: 基于房源ID和时间戳
4. **完整性检查**: 确保关键字段不为空

### 质量监控指标

- 数据抓取成功率
- 重复数据比例
- 异常数据占比
- 系统运行稳定性

## 🆘 常见问题

### Q: 抓取速度很慢怎么办？
A: 可以适当增加并发数，但要注意遵守网站访问频率限制。

### Q: 遇到验证码如何处理？
A: 系统会自动检测验证码页面，建议配置代理IP轮换。

### Q: 数据存储占用过大怎么办？
A: 可以定期清理历史数据，或调整抓取频率。

### Q: 图表中文显示乱码？
A: 确保系统安装了中文字体，或修改matplotlib字体配置。

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发环境搭建

```bash
# Fork项目后克隆
git clone https://github.com/yourusername/ShanghaiEstate-crawl.git
cd ShanghaiEstate-crawl

# 安装开发依赖
pip install -r requirements-dev.txt

# 运行测试
pytest tests/
```

### 代码规范

- 遵循PEP 8编码规范
- 添加必要的注释和文档字符串
- 编写单元测试覆盖核心功能

## 📄 许可证

本项目采用MIT许可证，详见[LICENSE](LICENSE)文件。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交GitHub Issue
- 发送邮件至：[your-email@example.com]

---

<p align="center">
  <strong>📊 让我们一起洞察上海房产市场！</strong>
</p>