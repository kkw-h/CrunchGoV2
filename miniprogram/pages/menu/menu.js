const { api } = require('../../utils/api')
const { formatPrice, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    loading: false,
    categories: [],
    products: [],
    currentCategory: null,
    cart: [],
    showCartDetail: false,
    showProductModal: false,
    selectedProduct: null,
    selectedOptions: {},
    cartTotal: 0,
    cartCount: 0
  },

  onLoad(options) {
    // 加载购物车缓存
    this.loadCart()

    this.loadCategories()

    // 如果有指定商品ID，滚动到该商品
    if (options.productId) {
      this.highlightProduct(options.productId)
    }
  },

  onShow() {
    // 刷新购物车
    this.loadCart()
  },

  // 加载购物车
  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    // 计算每个购物车项的显示价格
    const cartWithPriceYuan = cart.map(item => {
      const unitPrice = item.price + (item.optionsExtraPrice || 0)
      return {
        ...item,
        unitPriceYuan: this._formatPrice(unitPrice),
        itemTotalYuan: this._formatPrice(unitPrice * item.quantity)
      }
    })
    this.setData({
      cart: cartWithPriceYuan,
      cartTotalYuan: this._formatPrice(this.calculateCartTotal(cart)),
      cartCount: this.calculateCartCount(cart)
    })
  },

  // 计算购物车总价
  calculateCartTotal(cart) {
    return cart.reduce((total, item) => {
      const unitPrice = item.price + (item.optionsExtraPrice || 0)
      return total + unitPrice * item.quantity
    }, 0)
  },

  // 计算购物车总数量
  calculateCartCount(cart) {
    return cart.reduce((count, item) => count + item.quantity, 0)
  },

  // 加载分类
  async loadCategories() {
    showLoading('加载中...')
    try {
      const res = await api.categories.list()
      const categories = res.items || []

      if (categories.length > 0) {
        this.setData({
          categories,
          currentCategory: categories[0].id
        })
        this.loadProducts(categories[0].id)
      }
    } catch (err) {
      console.error('Load categories failed:', err)
      // 使用模拟数据
      const mockCategories = [
        { id: '1', name: '热销推荐' },
        { id: '2', name: '主食' },
        { id: '3', name: '小吃' },
        { id: '4', name: '饮品' },
        { id: '5', name: '甜点' }
      ]
      this.setData({
        categories: mockCategories,
        currentCategory: mockCategories[0].id
      })
      this.loadProducts(mockCategories[0].id)
    } finally {
      hideLoading()
    }
  },

  // 格式化价格（分转元）
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

  // 加载商品
  async loadProducts(categoryId) {
    this.setData({ loading: true })
    try {
      const res = await api.products.list({ category_id: categoryId })

      // 处理商品数据，添加格式化后的价格
      const products = (res.items || []).map(p => ({
        ...p,
        priceYuan: this._formatPrice(p.price)
      }))

      this.setData({
        products: products
      })
    } catch (err) {
      console.error('Load products failed:', err)
      // 使用模拟数据
      this.setData({
        products: this.getMockProducts(categoryId)
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 模拟商品数据
  getMockProducts(categoryId) {
    const mockData = {
      '1': [
        { id: '1', name: '招牌牛肉面', price: 2800, description: '秘制汤底，精选牛腩', stock: 100, options: [
          { id: 'o1', name: '辣度', is_required: true, values: [{ id: 'v1', value: '不辣' }, { id: 'v2', value: '微辣' }, { id: 'v3', value: '中辣' }] },
          { id: 'o2', name: '加料', is_required: false, values: [{ id: 'v4', value: '加牛肉', extra_price: 500 }, { id: 'v5', value: '加蛋', extra_price: 200 }] }
        ]},
        { id: '2', name: '宫保鸡丁饭', price: 2200, description: '经典川菜', stock: 80 },
        { id: '3', name: '红烧排骨饭', price: 2600, description: '秘制红烧汁', stock: 60 }
      ],
      '2': [
        { id: '4', name: '扬州炒饭', price: 1800, description: '经典风味', stock: 50 },
        { id: '5', name: '蛋炒饭', price: 1200, description: '家常味道', stock: 100 }
      ],
      '3': [
        { id: '6', name: '炸鸡块', price: 1200, description: '外酥里嫩', stock: 100 },
        { id: '7', name: '薯条', price: 800, description: '香脆可口', stock: 150 }
      ],
      '4': [
        { id: '8', name: '鲜榨橙汁', price: 1200, description: '100%纯果汁', stock: 30 },
        { id: '9', name: '酸梅汤', price: 800, description: '古法熬制', stock: 50 }
      ],
      '5': [
        { id: '10', name: '红豆沙', price: 800, description: '软糯香甜', stock: 40 },
        { id: '11', name: '绿豆沙', price: 800, description: '清热解暑', stock: 40 }
      ]
    }
    return mockData[categoryId] || []
  },

  // 切换分类
  switchCategory(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ currentCategory: id })
    this.loadProducts(id)
  },

  // 选择商品（打开选项弹窗）
  selectProduct(e) {
    const { product } = e.currentTarget.dataset

    // 检查库存
    if (product.stock === 0) {
      wx.showToast({
        title: '该商品暂时缺货',
        icon: 'none'
      })
      return
    }

    // 如果没有选项，直接加入购物车
    if (!product.options || product.options.length === 0) {
      this.addToCart(product, [])
      return
    }

    // 初始化选项选择
    const selectedOptions = {}
    product.options.forEach(opt => {
      if (opt.is_required && opt.values.length > 0) {
        selectedOptions[opt.id] = opt.values[0].id
      }
    })

    // 添加格式化后的价格和选项额外价格
    const selectedProductWithPrice = {
      ...product,
      priceYuan: this._formatPrice(product.price),
      options: (product.options || []).map(opt => ({
        ...opt,
        values: (opt.values || []).map(v => ({
          ...v,
          extraPriceYuan: v.extra_price > 0 ? this._formatPrice(v.extra_price) : null
        }))
      }))
    }

    this.setData({
      selectedProduct: selectedProductWithPrice,
      selectedOptions,
      showProductModal: true
    })
  },

  // 选择选项
  selectOption(e) {
    const { optionId, valueId } = e.currentTarget.dataset
    this.setData({
      [`selectedOptions.${optionId}`]: valueId
    })
  },

  // 关闭商品弹窗
  closeProductModal() {
    this.setData({
      showProductModal: false,
      selectedProduct: null,
      selectedOptions: {}
    })
  },

  // 确认加入购物车
  confirmAddToCart() {
    const { selectedProduct, selectedOptions } = this.data
    console.log('confirmAddToCart - selectedProduct:', selectedProduct)
    console.log('confirmAddToCart - selectedOptions:', selectedOptions)

    // 检查必选项
    for (const opt of selectedProduct.options) {
      console.log('Checking required option:', opt.name, 'id:', opt.id, 'selected:', selectedOptions[opt.id])
      if (opt.is_required && !selectedOptions[opt.id]) {
        wx.showToast({
          title: `请选择${opt.name}`,
          icon: 'none'
        })
        return
      }
    }

    // 构建选项数组
    const options = []
    for (const opt of selectedProduct.options) {
      const valueId = selectedOptions[opt.id]
      console.log('Processing option:', opt.name, 'valueId:', valueId)
      if (valueId) {
        const value = opt.values.find(v => v.id === valueId)
        console.log('Found value:', value)
        if (value) {
          options.push({
            option_id: opt.id,
            value_id: valueId,
            option_name: opt.name,
            option_value: value.value,
            extra_price: value.extra_price || 0
          })
        }
      }
    }

    console.log('Final options:', options)
    this.addToCart(selectedProduct, options)
    this.closeProductModal()
  },

  // 加入购物车
  addToCart(product, options) {
    let cart = [...this.data.cart]

    // 计算选项额外价格
    const optionsExtraPrice = options.reduce((sum, opt) => sum + (opt.extra_price || 0), 0)

    // 检查是否已存在相同商品和选项
    const existingIndex = cart.findIndex(item => {
      if (item.id !== product.id) return false
      // 比较选项
      if (item.selectedOptions.length !== options.length) return false
      return options.every(opt =>
        item.selectedOptions.some(itemOpt =>
          itemOpt.option_id === opt.option_id && itemOpt.value_id === opt.value_id
        )
      )
    })

    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1
      cart[existingIndex].itemTotalYuan = this._formatPrice((cart[existingIndex].price + (cart[existingIndex].optionsExtraPrice || 0)) * cart[existingIndex].quantity)
    } else {
      const unitPrice = product.price + optionsExtraPrice
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        optionsExtraPrice,
        selectedOptions: options,
        quantity: 1,
        unitPriceYuan: this._formatPrice(unitPrice),
        itemTotalYuan: this._formatPrice(unitPrice)
      })
    }

    this.setData({
      cart,
      cartTotalYuan: this._formatPrice(this.calculateCartTotal(cart)),
      cartCount: this.calculateCartCount(cart)
    })
    wx.setStorageSync('cart', cart)

    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    })
  },

  // 减少数量
  decreaseQuantity(e) {
    const { index } = e.currentTarget.dataset
    let cart = [...this.data.cart]

    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1
      const unitPrice = cart[index].price + (cart[index].optionsExtraPrice || 0)
      cart[index].itemTotalYuan = this._formatPrice(unitPrice * cart[index].quantity)
    } else {
      cart.splice(index, 1)
    }

    this.setData({
      cart,
      cartTotalYuan: this._formatPrice(this.calculateCartTotal(cart)),
      cartCount: this.calculateCartCount(cart),
      showCartDetail: cart.length > 0 ? this.data.showCartDetail : false
    })
    wx.setStorageSync('cart', cart)
  },

  // 增加数量
  increaseQuantity(e) {
    const { index } = e.currentTarget.dataset
    let cart = [...this.data.cart]
    cart[index].quantity += 1
    const unitPrice = cart[index].price + (cart[index].optionsExtraPrice || 0)
    cart[index].itemTotalYuan = this._formatPrice(unitPrice * cart[index].quantity)

    this.setData({
      cart,
      cartTotalYuan: this._formatPrice(this.calculateCartTotal(cart)),
      cartCount: this.calculateCartCount(cart)
    })
    wx.setStorageSync('cart', cart)
  },

  // 删除购物车项
  removeCartItem(e) {
    const { index } = e.currentTarget.dataset
    let cart = [...this.data.cart]
    cart.splice(index, 1)

    this.setData({
      cart,
      cartTotalYuan: this._formatPrice(this.calculateCartTotal(cart)),
      cartCount: this.calculateCartCount(cart),
      showCartDetail: cart.length > 0 ? this.data.showCartDetail : false
    })
    wx.setStorageSync('cart', cart)
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
            cartTotalYuan: '0.00',
            cartCount: 0,
            showCartDetail: false
          })
          wx.setStorageSync('cart', [])
        }
      }
    })
  },

  // 切换购物车详情显示
  toggleCartDetail() {
    if (this.data.cart.length === 0) {
      wx.showToast({
        title: '购物车是空的',
        icon: 'none',
        duration: 1500
      })
      return
    }
    this.setData({
      showCartDetail: !this.data.showCartDetail
    })
  },

  // 关闭购物车详情
  closeCartDetail() {
    this.setData({ showCartDetail: false })
  },

  // 阻止事件冒泡
  preventClose(e) {
    // 什么都不做，只是阻止冒泡
  },

  // 去结算
  goToCheckout() {
    if (this.data.cart.length === 0) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none'
      })
      return
    }

    // 关闭购物车弹窗
    this.setData({ showCartDetail: false })

    wx.navigateTo({
      url: '/pages/cart/cart'
    })
  }
})
