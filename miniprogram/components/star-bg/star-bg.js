Component({
  data: {
    stars: [],
    shootingStars: []
  },

  lifetimes: {
    attached() {
      this.generateStars()
      this.generateShootingStars()
    }
  },

  methods: {
    // 生成星星 - 类似游戏的曲速星星从中心向外分布
    generateStars() {
      const stars = []
      const count = 150 // 增加星星数量

      const systemInfo = wx.getSystemInfoSync()
      const screenWidth = systemInfo.windowWidth * (750 / systemInfo.windowWidth)
      const screenHeight = systemInfo.windowHeight * (750 / systemInfo.windowWidth)

      const centerX = screenWidth / 2
      const centerY = screenHeight * 0.8 // 中心点在底部偏下（与游戏一致）

      for (let i = 0; i < count; i++) {
        // 使用极坐标分布，星星从中心向外密度递减
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * Math.random() * Math.max(screenWidth, screenHeight) * 0.7

        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius

        // 越靠近中心的星星越小越亮
        const distRatio = radius / Math.max(screenWidth, screenHeight)
        const size = Math.random() * 2 + 1 + (1 - distRatio) * 2
        const opacity = Math.random() * 0.5 + 0.5 - distRatio * 0.3

        stars.push({
          id: i,
          x: x,
          y: y,
          size: size,
          opacity: opacity
        })
      }

      this.setData({ stars })
    },

    // 生成流星 - 更克制的效果
    generateShootingStars() {
      const shootingStars = []
      const count = 2 // 减少流星数量

      const systemInfo = wx.getSystemInfoSync()
      const screenWidth = systemInfo.windowWidth * (750 / systemInfo.windowWidth)
      const screenHeight = systemInfo.windowHeight * (750 / systemInfo.windowWidth)

      for (let i = 0; i < count; i++) {
        shootingStars.push({
          id: i,
          x: Math.random() * screenWidth + 200,
          y: Math.random() * screenHeight * 0.4,
          delay: Math.random() * 8 + i * 8 // 更长的间隔
        })
      }

      this.setData({ shootingStars })
    }
  }
})
