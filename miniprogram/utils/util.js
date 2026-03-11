/**
 * 格式化价格（分转元）
 * @param {number} price 价格（分）
 * @returns {string} 格式化后的价格
 */
function formatPrice(price) {
  // 处理 undefined, null, 空字符串
  if (price === undefined || price === null || price === '') {
    console.warn('Price is undefined/null:', price)
    return '--'
  }
  // 如果是字符串，尝试转换为数字
  const numPrice = typeof price === 'string' ? parseInt(price, 10) : price
  if (isNaN(numPrice)) {
    console.warn('Price is NaN:', price)
    return '--'
  }
  // 处理负数（异常情况）
  if (numPrice < 0) {
    console.warn('Price is negative:', numPrice)
    return '--'
  }
  return (numPrice / 100).toFixed(2)
}

/**
 * 格式化日期时间
 * @param {string} dateStr ISO 格式日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化时间
 * @param {string} dateStr ISO 格式日期字符串
 * @returns {string} 格式化后的时间
 */
function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 计算倒计时
 * @param {string} targetTime 目标时间
 * @returns {string} 倒计时文本
 */
function getCountdown(targetTime) {
  const now = new Date().getTime()
  const target = new Date(targetTime).getTime()
  const diff = target - now

  if (diff <= 0) return '已到期'

  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  }
  return `${seconds}秒`
}

/**
 * 防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间（毫秒）
 */
function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn 要执行的函数
 * @param {number} interval 间隔时间（毫秒）
 */
function throttle(fn, interval = 300) {
  let lastTime = 0
  return function (...args) {
    const now = new Date().getTime()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 显示加载中
 * @param {string} title 提示文字
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示成功提示
 * @param {string} title 提示文字
 */
function showSuccess(title = '操作成功') {
  wx.showToast({
    title,
    icon: 'success',
    duration: 2000
  })
}

/**
 * 显示错误提示
 * @param {string} title 提示文字
 */
function showError(title = '操作失败') {
  wx.showToast({
    title,
    icon: 'error',
    duration: 2000
  })
}

/**
 * 显示确认对话框
 * @param {Object} options 配置项
 */
function showConfirm(options) {
  return new Promise((resolve) => {
    wx.showModal({
      title: options.title || '提示',
      content: options.content || '',
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

/**
 * 获取本地存储
 * @param {string} key 键名
 */
function getStorage(key) {
  try {
    return wx.getStorageSync(key)
  } catch (e) {
    return null
  }
}

/**
 * 设置本地存储
 * @param {string} key 键名
 * @param {*} value 值
 */
function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    console.error('Storage set error:', e)
  }
}

/**
 * 移除本地存储
 * @param {string} key 键名
 */
function removeStorage(key) {
  try {
    wx.removeStorageSync(key)
  } catch (e) {
    console.error('Storage remove error:', e)
  }
}

module.exports = {
  formatPrice,
  formatDateTime,
  formatTime,
  getCountdown,
  debounce,
  throttle,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm,
  getStorage,
  setStorage,
  removeStorage
}