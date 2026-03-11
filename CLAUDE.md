# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个餐饮点单商家管理后台系统，核心初衷是**让用户可以提前下单排队**，到店后无需等待即可取餐。商家后台配合微信小程序端使用。

### 核心功能

**商家管理后台（本项目）**：
- 商品管理（增删改查、分类、价格、库存）
- 订单管理（查看、状态更新、排队队列管理、历史记录）
- 排队队列管理（待制作、制作中、待取餐、已完成）
- 店铺基础信息管理（营业时间、排队规则）

**微信小程序端（配合端）**：
- 用户提前下单
- 查看排队进度/取餐码
- 到店扫码取餐

## Technology Stack

- **Backend Language**: Python 3.12+
- **Backend Framework**: FastAPI
- **Frontend Framework**: Next.js 15 (App Router)
- **Frontend Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0 + Alembic (迁移)
- **Authentication**: JWT (python-jose)
- **Python Package Manager**: uv
- **Node Package Manager**: pnpm

## Common Commands

### Backend Development

```bash
# 进入后端目录
cd backend

# 安装依赖
uv sync

# 启动开发服务器 (热重载)
uv run uvicorn app.main:app --reload --port 8000

# 运行测试
uv run pytest

# 代码格式化
uv run ruff format .

# 代码检查
uv run ruff check .
```

### Frontend Development

```bash
# 进入前端目录
cd web

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint
```

### Database Operations

```bash
# 进入后端目录
cd backend

# 创建迁移
uv run alembic revision --autogenerate -m "migration name"

# 执行迁移
uv run alembic upgrade head

# 回滚迁移
uv run alembic downgrade -1

# 查看当前版本
uv run alembic current
```

### Full Stack Development

```bash
# 同时启动前后端 (需要两个终端)
# 终端1: 后端
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 终端2: 前端
cd web && pnpm dev
```

## Project Structure

```
.
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py       # 应用入口
│   │   ├── config.py     # 配置管理
│   │   ├── api/          # API 路由
│   │   │   ├── deps.py   # 依赖注入
│   │   │   └── v1/       # API v1
│   │   │       ├── auth.py
│   │   │       ├── products.py
│   │   │       ├── orders.py
│   │   │       ├── categories.py
│   │   │       └── merchant.py
│   │   ├── core/         # 核心功能
│   │   │   ├── security.py
│   │   │   └── pickup_code.py
│   │   ├── models/       # SQLAlchemy 模型
│   │   │   ├── product.py
│   │   │   ├── order.py
│   │   │   ├── category.py
│   │   │   └── merchant.py
│   │   ├── schemas/      # Pydantic 模型
│   │   └── services/     # 业务逻辑层
│   ├── alembic/          # 数据库迁移
│   ├── tests/
│   └── pyproject.toml    # Python 依赖
├── web/                  # Next.js 前端
│   ├── app/              # App Router
│   │   ├── (auth)/       # 认证相关路由
│   │   ├── products/
│   │   ├── orders/
│   │   ├── queue/
│   │   └── settings/
│   ├── components/       # React 组件
│   ├── lib/              # 工具函数
│   ├── hooks/            # 自定义 Hooks
│   ├── types/            # TypeScript 类型
│   └── package.json
├── docker-compose.yml    # 本地开发环境
└── CLAUDE.md            # 项目文档
```

## Domain Models

核心业务实体：

- **商品 (Product)**: 名称、描述、价格、分类、库存、图片
- **订单 (Order)**: 订单号、商品列表、总价、状态、创建时间、**取餐码/排队号**
- **订单项 (OrderItem)**: 商品快照、数量、小计
- **分类 (Category)**: 名称、排序、商品关联
- **商家 (Merchant)**: 店铺信息、联系方式、营业时间、**排队规则配置**

### 订单状态流转

用户下单 → 待制作 → 制作中 → 待取餐 → 已完成

取餐码生成规则建议：
- 按日期重置（每天从 001 开始）
- 格式：A001、B001（区分堂食/外带）或统一数字编号

## Architecture Decisions

- **架构模式**: 分层架构 (API -> Service -> Model)
- **API 风格**: RESTful API + OpenAPI 自动生成文档
- **认证方式**: JWT (access_token + refresh_token)
- **数据库设计**: PostgreSQL，表之间通过外键关联
- **ORM 策略**: SQLAlchemy 2.0 使用声明式模型 + 异步 session
- **前端状态**: React Hooks + SWR (数据获取)

## Environment Setup

<!-- TODO: 根据实际需求调整 -->

```bash
# 复制环境变量示例文件
cp .env.example .env

# 必要的环境变量：
# - DATABASE_URL      # 数据库连接字符串
# - JWT_SECRET        # JWT 密钥
# - PORT              # 服务端口
# - ENV               # 环境 (development/production)
```

## Important Notes

### 开发规范

- 商品价格在数据库中以**分**为单位存储，避免浮点数精度问题
- 订单状态流转需考虑并发控制（特别是取餐码生成需原子操作）
- 图片上传建议接入对象存储服务（如七牛云、阿里云OSS）
- API 响应统一使用 JSON 格式
- 与微信小程序端的 API 需考虑鉴权（建议用 JWT + OpenID）

### 取餐码设计要点

- 每天零点重置取餐码计数器
- 生成取餐码时需加锁或原子操作，避免重复
- 商家后台需实时展示待制作队列（WebSocket 或轮询）
- 支持手动叫号功能

### 待办事项

- [x] 补充实际的构建和运行命令
- [x] 确认技术栈并更新 Technology Stack
- [x] 添加数据库迁移说明
- [x] 初始化后端项目结构 (FastAPI + SQLAlchemy)
- [x] 初始化前端项目结构 (Next.js)
- [x] 设计数据库模型并创建迁移
- [ ] 实现认证模块 (JWT)
- [ ] 实现商品管理 API
- [ ] 实现订单管理 API
- [ ] 实现取餐码生成算法
- [ ] 设计排队队列实时更新机制 (WebSocket/SSE)
- [ ] 补充部署文档
- [ ] 规划与微信小程序的接口对接
