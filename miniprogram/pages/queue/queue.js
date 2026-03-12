const { api } = require('../../utils/api')
const { formatTime } = require('../../utils/util')

Page({
  data: {
    loading: false,
    queueData: {
      pending: [],
      preparing: [],
      ready: []
    },
    statusText: {
      pending: '待制作',
      preparing: '制作中',
      ready: '待取餐',
      completed: '已完成'
    },
    countdown: 30
  },

  // 自动刷新定时器
  refreshTimer: null,
  countdownTimer: null,

  onLoad() {
    this.loadQueueData()
    this.startAutoRefresh()
  },

  onShow() {
    this.loadQueueData()
    this.startAutoRefresh()
  },

  onHide() {
    this.stopAutoRefresh()
  },

  onUnload() {
    this.stopAutoRefresh()
  },

  onPullDownRefresh() {
    this.loadQueueData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 启动自动刷新
  startAutoRefresh() {
    // 先清除可能存在的定时器
    this.stopAutoRefresh()
    // 初始化倒计时
    this.setData({ countdown: 30 })
    // 每秒更新倒计时
    this.countdownTimer = setInterval(() => {
      this.setData({
        countdown: this.data.countdown > 0 ? this.data.countdown - 1 : 30
      })
    }, 1000)
    // 每30秒刷新一次
    this.refreshTimer = setInterval(() => {
      this.loadQueueData()
      this.setData({ countdown: 30 })
    }, 30000)
  },

  // 停止自动刷新
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  },

  // 加载队列数据
  async loadQueueData() {
    this.setData({ loading: true })
    try {
      const res = await api.queue.get()

      // 处理队列数据，添加商品信息和前面还有多少个
      const pending = (res.pending || []).map((order, index) => ({
        ...order,
        // 提取商品名称列表
        productNames: order.items ? order.items.map(item => item.product_name).join('、') : '',
        // 前面还有多少个（自己是第 index+1 个，前面有 index 个）
        aheadCount: index
      }))

      const preparing = (res.preparing || []).map(order => ({
        ...order,
        productNames: order.items ? order.items.map(item => item.product_name).join('、') : ''
      }))

      const ready = (res.ready || []).map(order => ({
        ...order,
        productNames: order.items ? order.items.map(item => item.product_name).join('、') : ''
      }))

      // 获取当前时间
      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

      this.setData({
        queueData: { pending, preparing, ready },
        lastUpdateTime: timeStr
      })
    } catch (err) {
      console.error('Load queue failed:', err)
      // 使用模拟数据
      this.setData({
        queueData: {
          pending: [
            { id: '1', pickup_code: '001', items: [{ product_name: '招牌牛肉面' }], productNames: '招牌牛肉面', aheadCount: 0 },
            { id: '2', pickup_code: '002', items: [{ product_name: '宫保鸡丁饭' }], productNames: '宫保鸡丁饭', aheadCount: 1 }
          ],
          preparing: [
            { id: '3', pickup_code: '003', items: [{ product_name: '扬州炒饭' }], productNames: '扬州炒饭' }
          ],
          ready: [
            { id: '4', pickup_code: '004', items: [{ product_name: '炸鸡块' }], productNames: '炸鸡块' }
          ]
        }
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 刷新队列
  refreshQueue() {
    // 重置倒计时
    this.setData({ countdown: 30 })
    this.loadQueueData().then(() => {
      wx.showToast({
        title: '已刷新',
        icon: 'success'
      })
    })
  },

  // 跳转到订单详情
  goToOrderDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    })
  }
})
