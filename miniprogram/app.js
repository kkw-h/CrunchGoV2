const { api } = require('./utils/api')
const auth = require('./utils/auth')

App({
  globalData: {
    userInfo: null,
    apiBaseUrl: 'http://localhost:8000'
  },

  onLaunch() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo

    // 静默登录（不强制，仅尝试）
    this.trySilentLogin()
  },

  // 尝试静默登录
  async trySilentLogin() {
    // 如果已有 token，说明已登录
    if (auth.isLoggedIn()) {
      console.log('User already logged in')
      // 可选：获取最新用户信息
      const userInfo = await auth.getCurrentUser()
      if (userInfo) {
        this.globalData.userInfo = userInfo
      }
      return
    }

    // 尝试静默登录（用户无感知）
    console.log('Trying silent login...')
    const result = await auth.silentLogin()
    if (result.success) {
      console.log('Silent login success, isNewUser:', result.isNewUser)
      // 获取用户信息
      const userInfo = await auth.getCurrentUser()
      if (userInfo) {
        this.globalData.userInfo = userInfo
      }
    } else {
      console.log('Silent login failed:', result.error)
    }
  },

  // 封装请求方法（自动添加 token）
  request(options) {
    return new Promise((resolve, reject) => {
      const token = auth.getToken()
      const header = {
        'Content-Type': 'application/json',
        ...options.header
      }

      if (token) {
        header['Authorization'] = `Bearer ${token}`
      }

      wx.request({
        url: `${this.globalData.apiBaseUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header,
        success: (res) => {
          if (res.statusCode === 401) {
            // Token 过期，清除登录状态
            auth.logout()
          }
          resolve(res)
        },
        fail: reject
      })
    })
  }
})
