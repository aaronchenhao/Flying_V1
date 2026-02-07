App({
  onLaunch() {
    console.log('Deep Space Evasion MiniProgram Launched')
  },
  globalData: {
    // 本地开发使用这个地址（端口可能会变化）
    gameUrl: 'http://localhost:5173/'
    // 生产环境部署后改为: 'https://your-domain.com/'
  }
})
