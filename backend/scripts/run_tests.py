#!/usr/bin/env python3
"""测试运行脚本.

用法:
    python scripts/run_tests.py              # 运行所有测试
    python scripts/run_tests.py -v           # 详细输出
    python scripts/run_tests.py -k auth      # 只运行认证相关测试
    python scripts/run_tests.py --cov        # 带覆盖率报告
"""

import argparse
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="运行后端测试")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细输出")
    parser.add_argument("-k", "--keyword", type=str, help="只运行匹配的测试")
    parser.add_argument("--cov", action="store_true", help="生成覆盖率报告")
    parser.add_argument("--cov-html", action="store_true", help="生成HTML覆盖率报告")
    parser.add_argument("-x", "--exitfirst", action="store_true", help="遇到第一个失败就停止")
    parser.add_argument("--tb", type=str, default="short", help="错误回溯样式")
    parser.add_argument("tests", nargs="?", help="指定测试文件或目录")

    args = parser.parse_args()

    # 确保在 backend 目录
    backend_dir = Path(__file__).parent.parent
    if not (backend_dir / "app").exists():
        print(f"错误: 找不到 app 目录，请从 backend 目录运行此脚本")
        sys.exit(1)

    # 构建 pytest 命令
    cmd = ["uv", "run", "pytest"]

    if args.verbose:
        cmd.append("-v")

    if args.exitfirst:
        cmd.append("-x")

    if args.tb:
        cmd.extend(["--tb", args.tb])

    if args.keyword:
        cmd.extend(["-k", args.keyword])

    if args.cov:
        cmd.extend(["--cov=app", "--cov-report=term-missing"])

    if args.cov_html:
        cmd.extend(["--cov=app", "--cov-report=html"])

    if args.tests:
        cmd.append(args.tests)
    else:
        cmd.append("tests/")

    # 运行测试
    print(f"运行命令: {' '.join(cmd)}")
    print("-" * 50)

    result = subprocess.run(cmd, cwd=backend_dir)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
