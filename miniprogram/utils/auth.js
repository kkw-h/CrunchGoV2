/**
 * 认证相关工具函数
 * 实现 OpenID 静默登录流程
 */

// 存储键名
const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const OPENID_KEY = 'openid'
const USER_INFO_KEY = 'user_info'

/**
 * 获取本地存储的 token
 */
function getToken() {
  return wx.getStorageSync(TOKEN_KEY)
}

/**
 * 获取本地存储的 refresh token
 */
function getRefreshToken() {
  return wx.getStorageSync(REFRESH_TOKEN_KEY)
}

/**
 * 保存认证信息
 */
function saveAuth(accessToken, refreshToken) {
  wx.setStorageSync(TOKEN_KEY, accessToken)
  if (refreshToken) {
    wx.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
  }
}

/**
 * 清除认证信息
 */
function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(REFRESH_TOKEN_KEY)
  wx.removeStorageSync(OPENID_KEY)
  wx.removeStorageSync(USER_INFO_KEY)
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  const token = getToken()
  return !!token
}

/**
 * 微信静默登录
 * 获取 code 并调用后端登录接口
 * @returns {Promise<{success: boolean, isNewUser?: boolean, error?: string}>}
 */
async function silentLogin() {
  try {
    // 获取微信登录 code
    const loginRes = await new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })

    if (!loginRes.code) {
      throw new Error('获取登录 code 失败')
    }

    // 获取 API 基础 URL
    const apiBaseUrl = getApiBaseUrl()

    // 直接调用后端登录接口（避免循环依赖）
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${apiBaseUrl}/api/v1/auth/wx-login`,
        method: 'POST',
        data: { code: loginRes.code },
        header: {
          'Content-Type': 'application/json'
        },
        success: (response) => {
          if (response.statusCode === 200) {
            resolve(response.data)
          } else {
            const error = new Error(response.data?.detail || '登录请求失败')
            error.statusCode = response.statusCode
            reject(error)
          }
        },
        fail: reject
      })
    })

    // 保存 token
    saveAuth(res.access_token, res.refresh_token)

    return {
      success: true,
      isNewUser: res.is_new_user
    }
  } catch (err) {
    console.error('Silent login failed:', err)
    return {
      success: false,
      error: err.message || '登录失败'
    }
  }
}

/**
 * 确保已登录（如果未登录则执行静默登录）
 * @returns {Promise<boolean>}
 */
async function ensureLoggedIn() {
  // 如果已有 token，认为已登录
  if (isLoggedIn()) {
    return true
  }

  // 尝试静默登录
  const result = await silentLogin()
  return result.success
}

/**
 * 刷新 token
 */
async function refreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return false
  }

  try {
    const apiBaseUrl = getApiBaseUrl()

    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${apiBaseUrl}/api/v1/auth/refresh`,
        method: 'POST',
        data: { refresh_token: refreshToken },
        header: {
          'Content-Type': 'application/json'
        },
        success: (response) => {
          if (response.statusCode === 200) {
            resolve(response.data)
          } else {
            reject(new Error('刷新 token 失败'))
          }
        },
        fail: reject
      })
    })

    saveAuth(res.access_token)
    return true
  } catch (err) {
    console.error('Refresh token failed:', err)
    clearAuth()
    return false
  }
}

/**
 * 获取 API 基础 URL
 * 处理 getApp() 可能返回 undefined 的情况
 */
function getApiBaseUrl() {
  const app = getApp()
  if (app && app.globalData) {
    return app.globalData.apiBaseUrl
  }
  // 默认 fallback
  return 'http://localhost:8000'
}

/**
 * 获取当前用户信息
 */
async function getCurrentUser() {
  try {
    const token = getToken()
    if (!token) {
      return null
    }

    const apiBaseUrl = getApiBaseUrl()

    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${apiBaseUrl}/api/v1/auth/me`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        success: (response) => {
          if (response.statusCode === 200) {
            resolve(response.data)
          } else {
            reject(new Error('获取用户信息失败'))
          }
        },
        fail: reject
      })
    })

    wx.setStorageSync(USER_INFO_KEY, res)
    return res
  } catch (err) {
    console.error('Get current user failed:', err)
    return null
  }
}

/**
 * 更新用户信息
 * @param {Object} userInfo 用户信息
 */
function updateUserInfo(userInfo) {
  const current = wx.getStorageSync(USER_INFO_KEY) || {}
  const updated = { ...current, ...userInfo }
  wx.setStorageSync(USER_INFO_KEY, updated)
}

/**
 * 获取本地存储的用户信息
 */
function getStoredUserInfo() {
  return wx.getStorageSync(USER_INFO_KEY)
}

/**
 * 退出登录
 */
function logout() {
  clearAuth()
}

module.exports = {
  getToken,
  getRefreshToken,
  saveAuth,
  clearAuth,
  isLoggedIn,
  silentLogin,
  ensureLoggedIn,
  refreshToken,
  getCurrentUser,
  updateUserInfo,
  getStoredUserInfo,
  logout
}
