const app = getApp()

Page({
  data: {
    gameUrl: '',
    loading: true,
    error: false
  },

  onLoad(options) {
    // 获取全局配置的游戏 URL
    const gameUrl = app.globalData.gameUrl
    
    // 可以添加自定义参数
    const params = this.buildParams(options)
    const finalUrl = params ? `${gameUrl}?${params}` : gameUrl
    
    this.setData({ 
      gameUrl: finalUrl,
      loading: true,
      error: false
    })

    console.log('游戏页加载, URL:', finalUrl)
  },

  onReady() {
    // 设置加载超时
    this.loadingTimeout = setTimeout(() => {
      if (this.data.loading) {
        this.setData({ loading: false })
      }
    }, 3000)
  },

  onUnload() {
    // 清理定时器
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout)
    }
  },

  // 构建参数
  buildParams(options) {
    const params = []
    
    // 添加来源标识
    params.push('source=miniprogram')
    
    // 添加版本号
    params.push('version=1.6.0')
    
    // 添加用户语言
    const systemInfo = wx.getSystemInfoSync()
    params.push(`lang=${systemInfo.language.includes('zh') ? 'CN' : 'EN'}`)
    
    return params.join('&')
  },

  // WebView 加载完成
  onWebViewLoad() {
    console.log('WebView 加载完成')
    this.setData({ 
      loading: false,
      error: false
    })
    
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout)
    }
  },

  // WebView 加载错误
  onWebViewError(e) {
    console.error('WebView 加载错误:', e)
    this.setData({ 
      loading: false,
      error: true
    })
    
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout)
    }
  },

  // 处理来自 WebView 的消息
  handleMessage(e) {
    const { data } = e.detail
    console.log('收到来自游戏的消息:', data)
    
    if (!data || !data.length) return
    
    const message = data[0]
    
    switch (message.type) {
      case 'gameReady':
        // 游戏准备就绪
        console.log('游戏准备就绪')
        break
        
      case 'gameOver':
        // 游戏结束，记录分数
        console.log('游戏结束, 分数:', message.score)
        this.saveScore(message.score)
        break
        
      case 'stageClear':
        // 关卡完成
        console.log('关卡完成:', message.stage)
        break
        
      case 'share':
        // 触发分享
        this.shareGame(message)
        break
        
      case 'vibrate':
        // 振动反馈
        this.handleVibrate(message)
        break
        
      default:
        console.log('未知消息类型:', message.type)
    }
  },

  // 保存分数到小程序存储
  saveScore(score) {
    try {
      const key = 'DEEP_SPACE_SCORE'
      const currentBest = wx.getStorageSync(key) || 0
      
      if (score > currentBest) {
        wx.setStorageSync(key, score)
        console.log('新纪录:', score)
      }
    } catch (e) {
      console.error('保存分数失败:', e)
    }
  },

  // 分享游戏
  shareGame(message) {
    // 显示分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 处理振动
  handleVibrate(message) {
    if (message.short) {
      wx.vibrateShort({ type: 'light' })
    } else {
      wx.vibrateLong()
    }
  },

  // 重试加载
  retryLoad() {
    this.setData({ 
      loading: true,
      error: false
    })
    
    // 重新加载 WebView
    const gameUrl = this.data.gameUrl
    this.setData({ gameUrl: '' })
    
    setTimeout(() => {
      this.setData({ gameUrl })
    }, 100)
  },

  // 返回入口页
  goBack() {
    wx.navigateBack({
      fail: () => {
        // 如果返回失败，直接跳转到首页
        wx.reLaunch({
          url: '/pages/index/index'
        })
      }
    })
  },

  // 页面分享配置
  onShareAppMessage() {
    return {
      title: '深空逃逸 - 我在挑战深空极限！',
      path: '/pages/index/index',
      imageUrl: '/assets/share-image.png'
    }
  },

  onShareTimeline() {
    return {
      title: '深空逃逸 - 我在挑战深空极限！',
      query: '',
      imageUrl: '/assets/share-image.png'
    }
  }
})
