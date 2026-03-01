#!/bin/bash

# 上海房产爬虫系统运行脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 检查虚拟环境
check_venv() {
    if [ ! -d "venv" ]; then
        print_error "虚拟环境不存在，请先运行 install.sh"
        exit 1
    fi
    
    source venv/bin/activate
    print_success "虚拟环境已激活"
}

# 检查依赖
check_dependencies() {
    print_header "检查依赖..."
    
    # 检查Playwright
    if ! command -v playwright &> /dev/null; then
        print_warning "Playwright未安装，正在安装..."
        pip install playwright
        playwright install chromium
        print_success "Playwright安装完成"
    fi
    
    # 检查其他依赖
    missing_deps=()
    for dep in pandas matplotlib seaborn apscheduler; do
        if ! python -c "import $dep" &> /dev/null; then
            missing_deps+=($dep)
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_warning "缺少依赖: ${missing_deps[*]}"
        print_header "安装缺失依赖..."
        pip install ${missing_deps[*]}
    fi
    
    print_success "依赖检查完成"
}

# 测试数据库连接
test_database() {
    print_header "测试数据库连接..."
    
    python << EOF
import sqlite3
import os
from config import DATABASE_CONFIG

try:
    db_path = DATABASE_CONFIG.full_path
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    conn.close()
    print("数据库连接测试成功")
except Exception as e:
    print(f"数据库连接失败: {e}")
    exit(1)
EOF
    
    print_success "数据库连接正常"
}

# 运行选项菜单
show_menu() {
    print_header "上海房产爬虫系统"
    echo "请选择操作:"
    echo "1) 测试爬虫 (抓取少量数据)"
    echo "2) 运行一次完整抓取"
    echo "3) 启动定时调度器"
    echo "4) 查看最新数据"
    echo "5) 生成分析报告"
    echo "6) 查看系统状态"
    echo "7) 退出"
    echo ""
}

# 测试爬虫
test_crawler() {
    print_header "测试爬虫功能..."
    python shanghai_spider.py
}

# 完整抓取
full_crawl() {
    print_header "执行完整数据抓取..."
    python -c "
from shanghai_spider import ShanghaiHouseSpider
import asyncio
spider = ShanghaiHouseSpider()
asyncio.run(spider.run(max_pages_per_district=5, headless=True))
"
}

# 启动调度器
start_scheduler() {
    print_header "启动定时调度器..."
    print_warning "调度器将在后台运行，按 Ctrl+C 停止"
    python scheduler.py
}

# 查看数据
view_data() {
    print_header "最新数据预览..."
    python -c "
from shanghai_spider import ShanghaiHouseSpider
spider = ShanghaiHouseSpider()
latest_data = spider.get_latest_data(limit=10)
if latest_data:
    print(f'找到 {len(latest_data)} 条最新记录:')
    for i, record in enumerate(latest_data[:5], 1):
        print(f'{i}. {record[\"community_name\"]} - {record[\"district\"]}')
        print(f'   价格: {record[\"unit_price\"]}元/平 | 面积: {record[\"area\"]}平')
        print(f'   时间: {record[\"crawl_date\"]}')
        print()
else:
    print('暂无数据')
"
}

# 生成报告
generate_report() {
    print_header "生成分析报告..."
    python analyzer.py
}

# 查看系统状态
system_status() {
    print_header "系统状态检查..."
    
    echo "Python版本: $(python --version)"
    echo "工作目录: $(pwd)"
    echo ""
    
    # 检查数据文件
    if [ -f "data/shanghai_houses.db" ]; then
        db_size=$(du -h "data/shanghai_houses.db" | cut -f1)
        echo "数据库大小: $db_size"
    else
        echo "数据库: 未创建"
    fi
    
    # 检查日志文件
    if ls logs/*.log 1> /dev/null 2>&1; then
        echo "日志文件: 存在"
    else
        echo "日志文件: 无"
    fi
    
    # 检查最近运行时间
    if [ -f "scheduler.log" ]; then
        last_run=$(tail -n 20 scheduler.log | grep "开始执行" | tail -n 1 | cut -d'-' -f1 | xargs)
        if [ ! -z "$last_run" ]; then
            echo "上次运行: $last_run"
        fi
    fi
}

# 主循环
main() {
    check_venv
    check_dependencies
    test_database
    
    while true; do
        show_menu
        read -p "请输入选项 (1-7): " choice
        
        case $choice in
            1)
                test_crawler
                ;;
            2)
                full_crawl
                ;;
            3)
                start_scheduler
                ;;
            4)
                view_data
                ;;
            5)
                generate_report
                ;;
            6)
                system_status
                ;;
            7)
                print_success "再见！"
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..." dummy
    done
}

# 信号处理
trap 'echo -e "\n${YELLOW}正在退出...${NC}"; exit 0' INT TERM

# 运行主程序
main "$@"