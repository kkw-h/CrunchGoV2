const { api } = require('../../utils/api')
const { formatTime } = require('../../utils/util')
const auth = require('../../utils/auth')

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    isEditing: false,
    editNickname: '',
    tempAvatarUrl: '',
    orderStats: {
      pending: 0,
      preparing: 0,
      ready: 0,
      total: 0
    },
    recentOrders: []
  },

  // 状态文本映射
  statusTextMap: {
    pending: '待制作',
    preparing: '制作中',
    ready: '待取餐',
    completed: '已完成',
    cancelled: '已取消'
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

  // 获取用户信息（旧版方式，供点击头像区域使用）
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
      success: async (res) => {
        const { nickName, avatarUrl } = res.userInfo

        wx.showLoading({ title: '保存中...' })
        try {
          // 更新后端
          await api.auth.updateMe({
            nickname: nickName,
            avatar_url: avatarUrl
          })

          // 更新本地显示
          this.setData({
            userInfo: {
              nickName,
              avatarUrl
            },
            hasUserInfo: true
          })

          // 更新本地存储
          auth.updateUserInfo({
            nickname: nickName,
            avatar_url: avatarUrl
          })

          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        } catch (err) {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          })
        }
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
        totalAmountYuan: this._formatPrice(order.total_amount),
        statusText: this.statusTextMap[order.status] || order.status
      }))
      const stats = {
        pending: orders.filter(o => o.status === 'pending').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        total: orders.length
      }

      this.setData({
        orderStats: stats,
        recentOrders: orders.slice(0, 3)
      })
    } catch (err) {
      console.error('Load order stats failed:', err)
      this.setData({
        orderStats: { pending: 0, preparing: 0, ready: 0, total: 0 },
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
      // 执行带用户信息获取的登录
      this.doLoginWithProfile()
    }
  },

  // 执行登录并获取微信用户信息
  async doLoginWithProfile() {
    wx.showLoading({ title: '登录中...' })

    try {
      // 1. 静默登录获取 token
      const result = await auth.silentLogin()
      if (!result.success) {
        throw new Error(result.error || '登录失败')
      }

      wx.hideLoading()

      // 2. 登录成功，获取微信用户信息（必须在用户点击的上下文中调用）
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: async (res) => {
          const { nickName, avatarUrl } = res.userInfo

          wx.showLoading({ title: '保存中...' })
          try {
            // 更新到后端
            await api.auth.updateMe({
              nickname: nickName,
              avatar_url: avatarUrl
            })

            // 更新本地存储
            auth.updateUserInfo({
              nickname: nickName,
              avatar_url: avatarUrl
            })

            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })

            this.loadUserInfo()
            this.loadOrderStats()
          } catch (err) {
            console.error('Save user info failed:', err)
            // 保存用户信息失败不影响登录
            this.loadUserInfo()
            this.loadOrderStats()
          }
        },
        fail: () => {
          // 用户拒绝授权，仍然登录成功
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
          this.loadUserInfo()
          this.loadOrderStats()
        }
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      })
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

  // 开始编辑资料
  startEdit() {
    if (!this.data.hasUserInfo) {
      this.promptLogin()
      return
    }
    this.setData({
      isEditing: true,
      editNickname: this.data.userInfo.nickName || '',
      tempAvatarUrl: this.data.userInfo.avatarUrl || ''
    })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      isEditing: false,
      editNickname: '',
      tempAvatarUrl: ''
    })
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      tempAvatarUrl: avatarUrl
    })
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      editNickname: e.detail.value
    })
  },

  // 保存用户资料
  async saveProfile() {
    const { editNickname, tempAvatarUrl } = this.data

    if (!editNickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      let avatarUrl = this.data.userInfo.avatarUrl

      // 如果头像有变更，先上传到服务器
      if (tempAvatarUrl && tempAvatarUrl !== this.data.userInfo.avatarUrl) {
        // 将临时文件上传到七牛云
        const uploadRes = await this.uploadAvatar(tempAvatarUrl)
        avatarUrl = uploadRes.url
      }

      // 更新用户信息
      await api.auth.updateMe({
        nickname: editNickname.trim(),
        avatar_url: avatarUrl
      })

      // 更新本地显示
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          nickName: editNickname.trim(),
          avatarUrl: avatarUrl
        },
        isEditing: false
      })

      // 更新本地存储
      auth.updateUserInfo({
        nickname: editNickname.trim(),
        avatar_url: avatarUrl
      })

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('Save profile failed:', err)
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 上传头像到后端
  async uploadAvatar(tempFilePath) {
    const app = getApp()
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/api/v1/upload/image`,
        filePath: tempFilePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${auth.getToken()}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const data = JSON.parse(res.data)
            resolve(data)
          } else {
            const error = JSON.parse(res.data)
            reject(new Error(error.detail || '上传失败'))
          }
        },
        fail: reject
      })
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
            orderStats: { pending: 0, preparing: 0, ready: 0, total: 0 },
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
