const { api } = require('../../utils/api')
const { formatPrice, formatDateTime, showLoading, hideLoading, showSuccess } = require('../../utils/util')

Page({
  data: {
    loading: true,
    order: null,
    statusText: {
      pending: '待制作',
      preparing: '制作中',
      ready: '待取餐',
      completed: '已完成',
      cancelled: '已取消'
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

  onLoad(options) {
    if (options.id) {
      this.loadOrderDetail(options.id)
    } else {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'error'
      })
      wx.navigateBack()
    }
  },

  onPullDownRefresh() {
    if (this.data.order) {
      this.loadOrderDetail(this.data.order.id).then(() => {
        wx.stopPullDownRefresh()
      })
    }
  },

  // 加载订单详情
  async loadOrderDetail(id) {
    showLoading('加载中...')
    try {
      const res = await api.orders.detail(id)
      // 格式化价格
      // 格式化日期
      const createdAt = res.created_at || ''
      const orderDateStr = createdAt ? createdAt.substring(0, 10) : ''
      const formattedDateTime = formatDateTime(createdAt)

      console.log('Order created_at:', createdAt)
      console.log('Formatted date time:', formattedDateTime)

      const orderWithFormattedPrice = {
        ...res,
        totalAmountYuan: this._formatPrice(res.total_amount),
        orderDateStr: orderDateStr,
        formattedCreatedAt: formattedDateTime,
        items: (res.items || []).map(item => ({
          ...item,
          productPriceYuan: this._formatPrice(item.product_price)
        }))
      }
      this.setData({
        order: orderWithFormattedPrice,
        loading: false
      })
    } catch (err) {
      console.error('Load order detail failed:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      hideLoading()
    }
  },

  // 取消订单
  async cancelOrder() {
    wx.showModal({
      title: '提示',
      content: '确定取消订单吗？',
      success: async (res) => {
        if (res.confirm) {
          showLoading('取消中...')
          try {
            await api.orders.cancel(this.data.order.id)
            showSuccess('已取消')
            this.loadOrderDetail(this.data.order.id)
          } catch (err) {
            wx.showToast({
              title: err.message || '取消失败',
              icon: 'none'
            })
          } finally {
            hideLoading()
          }
        }
      }
    })
  },

  // 再来一单
  reorder() {
    // 将订单商品加入购物车
    const cart = this.data.order.items.map(item => ({
      id: item.product_id,
      name: item.product_name,
      price: item.product_price,
      quantity: item.quantity,
      selectedOptions: item.selected_options.map(opt => ({
        option_name: opt.option_name,
        option_value: opt.option_value,
        extra_price: opt.extra_price
      }))
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
  },

  // 联系商家
  contactMerchant() {
    wx.makePhoneCall({
      phoneNumber: '13800138000' // TODO: 从商家信息获取
    })
  },

  // 导航到店铺
  navigateToShop() {
    wx.openLocation({
      latitude: 39.9042, // TODO: 从商家信息获取
      longitude: 116.4074,
      name: '美味小厨',
      address: '北京市朝阳区美食街88号'
    })
  },

  // 复制订单号
  copyOrderNumber() {
    wx.setClipboardData({
      data: this.data.order.order_number,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  }
})
