import asyncio
import random
import time
import re
import logging
from datetime import date, datetime
from typing import List, Dict, Optional
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
import sqlite3
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('spider.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 配置：上海市中心核心区域关键词
TARGET_DISTRICTS = ["黄浦", "静安", "徐汇", "长宁", "虹口", "杨浦", "浦东", "闵行"]
BASE_URL = "https://sh.lianjia.com/ershoufang/"

class ShanghaiHouseSpider:
    def __init__(self, db_name="shanghai_houses.db"):
        self.db_name = db_name
        self.init_db()
        self.stats = {
            'total_crawled': 0,
            'successful_inserts': 0,
            'failed_inserts': 0,
            'duplicate_records': 0
        }

    def init_db(self):
        """初始化数据库"""
        try:
            conn = sqlite3.connect(self.db_name)
            c = conn.cursor()
            
            # 创建主表
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
                    orientation TEXT,
                    decoration TEXT,
                    elevator TEXT,
                    crawl_date DATE,
                    source_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(community_id, title, crawl_date)
                )
            ''')
            
            # 创建索引优化查询性能
            c.execute('''CREATE INDEX IF NOT EXISTS idx_district_date ON house_listings(district, crawl_date)''')
            c.execute('''CREATE INDEX IF NOT EXISTS idx_community ON house_listings(community_name)''')
            c.execute('''CREATE INDEX IF NOT EXISTS idx_price ON house_listings(unit_price)''')
            
            # 创建统计表
            c.execute('''
                CREATE TABLE IF NOT EXISTS crawl_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    crawl_date DATE,
                    district TEXT,
                    total_listings INTEGER,
                    avg_price REAL,
                    min_price REAL,
                    max_price REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info(f"数据库 {self.db_name} 初始化完成")
            
        except Exception as e:
            logger.error(f"数据库初始化失败: {e}")
            raise

    async def scrape_page(self, page, url: str, district: str) -> List[Dict]:
        """抓取单个列表页"""
        try:
            logger.info(f"正在访问: {url}")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # 随机等待，模拟人类行为
            await asyncio.sleep(random.uniform(2, 5))

            # 检查是否出现验证码或反爬页面
            if await self.check_antispam_page(page):
                logger.warning(f"检测到反爬页面: {url}")
                return []

            # 获取房源列表元素
            listings = await page.query_selector_all('.sellListContent li')
            
            if not listings:
                logger.warning(f"未找到房源列表元素: {url}")
                # 尝试其他可能的选择器
                listings = await page.query_selector_all('ul[class*="list"] li')
            
            data_batch = []
            
            for item in listings:
                try:
                    house_data = await self.extract_house_info(item, district)
                    if house_data:
                        data_batch.append(house_data)
                        
                except Exception as e:
                    logger.error(f"解析单个房源信息失败: {e}")
                    continue
            
            logger.info(f"从 {url} 成功解析 {len(data_batch)} 条房源信息")
            return data_batch
            
        except Exception as e:
            logger.error(f"抓取页面失败 {url}: {e}")
            return []

    async def check_antispam_page(self, page) -> bool:
        """检查是否遇到反爬虫页面"""
        try:
            # 检查常见的反爬元素
            antispam_selectors = [
                'div[class*="captcha"]',
                'div[class*="verify"]',
                'div[class*="shield"]',
                'img[src*="captcha"]'
            ]
            
            for selector in antispam_selectors:
                element = await page.query_selector(selector)
                if element:
                    return True
                    
            # 检查页面标题
            title = await page.title()
            if any(keyword in title.lower() for keyword in ['captcha', 'verify', '安全验证']):
                return True
                
            return False
        except Exception:
            return False

    async def extract_house_info(self, item, district: str) -> Optional[Dict]:
        """提取单个房源信息"""
        try:
            # 提取标题和链接
            title_el = await item.query_selector('.title a')
            if not title_el:
                return None
                
            title = await title_el.inner_text()
            href = await title_el.get_attribute('href')
            
            if not href or not title:
                return None

            # 处理相对链接
            if href.startswith('/'):
                href = 'https://sh.lianjia.com' + href

            # 提取小区名和区域信息
            community_name = self.extract_community_name(title)
            
            # 提取价格信息
            total_price = await self.extract_total_price(item)
            unit_price = await self.extract_unit_price(item)
            
            # 提取房屋基本信息
            area, house_type, floor_info = await self.extract_basic_info(item)
            
            # 提取详细信息
            orientation, decoration, elevator = await self.extract_detail_info(item)
            
            # 生成社区ID
            community_id = self.generate_community_id(community_name, title)

            return {
                "community_id": community_id,
                "community_name": community_name,
                "district": district,
                "title": title.strip(),
                "total_price": total_price,
                "unit_price": unit_price,
                "area": area,
                "floor_info": floor_info,
                "house_type": house_type,
                "orientation": orientation,
                "decoration": decoration,
                "elevator": elevator,
                "crawl_date": str(date.today()),
                "source_url": href
            }
            
        except Exception as e:
            logger.error(f"提取房源信息失败: {e}")
            return None

    def extract_community_name(self, title: str) -> str:
        """从标题中提取小区名称"""
        # 常见的小区名称模式
        patterns = [
            r'^([^\s\d]+[苑区庭园墅馆轩阁邸府邸城雅居雅苑花园公馆]+)',
            r'^([^\s]+\s*[苑区庭园墅馆轩阁邸府邸城雅居雅苑花园公馆]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title.strip())
            if match:
                return match.group(1).strip()
        
        # 如果没有匹配到，返回标题的第一个词
        return title.split()[0] if title.split() else "未知小区"

    async def extract_total_price(self, item) -> float:
        """提取总价"""
        try:
            # 尝试多种选择器
            selectors = ['.totalPrice .price', '.price .total', '[class*="totalPrice"]']
            
            for selector in selectors:
                price_el = await item.query_selector(selector)
                if price_el:
                    price_text = await price_el.inner_text()
                    price_match = re.search(r'(\d+(?:\.\d+)?)', price_text)
                    if price_match:
                        return float(price_match.group(1))
            
            return 0.0
        except Exception:
            return 0.0

    async def extract_unit_price(self, item) -> float:
        """提取单价"""
        try:
            selectors = ['.unitPrice span', '[class*="unitPrice"]', '.price .unit']
            
            for selector in selectors:
                price_el = await item.query_selector(selector)
                if price_el:
                    price_text = await price_el.inner_text()
                    # 清理单位 "元/㎡"
                    price_match = re.search(r'(\d+)', price_text.replace(',', ''))
                    if price_match:
                        return float(price_match.group(1))
            
            return 0.0
        except Exception:
            return 0.0

    async def extract_basic_info(self, item) -> tuple:
        """提取基础房屋信息"""
        try:
            house_info_el = await item.query_selector('.houseInfo')
            if not house_info_el:
                return 0.0, "", ""
                
            house_info = await house_info_el.inner_text()
            
            # 提取面积
            area_match = re.search(r'(\d+(?:\.\d+)?)\s*平', house_info)
            area = float(area_match.group(1)) if area_match else 0.0
            
            # 提取户型
            house_type_match = re.search(r'(\d室\d厅)', house_info)
            house_type = house_type_match.group(1) if house_type_match else ""
            
            # 提取楼层信息
            floor_match = re.search(r'([\d\-层]+)', house_info)
            floor_info = floor_match.group(1) if floor_match else ""
            
            return area, house_type, floor_info
            
        except Exception:
            return 0.0, "", ""

    async def extract_detail_info(self, item) -> tuple:
        """提取详细房屋信息"""
        try:
            # 这些信息可能在不同的位置，需要根据实际情况调整
            position_info_el = await item.query_selector('.positionInfo')
            follow_info_el = await item.query_selector('.followInfo')
            
            orientation = ""
            decoration = ""
            elevator = ""
            
            # 从不同元素中提取信息
            info_texts = []
            if position_info_el:
                info_texts.append(await position_info_el.inner_text())
            if follow_info_el:
                info_texts.append(await follow_info_el.inner_text())
            
            combined_info = " ".join(info_texts)
            
            # 提取朝向
            orientation_patterns = [r'[东南西北]+', r'(朝[东南西北]+)']
            for pattern in orientation_patterns:
                match = re.search(pattern, combined_info)
                if match:
                    orientation = match.group(0)
                    break
            
            # 提取装修情况
            decoration_keywords = ['精装', '简装', '毛坯', '豪华装修', '普通装修']
            for keyword in decoration_keywords:
                if keyword in combined_info:
                    decoration = keyword
                    break
            
            # 提取电梯信息
            if '电梯' in combined_info:
                elevator = "有电梯" if '有' in combined_info else "无电梯"
            
            return orientation, decoration, elevator
            
        except Exception:
            return "", "", ""

    def generate_community_id(self, community_name: str, title: str) -> str:
        """生成社区唯一标识"""
        # 结合小区名和一些特征生成相对稳定的ID
        base_string = f"{community_name}_{title[:20]}"
        return str(hash(base_string) % 1000000)

    async def run(self, max_pages_per_district: int = 3, headless: bool = True):
        """主运行逻辑"""
        logger.info("开始执行上海房产数据抓取任务")
        
        async with async_playwright() as p:
            try:
                # 启动浏览器
                browser = await p.chromium.launch(
                    headless=headless,
                    args=[
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ]
                )
                
                # 创建浏览器上下文
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1920, "height": 1080},
                    locale="zh-CN"
                )
                
                # 应用隐身模式
                await stealth_async(context)
                
                page = await context.new_page()
                
                # 遍历区域和页数
                all_data = []
                for district in TARGET_DISTRICTS:
                    logger.info(f"开始抓取区域: {district}")
                    
                    for page_num in range(1, max_pages_per_district + 1):
                        url = f"{BASE_URL}{district}/pg{page_num}/"
                        
                        try:
                            items = await self.scrape_page(page, url, district)
                            if items:
                                all_data.extend(items)
                                self.stats['total_crawled'] += len(items)
                                
                            # 随机延时，防止封IP
                            await asyncio.sleep(random.uniform(3, 8))
                            
                        except Exception as e:
                            logger.error(f"抓取 {url} 失败: {e}")
                            continue
                
                await browser.close()
                
                # 保存数据
                if all_data:
                    self.save_to_db(all_data)
                    self.generate_statistics()
                    logger.info(f"任务完成，共抓取 {len(all_data)} 条数据")
                else:
                    logger.warning("未抓取到任何数据")
                    
            except Exception as e:
                logger.error(f"浏览器操作失败: {e}")
                raise

    def save_to_db(self, data_list: List[Dict]):
        """存入数据库"""
        try:
            conn = sqlite3.connect(self.db_name)
            c = conn.cursor()
            
            for item in data_list:
                try:
                    c.execute('''
                        INSERT OR IGNORE INTO house_listings 
                        (community_id, community_name, district, title, total_price, unit_price, 
                         area, floor_info, house_type, orientation, decoration, elevator, 
                         crawl_date, source_url)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        item['community_id'], item['community_name'], item['district'],
                        item['title'], item['total_price'], item['unit_price'],
                        item['area'], item['floor_info'], item['house_type'],
                        item['orientation'], item['decoration'], item['elevator'],
                        item['crawl_date'], item['source_url']
                    ))
                    
                    if c.rowcount > 0:
                        self.stats['successful_inserts'] += 1
                    else:
                        self.stats['duplicate_records'] += 1
                        
                except Exception as e:
                    logger.error(f"数据入库失败: {e}")
                    self.stats['failed_inserts'] += 1
            
            conn.commit()
            conn.close()
            
            # 记录统计信息
            self.log_statistics()
            
        except Exception as e:
            logger.error(f"数据库操作失败: {e}")
            raise

    def generate_statistics(self):
        """生成统计数据"""
        try:
            conn = sqlite3.connect(self.db_name)
            c = conn.cursor()
            
            today = str(date.today())
            
            for district in TARGET_DISTRICTS:
                # 计算该区域今日的统计数据
                c.execute('''
                    SELECT 
                        COUNT(*) as total_count,
                        AVG(unit_price) as avg_price,
                        MIN(unit_price) as min_price,
                        MAX(unit_price) as max_price
                    FROM house_listings 
                    WHERE district = ? AND crawl_date = ?
                ''', (district, today))
                
                result = c.fetchone()
                if result and result[0] > 0:  # 只有当有数据时才插入统计
                    c.execute('''
                        INSERT INTO crawl_stats 
                        (crawl_date, district, total_listings, avg_price, min_price, max_price)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (today, district, result[0], result[1], result[2], result[3]))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"生成统计数据失败: {e}")

    def log_statistics(self):
        """记录并打印统计信息"""
        logger.info("=" * 50)
        logger.info("抓取统计信息:")
        logger.info(f"总抓取数量: {self.stats['total_crawled']}")
        logger.info(f"成功入库: {self.stats['successful_inserts']}")
        logger.info(f"重复记录: {self.stats['duplicate_records']}")
        logger.info(f"入库失败: {self.stats['failed_inserts']}")
        logger.info("=" * 50)

    def get_latest_data(self, limit: int = 100) -> List[Dict]:
        """获取最新抓取的数据"""
        try:
            conn = sqlite3.connect(self.db_name)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            c.execute('''
                SELECT * FROM house_listings 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (limit,))
            
            rows = c.fetchall()
            conn.close()
            
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"获取最新数据失败: {e}")
            return []

if __name__ == "__main__":
    # 测试运行
    spider = ShanghaiHouseSpider()
    asyncio.run(spider.run(max_pages_per_district=2, headless=False))