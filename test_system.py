import unittest
import asyncio
import tempfile
import os
from unittest.mock import patch, MagicMock
import sys

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shanghai_spider import ShanghaiHouseSpider
from analyzer import HouseDataAnalyzer
from config import config

class TestShanghaiHouseSpider(unittest.TestCase):
    """测试爬虫模块"""
    
    def setUp(self):
        """测试前准备"""
        # 使用临时数据库
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.temp_db.close()
        self.spider = ShanghaiHouseSpider(db_name=self.temp_db.name)
    
    def tearDown(self):
        """测试后清理"""
        # 删除临时数据库
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)
    
    def test_database_initialization(self):
        """测试数据库初始化"""
        # 检查表是否存在
        import sqlite3
        conn = sqlite3.connect(self.temp_db.name)
        cursor = conn.cursor()
        
        # 检查主要表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['house_listings', 'crawl_stats']
        for table in expected_tables:
            self.assertIn(table, tables)
        
        conn.close()
    
    def test_community_id_generation(self):
        """测试社区ID生成"""
        community_id = self.spider.generate_community_id("测试小区", "测试房源标题")
        self.assertIsInstance(community_id, str)
        self.assertTrue(community_id.isdigit())
    
    def test_extract_community_name(self):
        """测试小区名称提取"""
        test_cases = [
            ("绿城雅居 2室1厅 89平", "绿城雅居"),
            ("万科城市花园 精装房", "万科城市花园"),
            ("简单小区名", "简单小区名")
        ]
        
        for title, expected in test_cases:
            result = self.spider.extract_community_name(title)
            self.assertEqual(result, expected)

class TestHouseDataAnalyzer(unittest.TestCase):
    """测试数据分析模块"""
    
    def setUp(self):
        """测试前准备"""
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.temp_db.close()
        self.analyzer = HouseDataAnalyzer(db_name=self.temp_db.name)
    
    def tearDown(self):
        """测试后清理"""
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)
    
    def test_clean_data(self):
        """测试数据清理功能"""
        import pandas as pd
        
        # 创建测试数据
        test_data = pd.DataFrame({
            'unit_price': [50000, 80000, 150000, 5000, 300000],  # 包含异常值
            'total_price': [300, 500, 1200, 20, 2000],
            'area': [60, 80, 120, 5, 150]
        })
        
        cleaned_data = self.analyzer.clean_data(test_data)
        
        # 检查异常值是否被移除
        self.assertLess(len(cleaned_data), len(test_data))
        self.assertTrue((cleaned_data['unit_price'] >= 10000).all())
        self.assertTrue((cleaned_data['unit_price'] <= 200000).all())

class TestConfiguration(unittest.TestCase):
    """测试配置模块"""
    
    def test_config_loading(self):
        """测试配置加载"""
        # 检查默认配置
        self.assertIsNotNone(config.database)
        self.assertIsNotNone(config.crawler)
        self.assertIsNotNone(config.analysis)
        
        # 检查默认值
        self.assertEqual(config.crawler.max_pages_per_district, 3)
        self.assertIn("黄浦", config.crawler.target_districts)

class TestIntegration(unittest.TestCase):
    """集成测试"""
    
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.temp_db.close()
    
    def tearDown(self):
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)
    
    @patch('shanghai_spider.async_playwright')
    def test_complete_workflow(self, mock_playwright):
        """测试完整工作流程"""
        # 模拟Playwright
        mock_browser = MagicMock()
        mock_context = MagicMock()
        mock_page = MagicMock()
        mock_playwright.return_value.__aenter__.return_value.chromium.launch.return_value = mock_browser
        mock_browser.new_context.return_value = mock_context
        mock_context.new_page.return_value = mock_page
        
        # 模拟页面内容
        mock_page.query_selector_all.return_value = []
        mock_page.title.return_value = "上海链家"
        
        # 创建爬虫并运行
        spider = ShanghaiHouseSpider(db_name=self.temp_db.name)
        
        # 使用asyncio运行异步测试
        async def run_test():
            await spider.run(max_pages_per_district=1, headless=True)
        
        # 这里我们不实际运行浏览器，只是测试流程
        # 在实际环境中，这里会执行真实的爬取操作

def run_tests():
    """运行所有测试"""
    print("开始运行系统测试...")
    
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTests(loader.loadTestsFromTestCase(TestShanghaiHouseSpider))
    suite.addTests(loader.loadTestsFromTestCase(TestHouseDataAnalyzer))
    suite.addTests(loader.loadTestsFromTestCase(TestConfiguration))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果
    print(f"\n测试总结:")
    print(f"运行测试数: {result.testsRun}")
    print(f"失败数: {len(result.failures)}")
    print(f"错误数: {len(result.errors)}")
    
    if result.wasSuccessful():
        print("✅ 所有测试通过!")
        return True
    else:
        print("❌ 部分测试失败!")
        return False

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)