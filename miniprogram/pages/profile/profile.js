const { api } = require('../../utils/api')
const { formatPrice, formatTime, showLoading, hideLoading } = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    orderStats: {
      pending: 0,
      preparing: 0,
      ready: 0
    },
    recentOrders: []
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

  formatTime,

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
    this.loadOrderStats()
  },

  // 获取用户信息
  async getUserProfile() {
    // 先检查是否已登录
    if (!auth.isLoggedIn()) {
      // 未登录，执行静默登录
      const result = await auth.silentLogin()
      if (!result.success) {
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
        return
      }
    }

    // 获取微信用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        // 更新本地显示
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        // 更新后端用户信息
        auth.updateUserInfo({
          nickname: res.userInfo.nickName,
          avatar_url: res.userInfo.avatarUrl
        })
      }
    })
  },

  // 加载用户信息
  loadUserInfo() {
    if (auth.isLoggedIn()) {
      const userInfo = auth.getStoredUserInfo()
      if (userInfo) {
        this.setData({
          userInfo: {
            nickName: userInfo.nickname,
            avatarUrl: userInfo.avatar_url
          },
          hasUserInfo: true
        })
      }
      // 尝试获取最新信息
      this.fetchUserInfo()
    } else {
      this.setData({
        userInfo: null,
        hasUserInfo: false
      })
    }
  },

  // 从后端获取用户信息
  async fetchUserInfo() {
    try {
      const userInfo = await auth.getCurrentUser()
      if (userInfo) {
        this.setData({
          userInfo: {
            nickName: userInfo.nickname,
            avatarUrl: userInfo.avatar_url
          },
          hasUserInfo: true
        })
      }
    } catch (err) {
      console.error('Fetch user info failed:', err)
    }
  },

  // 加载订单统计
  async loadOrderStats() {
    if (!auth.isLoggedIn()) {
      this.setData({
        orderStats: { pending: 0, preparing: 0, ready: 0 },
        recentOrders: []
      })
      return
    }

    try {
      const res = await api.orders.list({
        status: 'pending,preparing,ready',
        page_size: 100
      })

      const orders = (res.items || []).map(order => ({
        ...order,
        totalAmountYuan: this._formatPrice(order.total_amount)
      }))
      const stats = {
        pending: orders.filter(o => o.status === 'pending').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length
      }

      this.setData({
        orderStats: stats,
        recentOrders: orders.slice(0, 3)
      })
    } catch (err) {
      console.error('Load order stats failed:', err)
      this.setData({
        orderStats: { pending: 0, preparing: 0, ready: 0 },
        recentOrders: []
      })
    }
  },

  // 跳转到订单列表
  goToOrders() {
    if (!auth.isLoggedIn()) {
      this.promptLogin()
      return
    }
    wx.navigateTo({
      url: '/pages/order/order'
    })
  },

  // 跳转到订单详情
  goToOrderDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    })
  },

  // 提示登录
  async promptLogin() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '提示',
        content: '该功能需要登录后才能使用',
        confirmText: '去登录',
        success: (res) => {
          resolve(res.confirm)
        }
      })
    })

    if (confirm) {
      const result = await auth.silentLogin()
      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        this.loadUserInfo()
        this.loadOrderStats()
      } else {
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
      }
    }
  },

  // 联系客服
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '13800138000'
    })
  },

  // 查看商家信息
  viewMerchant() {
    wx.navigateTo({
      url: '/pages/merchant/merchant'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
          this.setData({
            userInfo: null,
            hasUserInfo: false,
            orderStats: { pending: 0, preparing: 0, ready: 0 },
            recentOrders: []
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  }
})
