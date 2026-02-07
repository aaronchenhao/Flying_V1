# 深空逃逸 - 微信小程序

> 微信小程序版本，使用 WebView 容器方案加载 H5 游戏。

## 项目结构

```
miniprogram/
├── app.js                 # 小程序入口
├── app.json               # 全局配置
├── app.wxss               # 全局样式（深空主题）
├── sitemap.json           # 搜索配置
├── components/            # 组件
│   └── star-bg/          # 星空背景组件
├── pages/                # 页面
│   ├── index/           # 入口页（门厅）
│   └── game/            # 游戏页（WebView）
└── utils/               # 工具
    └── wx-bridge.js     # H5 通信桥接脚本
```

## 双页面架构

```
┌─────────────────────────────────────────────────────────────┐
│                     微信小程序容器                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐    ┌───────────────────────────┐ │
│  │   pages/index        │    │      pages/game           │ │
│  │   (入口页/门厅)       │    │     (WebView容器)          │ │
│  │                      │    │                           │ │
│  │  ┌────────────────┐  │───▶│   ┌──────────────────┐    │ │
│  │  │  深空逃逸       │  │    │   │  web-view        │    │ │
│  │  │  DEEP SPACE    │  │    │   │  ┌────────────┐  │    │ │
│  │  │                │  │    │   │  │   H5 游戏   │  │    │ │
│  │  │ [ 访问官网 ]    │  │    │   │  │  (React)   │  │    │ │
│  │  │                │  │    │   │  │            │  │    │ │
│  │  │ 更多平台/关注  │  │    │   │  │ 完全复用   │  │    │ │
│  │  │ 备案号        │  │    │   │  │ Web代码    │  │    │ │
│  │  └────────────────┘  │    │   │  └────────────┘  │    │ │
│  │  (小程序原生组件)     │    │   │                   │    │ │
│  └──────────────────────┘    │   └───────────────────┘    │ │
│                              │                            │ │
└──────────────────────────────┴────────────────────────────┘
```

## 配置步骤

### 1. 配置 H5 游戏地址

编辑 `app.js`，将 `gameUrl` 替换为你的 H5 游戏部署地址：

```javascript
globalData: {
  gameUrl: 'https://your-game-domain.com'
}
```

### 2. 在 H5 游戏中引入桥接脚本

在你的 `index.html` 中引入：

```html
<script src="https://your-cdn.com/wx-bridge.js"></script>
```

或在 React 项目中导入：

```javascript
import './utils/wx-bridge'

// 在游戏代码中使用
if (window.wxBridge) {
  wxBridge.notifyGameOver(score, stage)
  wxBridge.vibrate()
}
```

### 3. 配置小程序业务域名

登录[微信公众平台](https://mp.weixin.qq.com/)，进入：

开发 → 开发管理 → 开发设置 → 服务器域名 → `downloadFile 合法域名`

添加你的 H5 游戏域名。

### 4. 准备分享图片

在 `miniprogram/assets/` 目录下放置分享图片 `share-image.png`。

## 通信协议

H5 游戏通过 `postMessage` 向小程序发送消息：

| 消息类型 | 数据 | 说明 |
|---------|------|------|
| `gameReady` | `{ status: 'ready' }` | 游戏加载完成 |
| `gameOver` | `{ score, stage }` | 游戏结束 |
| `stageClear` | `{ stage, score }` | 关卡完成 |
| `share` | `{ title, desc }` | 请求分享 |
| `vibrate` | `{ short: boolean }` | 振动反馈 |

## 部署流程

1. **部署 H5 游戏**
   ```bash
   # 在 V1 目录
   npm run build
   # 部署 dist 目录到服务器
   ```

2. **上传小程序**
   - 使用微信开发者工具打开 `miniprogram` 目录
   - 配置 `appId`
   - 点击「上传」

3. **提交审核**
   - 在小程序后台提交审核
   - 等待审核通过

## 注意事项

1. **域名备案**: H5 游戏域名必须备案，且支持 HTTPS
2. **WebView 限制**: 小程序 WebView 不支持支付、地理位置等部分 API
3. **存储同步**: localStorage 与小程序存储是两套系统，需要桥接同步
4. **分享图片**: 必须使用网络图片或临时文件路径

## 技术栈

- **小程序端**: 原生小程序 (WXML/WXSS/JS)
- **H5 游戏**: React 18 + TypeScript + Vite + Tailwind CSS
- **通信**: 微信 JS-SDK + postMessage
