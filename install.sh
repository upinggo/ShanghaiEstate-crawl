#!/bin/bash

# 上海房产爬虫系统安装脚本

set -e  # 遇到错误时退出

echo "========================================="
echo "上海房产数据爬虫系统安装脚本"
echo "========================================="

# 检查Python版本
echo "检查Python版本..."
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [[ $PYTHON_MAJOR -lt 3 ]] || [[ $PYTHON_MAJOR -eq 3 && $PYTHON_MINOR -lt 9 ]]; then
    echo "错误: 需要Python 3.9或更高版本"
    echo "当前版本: $PYTHON_VERSION"
    exit 1
fi

echo "Python版本: $PYTHON_VERSION ✓"

# 创建虚拟环境
echo "创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "虚拟环境创建完成 ✓"
else
    echo "虚拟环境已存在"
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 升级pip
echo "升级pip..."
pip install --upgrade pip

# 安装依赖包
echo "安装Python依赖包..."
pip install -r requirements.txt

# 安装Playwright浏览器
echo "安装Playwright浏览器..."
playwright install chromium

# 创建数据目录
echo "创建数据目录..."
mkdir -p data logs

# 创建环境变量文件模板
echo "创建环境配置文件..."
cat > .env << EOF
# 数据库配置
DB_NAME=shanghai_houses.db

# 爬虫配置
HEADLESS=true
MAX_PAGES_PER_DISTRICT=3

# 调度器配置
CRAWL_HOUR=2
CRAWL_MINUTE=0

# 代理配置（可选）
PROXY_ENABLED=false
PROXY_API_ENDPOINT=
PROXY_USERNAME=
PROXY_PASSWORD=

# 通知配置（可选）
EMAIL_ENABLED=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=
EMAIL_PASSWORD=
EOF

echo "创建.gitignore文件..."
cat > .gitignore << EOF
# 虚拟环境
venv/
.env

# 数据文件
data/
*.db
*.sqlite

# 日志文件
*.log
logs/

# 图片文件
*.png
*.jpg
*.jpeg

# Python缓存
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so

# IDE
.vscode/
.idea/
*.swp
*.swo

# 系统文件
.DS_Store
Thumbs.db
EOF

# 权限设置
chmod +x install.sh
chmod +x run.sh

echo "========================================="
echo "安装完成！"
echo "========================================="
echo "下一步操作："
echo "1. 激活虚拟环境: source venv/bin/activate"
echo "2. 编辑 .env 文件配置参数（可选）"
echo "3. 运行测试: python shanghai_spider.py"
echo "4. 启动调度器: python scheduler.py"
echo ""
echo "使用 run.sh 脚本快速启动系统"
echo "========================================="