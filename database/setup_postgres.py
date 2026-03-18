#!/usr/bin/env python3
"""
一键配置 PostgreSQL 数据库脚本

该脚本会：
1. 检查 PostgreSQL 是否安装
2. 创建数据库和用户
3. 应用表结构
4. 导入数据
5. 启动服务
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTGRES_SCHEMA_PATH = ROOT / "server" / "scripts" / "postgres_schema.sql"


def check_postgres_installed() -> bool:
    """检查 PostgreSQL 是否安装"""
    try:
        result = subprocess.run(
            ["psql", "--version"],
            capture_output=True,
            text=True,
            check=False
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def run_psql_command(command: str, dbname: str = "postgres") -> bool:
    """运行 PostgreSQL 命令"""
    try:
        result = subprocess.run(
            ["psql", "-h", "localhost", "-U", "postgres", "-d", dbname, "-c", command],
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode != 0:
            print(f"命令执行失败: {command}")
            print(f"错误信息: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"执行命令时出错: {e}")
        return False


def create_database_and_user() -> bool:
    """创建数据库和用户"""
    print("[PostgreSQL] 创建数据库和用户...")
    
    # 创建数据库
    if not run_psql_command("CREATE DATABASE digital_labor;"):
        # 如果数据库已存在，继续执行
        pass
    
    # 创建用户并设置密码
    if not run_psql_command("CREATE USER postgres WITH PASSWORD 'postgres';"):
        # 如果用户已存在，继续执行
        pass
    
    # 授予用户权限
    if not run_psql_command("GRANT ALL PRIVILEGES ON DATABASE digital_labor TO postgres;"):
        return False
    
    print("[PostgreSQL] 数据库和用户创建成功")
    return True


def apply_schema() -> bool:
    """应用表结构"""
    print("[PostgreSQL] 应用表结构...")
    
    if not POSTGRES_SCHEMA_PATH.is_file():
        print(f"错误: postgres_schema.sql 不存在: {POSTGRES_SCHEMA_PATH}")
        return False
    
    try:
        result = subprocess.run(
            ["psql", "-h", "localhost", "-U", "postgres", "-d", "digital_labor", "-f", str(POSTGRES_SCHEMA_PATH)],
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode != 0:
            print(f"应用表结构失败: {result.stderr}")
            return False
        
        print("[PostgreSQL] 表结构应用成功")
        return True
    except Exception as e:
        print(f"应用表结构时出错: {e}")
        return False


def run_init_script() -> bool:
    """运行初始化脚本"""
    print("[PostgreSQL] 运行初始化脚本...")
    
    try:
        # 切换到项目根目录
        os.chdir(ROOT)
        
        # 运行初始化脚本
        result = subprocess.run(
            ["python", "database/init_and_import.py", "--with-seed"],
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode != 0:
            print(f"初始化脚本执行失败: {result.stderr}")
            return False
        
        print("[PostgreSQL] 初始化脚本执行成功")
        return True
    except Exception as e:
        print(f"运行初始化脚本时出错: {e}")
        return False


def update_env_file() -> bool:
    """更新 .env 文件"""
    print("[PostgreSQL] 更新 .env 文件...")
    
    env_path = ROOT / ".env"
    
    # 读取现有内容
    content = ""
    if env_path.is_file():
        content = env_path.read_text(encoding="utf-8")
    
    # 检查是否已有 DATABASE_URL
    if "DATABASE_URL=" in content:
        # 更新现有值
        new_content = []
        for line in content.split("\n"):
            if line.strip().startswith("DATABASE_URL="):
                new_content.append("DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor")
            else:
                new_content.append(line)
        content = "\n".join(new_content)
    else:
        # 添加新值
        if content and not content.endswith("\n"):
            content += "\n"
        content += "DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/digital_labor\n"
    
    # 写入文件
    try:
        env_path.write_text(content, encoding="utf-8")
        print("[PostgreSQL] .env 文件更新成功")
        return True
    except Exception as e:
        print(f"更新 .env 文件时出错: {e}")
        return False


def main() -> int:
    """主函数"""
    parser = argparse.ArgumentParser(description="一键配置 PostgreSQL 数据库")
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制重新配置，即使数据库已存在"
    )
    args = parser.parse_args()
    
    print("=== 一键配置 PostgreSQL 数据库 ===")
    
    # 检查 PostgreSQL 是否安装
    if not check_postgres_installed():
        print("错误: PostgreSQL 未安装，请先安装 PostgreSQL")
        print("安装指南:")
        print("  Windows: https://www.postgresql.org/download/windows/")
        print("  macOS: brew install postgresql")
        print("  Linux: sudo apt install postgresql postgresql-contrib (Ubuntu)")
        return 1
    
    print("[PostgreSQL] PostgreSQL 已安装")
    
    # 创建数据库和用户
    if not create_database_and_user():
        return 1
    
    # 应用表结构
    if not apply_schema():
        return 1
    
    # 更新 .env 文件
    if not update_env_file():
        return 1
    
    # 运行初始化脚本
    if not run_init_script():
        return 1
    
    print("\n=== 配置完成 ===")
    print("PostgreSQL 数据库配置成功！")
    print("\n下一步：")
    print("1. 启动后端服务: npm run dev:api")
    print("2. 启动前端服务: npm run dev:web")
    print("3. 访问应用: http://localhost:3001")
    print("4. 登录账号: admin / 123456")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
