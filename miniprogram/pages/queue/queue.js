const { api } = require('../../utils/api')
const { formatPrice, formatTime } = require('../../utils/util')

Page({
  data: {
    loading: false,
    queueData: {
      pending: [],
      preparing: [],
      ready: []
    },
    myOrders: [],
    statusText: {
      pending: '待制作',
      preparing: '制作中',
      ready: '待取餐',
      completed: '已完成'
    },
    activeTab: 'my'
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
    this.loadQueueData()
    this.loadMyOrders()
  },

  onShow() {
    this.loadQueueData()
    this.loadMyOrders()
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadQueueData(),
      this.loadMyOrders()
    ]).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载队列数据
  async loadQueueData() {
    this.setData({ loading: true })
    try {
      const res = await api.queue.get()
      this.setData({
        queueData: {
          pending: res.pending || [],
          preparing: res.preparing || [],
          ready: res.ready || []
        }
      })
    } catch (err) {
      console.error('Load queue failed:', err)
      // 使用模拟数据
      this.setData({
        queueData: {
          pending: [
            { id: '1', pickup_code: '001', items: [{ product_name: '招牌牛肉面' }] },
            { id: '2', pickup_code: '002', items: [{ product_name: '宫保鸡丁饭' }] }
          ],
          preparing: [
            { id: '3', pickup_code: '003', items: [{ product_name: '扬州炒饭' }] }
          ],
          ready: [
            { id: '4', pickup_code: '004', items: [{ product_name: '炸鸡块' }] }
          ]
        }
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载我的订单
  async loadMyOrders() {
    try {
      const res = await api.orders.list({
        status: 'pending,preparing,ready',
        page_size: 10
      })
      const myOrders = (res.items || []).map(order => ({
        ...order,
        totalAmountYuan: this._formatPrice(order.total_amount)
      }))
      this.setData({
        myOrders
      })
    } catch (err) {
      console.error('Load my orders failed:', err)
      this.setData({ myOrders: [] })
    }
  },

  // 切换 Tab
  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ activeTab: tab })
  },

  // 刷新队列
  refreshQueue() {
    this.loadQueueData()
    wx.showToast({
      title: '已刷新',
      icon: 'success'
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
