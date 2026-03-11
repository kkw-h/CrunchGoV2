const { api } = require('../../utils/api')
const { formatPrice, formatDateTime, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    loading: false,
    orders: [],
    currentTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待制作' },
      { key: 'preparing', label: '制作中' },
      { key: 'ready', label: '待取餐' },
      { key: 'completed', label: '已完成' }
    ],
    statusText: {
      pending: '待制作',
      preparing: '制作中',
      ready: '待取餐',
      completed: '已完成',
      cancelled: '已取消'
    },
    pagination: {
      page: 1,
      pageSize: 10,
      hasMore: true
    }
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

  formatDateTime,

  onLoad() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.setData({
      'pagination.page': 1,
      'pagination.hasMore': true,
      orders: []
    })
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.pagination.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 切换 Tab
  switchTab(e) {
    const { key } = e.currentTarget.dataset
    this.setData({
      currentTab: key,
      orders: [],
      'pagination.page': 1,
      'pagination.hasMore': true
    })
    this.loadOrders()
  },

  // 加载订单
  async loadOrders() {
    this.setData({ loading: true })
    showLoading('加载中...')

    try {
      const params = {
        page: this.data.pagination.page,
        page_size: this.data.pagination.pageSize
      }

      if (this.data.currentTab !== 'all') {
        params.status = this.data.currentTab
      }

      const res = await api.orders.list(params)
      const orders = (res.items || []).map(order => ({
        ...order,
        totalAmountYuan: this._formatPrice(order.total_amount)
      }))

      this.setData({
        orders: this.data.pagination.page === 1 ? orders : [...this.data.orders, ...orders],
        'pagination.hasMore': orders.length === this.data.pagination.pageSize
      })
    } catch (err) {
      console.error('Load orders failed:', err)
      // 使用模拟数据
      if (this.data.pagination.page === 1) {
        this.setData({
          orders: this.getMockOrders()
        })
      }
    } finally {
      hideLoading()
      this.setData({ loading: false })
    }
  },

  // 加载更多
  loadMore() {
    this.setData({
      'pagination.page': this.data.pagination.page + 1
    })
    this.loadOrders()
  },

  // 模拟订单数据
  getMockOrders() {
    return [
      {
        id: '1',
        order_number: '202403110001',
        pickup_code: '001',
        status: 'ready',
        total_amount: 2800,
        created_at: new Date().toISOString(),
        items: [{ product_name: '招牌牛肉面', quantity: 1 }]
      },
      {
        id: '2',
        order_number: '202403110002',
        pickup_code: '002',
        status: 'preparing',
        total_amount: 2200,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        items: [{ product_name: '宫保鸡丁饭', quantity: 1 }]
      },
      {
        id: '3',
        order_number: '202403110003',
        pickup_code: '003',
        status: 'completed',
        total_amount: 1800,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        items: [{ product_name: '扬州炒饭', quantity: 1 }]
      }
    ]
  },

  // 跳转到订单详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    })
  },

  // 再来一单
  reorder(e) {
    const { order } = e.currentTarget.dataset
    // 将商品加入购物车
    const cart = order.items.map(item => ({
      id: item.product_id,
      name: item.product_name,
      price: item.product_price,
      quantity: item.quantity,
      selectedOptions: item.selected_options || []
    }))

    wx.setStorageSync('cart', cart)

    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    })

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/menu/menu'
      })
    }, 1000)
  }
})