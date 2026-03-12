const auth = require('./auth')

/**
 * 封装请求方法
 * @param {Object} options 请求配置
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    // 每次请求时动态获取 token，而不是模块加载时
    const token = auth.getToken()
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    }

    // 只在有有效 token 时才添加 Authorization header
    if (token && token !== 'undefined' && token !== 'null') {
      header['Authorization'] = `Bearer ${token}`
    }

    wx.request({
      url: `${app.globalData.apiBaseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // Token 过期，清除登录状态
          auth.logout()
          const error = new Error('Unauthorized')
          error.statusCode = 401
          reject(error)
        } else {
          const error = new Error(res.data?.detail || '请求失败')
          error.statusCode = res.statusCode
          error.data = res.data
          reject(error)
        }
      },
      fail: (err) => {
        const error = new Error('网络错误，请检查连接')
        error.originalError = err
        reject(error)
      }
    })
  })
}

// API 封装
const api = {
  // 认证相关
  auth: {
    wxLogin: (code) => request({
      url: '/api/v1/auth/wx-login',
      method: 'POST',
      data: { code }
    }),
    refreshToken: (refreshToken) => request({
      url: '/api/v1/auth/refresh',
      method: 'POST',
      data: { refresh_token: refreshToken }
    }),
    getMe: () => request({
      url: '/api/v1/auth/me',
      method: 'GET'
    }),
    updateMe: (data) => request({
      url: '/api/v1/auth/me',
      method: 'PATCH',
      data
    })
  },

  // 商品相关
  products: {
    list: (params = {}) => request({
      url: '/api/v1/products',
      method: 'GET',
      data: params
    }),
    detail: (id) => request({
      url: `/api/v1/products/${id}`,
      method: 'GET'
    })
  },

  // 分类相关
  categories: {
    list: () => request({
      url: '/api/v1/categories',
      method: 'GET'
    })
  },

  // 订单相关
  orders: {
    list: (params = {}) => request({
      url: '/api/v1/orders',
      method: 'GET',
      data: params
    }),
    detail: (id) => request({
      url: `/api/v1/orders/${id}`,
      method: 'GET'
    }),
    create: (data) => request({
      url: '/api/v1/orders',
      method: 'POST',
      data
    }),
    cancel: (id) => request({
      url: `/api/v1/orders/${id}/cancel`,
      method: 'POST'
    })
  },

  // 排队队列
  queue: {
    get: () => request({
      url: '/api/v1/orders/queue',
      method: 'GET'
    })
  },

  // 商家信息
  merchant: {
    getProfile: () => request({
      url: '/api/v1/merchant/profile',
      method: 'GET'
    }),
    getSettings: () => request({
      url: '/api/v1/merchant/settings',
      method: 'GET'
    })
  }
}

module.exports = {
  request,
  api
}