# 上海市中心房产价格监测系统 🏠

抗反爬的上海房产数据爬虫，抓取链家二手房挂牌信息，落 SQLite，配套分析与可视化。

## 🎯 项目特色

- **反爬对抗**：Playwright + playwright-stealth + 人类化行为（鼠标 / 滚动 / 抖动延迟）
- **手动登录 + Cookie 复用**：一次登录导出 Cookie，后续无人值守
- **数据清洗**：字段标准化、异常值过滤
- **趋势分析**：价格走势、区域对比、异常检测
- **定时抓取**：GitHub Actions cron 每日自动运行并回提 DB
- **可视化**：matplotlib 图表输出

## 🏗️ 系统架构

```
ShanghaiEstate-crawl/
├── shanghai_spider.py       # 核心爬虫（含 stealth / cookie 加载 / 阻断检测）
├── export_cookies.py        # 手动登录 & 导出 Cookie
├── analyzer.py              # 数据分析
├── scheduler.py             # 本地 APScheduler 调度（可选）
├── config.py                # 配置
├── requirements.txt         # 依赖
├── install.sh / run.sh      # 安装 / 交互式启动
├── data/                    # cookies.json、本地日志（.gitignore）
├── db/                      # 生产 SQLite（被 CI 提交回仓库）
└── .github/workflows/       # 每日 cron 抓取
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

### 3. 本地运行（Step by Step）

链家部分页面需要登录，本项目采用 **手动登录一次导出 Cookie**、后续爬虫自动加载的模式。不再需要代理或验证码 API。

#### Step 1 — 激活环境并确认浏览器已安装

```bash
source venv/bin/activate
playwright install chromium   # 首次运行需要
```

#### Step 2 — 导出登录 Cookie（首次或过期时执行）

```bash
python export_cookies.py
```

- 弹出的浏览器中登录链家（手机号 / 微信 / 密码均可）
- 完成任何 CAPTCHA / 短信验证
- 停在正常的链家页面（例如 `sh.lianjia.com/ershoufang/`）
- 在**另一个终端**执行：

```bash
touch /tmp/lianjia_login_done
```

Cookie 保存在 `data/cookies.json`。

#### Step 3 — 运行爬虫

```bash
# 小规模测试（每个区抓 1 页，显示浏览器窗口）
HEADLESS=false MAX_PAGES_PER_DISTRICT=1 DB_PATH=db/shanghai_houses.db python shanghai_spider.py

# 正式运行（后台无界面）
HEADLESS=true MAX_PAGES_PER_DISTRICT=3 DB_PATH=db/shanghai_houses.db python shanghai_spider.py
```

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HEADLESS` | `true` | 是否无头浏览 |
| `MAX_PAGES_PER_DISTRICT` | `2` | 每个区抓取页数 |
| `DB_PATH` | `shanghai_houses.db` | SQLite 数据库路径 |

#### Step 4 — 查看数据

```bash
# 各区抓取数量
sqlite3 db/shanghai_houses.db 'SELECT district, COUNT(*) FROM house_listings GROUP BY district'

# 前 10 条样例
sqlite3 db/shanghai_houses.db 'SELECT district, title, total_price, unit_price FROM house_listings LIMIT 10'

# 若结果异常，查看日志
tail -50 spider.log
```

#### Step 5 —（可选）生成分析报告

```bash
python analyzer.py
```

### 4. 交互式菜单（可选）

```bash
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

1. **频率控制**：随机延时 3-8 秒，Gaussian 抖动
2. **身份伪装**：UA + sec-ch-ua 轮换，playwright-stealth 隐藏 webdriver 指纹
3. **人类化行为**：鼠标移动、滚动、页面停留
4. **登录 Cookie 复用**：`export_cookies.py` 一次登录，长期使用
5. **上下文轮换**：每 N 页重建 BrowserContext，避免会话过长被识别
6. **异常处理**：指数退避重试

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
A: 反爬对策要求较长延时，属正常现象。可减少 `MAX_PAGES_PER_DISTRICT` 或减少 `TARGET_DISTRICTS`。

### Q: 遇到验证码 / 登录墙怎么办？
A: 重新运行 `python export_cookies.py` 手动登录，覆盖 `data/cookies.json`。若频繁触发，降低抓取页数、增加延时。

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

## 🤖 GitHub Actions 定时抓取

仓库包含 `.github/workflows/crawl.yml`，每天 **02:35（上海时间，即 UTC 18:35）** 自动运行爬虫，并将 SQLite 数据库提交回 `db/shanghai_houses.db`。也可在 Actions 页面通过 **workflow_dispatch** 手动触发。

### 登录 Cookie（必需）

链家部分页面需要登录。登录采用手动方式，执行一次即可：

```bash
python export_cookies.py
```

浏览器会弹出登录页，登录成功后在另一个终端执行 `touch /tmp/lianjia_login_done`，Cookie 将保存到 `data/cookies.json`。爬虫会自动加载该文件。

### 一次性配置

- **可选变量**（`Settings → Secrets and variables → Actions → Variables`）：
  - `MAX_PAGES`：每个区抓取的页数，默认 `2`
- **允许 workflow 写入仓库**：`Settings → Actions → General → Workflow permissions` → 选择 **Read and write permissions**。

### 手动触发

`Actions → Crawl Shanghai listings → Run workflow`，可选传入 `max_pages` 覆盖当次运行。

### 排查

- 运行日志（`spider.log`）作为 artifact 上传，保留 14 天。
- 若某次运行未产生新数据（例如被反爬拦截），workflow 不会创建空提交。
- 修改抓取时间：编辑 `.github/workflows/crawl.yml` 的 `cron` 字段（**UTC 时区**）。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交GitHub Issue
- 发送邮件至：[your-email@example.com]

---

<p align="center">
  <strong>📊 让我们一起洞察上海房产市场！</strong>
</p>