const { api } = require('../../utils/api')
const { formatPrice, showLoading, hideLoading, showSuccess, showError } = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    cart: [],
    remark: '',
    customerName: '',
    customerPhone: '',
    submitting: false,
    merchantInfo: null,
    merchantSettings: null,
    quickRemarks: [],
    totalPrice: 0,
    isLoading: true
  },

  _formatPrice(price) {
    if (price === undefined || price === null || price === '') {
      return '0.00'
    }
    const num = typeof price === 'string' ? parseInt(price, 10) : price
    if (isNaN(num)) {
      return '0.00'
    }
    return (num / 100).toFixed(2)
  },

  onLoad() {
    this.loadCart()
    this.loadMerchantInfo()
    this.loadMerchantSettings()
    this.loadUserInfo()
  },

  onShow() {
    this.loadCart()
  },

  // 加载购物车
  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    // 计算每个购物车项的显示价格
    const cartWithPriceYuan = cart.map(item => ({
      ...item,
      unitPriceYuan: this._formatPrice(item.price + (item.optionsExtraPrice || 0)),
      itemTotalYuan: this._formatPrice((item.price + (item.optionsExtraPrice || 0)) * item.quantity)
    }))
    this.setData({
      cart: cartWithPriceYuan,
      totalPriceYuan: this._formatPrice(this.calculateTotalPrice(cart)),
      isLoading: false
    })
  },

  // 计算总价
  calculateTotalPrice(cart) {
    return cart.reduce((total, item) => {
      const unitPrice = item.price + (item.optionsExtraPrice || 0)
      return total + unitPrice * item.quantity
    }, 0)
  },

  // 加载商家信息
  async loadMerchantInfo() {
    try {
      const res = await api.merchant.getProfile()
      this.setData({ merchantInfo: res })
    } catch (err) {
      console.error('Load merchant failed:', err)
    }
  },

  // 加载商家设置（常用备注）
  async loadMerchantSettings() {
    try {
      const res = await api.merchant.getSettings()
      this.setData({
        merchantSettings: res,
        quickRemarks: res.quick_remarks || []
      })
    } catch (err) {
      console.error('Load merchant settings failed:', err)
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('user_info')
    if (userInfo) {
      // 优先使用 nickname（后端存储），其次是 nickName（微信原始）
      const name = userInfo.nickname || userInfo.nickName || ''
      this.setData({
        customerName: name
      })
    }
  },


  // 减少数量
  decreaseQuantity(e) {
    const { index } = e.currentTarget.dataset
    let cart = [...this.data.cart]

    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1
      cart[index].itemTotalYuan = this._formatPrice((cart[index].price + (cart[index].optionsExtraPrice || 0)) * cart[index].quantity)
    } else {
      cart.splice(index, 1)
    }

    // 重新计算购物车原始数据（用于存储）
    const rawCart = cart.map(({ unitPriceYuan, itemTotalYuan, ...rest }) => rest)

    this.setData({
      cart,
      totalPriceYuan: this._formatPrice(this.calculateTotalPrice(rawCart))
    })
    wx.setStorageSync('cart', rawCart)
  },

  // 增加数量
  increaseQuantity(e) {
    const { index } = e.currentTarget.dataset
    let cart = [...this.data.cart]
    cart[index].quantity += 1
    cart[index].itemTotalYuan = this._formatPrice((cart[index].price + (cart[index].optionsExtraPrice || 0)) * cart[index].quantity)

    // 重新计算购物车原始数据（用于存储）
    const rawCart = cart.map(({ unitPriceYuan, itemTotalYuan, ...rest }) => rest)

    this.setData({
      cart,
      totalPriceYuan: this._formatPrice(this.calculateTotalPrice(rawCart))
    })
    wx.setStorageSync('cart', rawCart)
  },

  // 删除商品
  removeItem(e) {
    const { index } = e.currentTarget.dataset
    let cart = [...this.data.cart]
    cart.splice(index, 1)

    // 重新计算购物车原始数据（用于存储）
    const rawCart = cart.map(({ unitPriceYuan, itemTotalYuan, ...rest }) => rest)

    this.setData({
      cart,
      totalPriceYuan: this._formatPrice(this.calculateTotalPrice(rawCart))
    })
    wx.setStorageSync('cart', rawCart)

    if (cart.length === 0) {
      wx.navigateBack()
    }
  },

  // 清空购物车
  clearCart() {
    wx.showModal({
      title: '提示',
      content: '确定清空购物车吗？',
      confirmColor: '#ff6600',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            cart: [],
            totalPriceYuan: '0.00'
          })
          wx.setStorageSync('cart', [])
          wx.navigateBack()
        }
      }
    })
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },

  // 点击快捷备注
  onQuickRemarkTap(e) {
    const { remark } = e.currentTarget.dataset
    const currentRemark = this.data.remark
    // 如果已经有内容，追加逗号分隔
    const newRemark = currentRemark
      ? currentRemark + (currentRemark.endsWith('，') || currentRemark.endsWith(',') ? '' : '，') + remark
      : remark
    this.setData({ remark: newRemark })
  },

  // 切换价格明细（可选）
  togglePriceDetail() {
    // 可以展开显示详细价格 breakdown
    wx.showToast({
      title: '商品明细',
      icon: 'none'
    })
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({ customerName: e.detail.value })
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({ customerPhone: e.detail.value })
  },

  // 获取微信手机号
  getPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // TODO: 调用后端解密手机号
      // 临时使用 code
      console.log('Phone code:', e.detail.code)
      wx.showToast({
        title: '获取成功',
        icon: 'success'
      })
    }
  },

  // 检查登录状态，未登录则提示
  async checkLogin() {
    if (auth.isLoggedIn()) {
      return true
    }

    // 尝试静默登录
    const result = await auth.silentLogin()
    if (result.success) {
      return true
    }

    // 静默登录失败，提示用户
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '提示',
        content: '下单需要先登录',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          resolve(res.confirm)
        }
      })
    })

    if (confirm) {
      // 用户确认登录，重新尝试静默登录
      const retryResult = await auth.silentLogin()
      if (retryResult.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        return true
      } else {
        showError('登录失败，请重试')
        return false
      }
    }

    return false
  },

  // 提交订单
  async submitOrder() {
    if (this.data.cart.length === 0) {
      showError('购物车为空')
      return
    }

    if (!this.data.customerName.trim()) {
      showError('请输入姓名')
      return
    }

    // 检查登录状态
    const isLoggedIn = await this.checkLogin()
    if (!isLoggedIn) {
      return
    }

    this.setData({ submitting: true })
    showLoading('提交中...')

    try {
      // 构建订单数据
      const orderData = {
        customer_name: this.data.customerName.trim(),
        customer_phone: this.data.customerPhone.trim(),
        note: this.data.remark.trim(),
        items: this.data.cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          options: item.selectedOptions.map(opt => ({
            option_id: opt.option_id,
            value_id: opt.value_id
          }))
        }))
      }

      const res = await api.orders.create(orderData)

      // 清空购物车
      wx.removeStorageSync('cart')

      showSuccess('下单成功')

      // 跳转到订单详情
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/order-detail/order-detail?id=${res.id}`
        })
      }, 1500)

    } catch (err) {
      console.error('Submit order failed:', err)
      // 如果是 401 错误，说明 token 过期，清除登录状态并提示重新登录
      if (err.message && err.message.includes('401')) {
        auth.logout()
        showError('登录已过期，请重新登录')
      } else {
        showError(err.message || '下单失败')
      }
    } finally {
      hideLoading()
      this.setData({ submitting: false })
    }
  }
})
