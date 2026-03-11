# CrunchGo 微信小程序

餐饮点单排队小程序，配合商家管理后台使用。

## 功能特点

- **提前下单**：用户可提前点餐，到店即取
- **实时排队**：查看排队进度和取餐码
- **扫码取餐**：支持扫码快速取餐
- **订单管理**：查看历史订单和当前订单状态

## 项目结构

```
miniprogram/
├── app.js              # 小程序入口
├── app.json            # 全局配置
├── app.wxss            # 全局样式
├── pages/
│   ├── index/          # 首页
│   ├── menu/           # 点餐页面
│   ├── cart/           # 购物车/结算
│   ├── order/          # 订单列表
│   ├── order-detail/   # 订单详情
│   ├── queue/          # 排队队列
│   └── profile/        # 个人中心
├── utils/
│   ├── api.js          # API 封装
│   └── util.js         # 工具函数
└── images/             # 图片资源
```

## 页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | `/pages/index/index` | 商家信息、快捷入口、热销推荐 |
| 点餐 | `/pages/menu/menu` | 分类浏览、商品选择、购物车 |
| 购物车 | `/pages/cart/cart` | 确认订单、填写信息、提交 |
| 订单列表 | `/pages/order/order` | 查看所有订单 |
| 订单详情 | `/pages/order-detail/order-detail` | 订单详情、取消订单 |
| 排队队列 | `/pages/queue/queue` | 查看排队进度 |
| 个人中心 | `/pages/profile/profile` | 用户信息、订单统计 |

## 开发配置

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 在 `app.js` 中配置后端 API 地址：
   ```javascript
   globalData: {
     apiBaseUrl: 'http://localhost:8000'  // 开发环境
   }
   ```
3. 在小程序后台配置服务器域名

## 环境配置

### 开发环境
```javascript
// app.js
globalData: {
  apiBaseUrl: 'http://localhost:8000'
}
```

### 生产环境
```javascript
// app.js
globalData: {
  apiBaseUrl: 'https://your-api-domain.com'
}
```

## 后端 API 接口

小程序需要对接以下接口：

### 认证
- `POST /api/v1/auth/wx-login` - 微信登录

### 商品
- `GET /api/v1/products` - 商品列表
- `GET /api/v1/products/{id}` - 商品详情
- `GET /api/v1/categories` - 分类列表

### 订单
- `POST /api/v1/orders` - 创建订单
- `GET /api/v1/orders` - 订单列表
- `GET /api/v1/orders/{id}` - 订单详情
- `POST /api/v1/orders/{id}/cancel` - 取消订单

### 队列
- `GET /api/v1/orders/queue` - 排队队列

### 商家
- `GET /api/v1/merchant/profile` - 商家信息

## 注意事项

1. **真机调试**：需要在小程序后台添加服务器域名白名单
2. **HTTPS**：生产环境必须使用 HTTPS
3. **用户信息**：获取用户信息需要用户授权
4. **手机号**：获取手机号需要企业认证小程序

## 待完善功能

- [ ] 微信支付集成
- [ ] 订阅消息通知
- [ ] 扫码取餐功能完善
- [ ] 订单评价功能
- [ ] 优惠券系统
- [ ] 会员积分系统
