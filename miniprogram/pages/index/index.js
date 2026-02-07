Page({
  data: {
    showPlatformsModal: false,
    showDisclaimerModal: false
  },

  onLoad() {
    // 页面加载时检查是否需要显示引导
    console.log('入口页加载完成')
  },

  onReady() {
    // 页面初次渲染完成
  },

  // 进入游戏
  enterGame() {
    wx.navigateTo({
      url: '/pages/game/index',
      success: () => {
        console.log('进入游戏页面')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        wx.showToast({
          title: '进入失败',
          icon: 'none'
        })
      }
    })
  },

  // 显示更多平台弹窗
  showMorePlatforms() {
    this.setData({ showPlatformsModal: true })
  },

  // 显示用户协议弹窗
  showDisclaimer() {
    this.setData({ showDisclaimerModal: true })
  },

  // 显示关注我们（复用更多平台弹窗）
  showSocial() {
    this.setData({ showPlatformsModal: true })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showPlatformsModal: false,
      showDisclaimerModal: false
    })
  },

  // 阻止冒泡
  preventClose(e) {
    // 什么都不做，阻止事件冒泡
  },

  // 复制备案号
  copyBeian() {
    wx.setClipboardData({
      data: '京ICP备XXXXXXXX号-1',
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success',
          duration: 1500
        })
      }
    })
  },

  // 分享到微信好友
  onShareAppMessage() {
    return {
      title: '深空逃逸 - 规避协议',
      desc: '在深空中躲避障碍，挑战你的反应极限！',
      path: '/pages/index/index',
      imageUrl: '/assets/share-image.png' // 需要准备分享图片
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '深空逃逸 - 我正在挑战深空极限！',
      query: '',
      imageUrl: '/assets/share-image.png'
    }
  }
})
