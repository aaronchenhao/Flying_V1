/**
 * 微信 JS-SDK Bridge
 * 用于 H5 游戏与小程序宿主通信的适配层
 * 
 * 使用方法：
 * 1. 在 H5 游戏中引入此脚本
 * 2. 调用 wxBridge.sendMessage() 向小程序发送消息
 * 3. 调用 wxBridge.getStorage() / wxBridge.setStorage() 替代 localStorage
 */

(function (global) {
  'use strict'

  // 检测是否在小程序 WebView 环境中
  const isMiniProgram = () => {
    return (
      typeof wx !== 'undefined' &&
      wx.miniProgram &&
      wx.miniProgram.getEnv
    )
  }

  // 检测是否在普通浏览器环境
  const isBrowser = () => {
    return typeof window !== 'undefined' && !isMiniProgram()
  }

  class WxBridge {
    constructor() {
      this.isMiniProgram = isMiniProgram()
      this.isBrowser = isBrowser()
      this.callbacks = {}
      this.init()
    }

    init() {
      if (this.isMiniProgram) {
        console.log('[WxBridge] 运行在小程序 WebView 环境中')
        this.patchLocalStorage()
        this.notifyReady()
      } else {
        console.log('[WxBridge] 运行在普通浏览器环境中')
      }
    }

    // 向小程序发送消息
    sendMessage(type, data = {}) {
      if (this.isMiniProgram) {
        try {
          wx.miniProgram.postMessage({
            data: {
              type,
              ...data,
              timestamp: Date.now()
            }
          })
          console.log('[WxBridge] 消息已发送:', type, data)
        } catch (e) {
          console.error('[WxBridge] 发送消息失败:', e)
        }
      } else {
        console.log('[WxBridge] 浏览器环境 - 模拟发送消息:', type, data)
      }
    }

    // 通知小程序游戏已准备就绪
    notifyReady() {
      this.sendMessage('gameReady', { status: 'ready' })
    }

    // 通知游戏结束
    notifyGameOver(score, stage) {
      this.sendMessage('gameOver', { score, stage })
    }

    // 通知关卡完成
    notifyStageClear(stage, score) {
      this.sendMessage('stageClear', { stage, score })
    }

    // 触发分享
    triggerShare(title, desc) {
      this.sendMessage('share', { title, desc })
    }

    // 请求振动反馈
    vibrate(short = true) {
      this.sendMessage('vibrate', { short })
    }

    // 跳转到小程序其他页面
    navigateTo(url) {
      if (this.isMiniProgram) {
        wx.miniProgram.navigateTo({ url })
      }
    }

    // 返回小程序上一页
    navigateBack(delta = 1) {
      if (this.isMiniProgram) {
        wx.miniProgram.navigateBack({ delta })
      }
    }

    // 重定向到小程序页面
    redirectTo(url) {
      if (this.isMiniProgram) {
        wx.miniProgram.redirectTo({ url })
      }
    }

    // 切换到小程序 Tab 页
    switchTab(url) {
      if (this.isMiniProgram) {
        wx.miniProgram.switchTab({ url })
      }
    }

    // 获取小程序存储数据
    getStorage(key) {
      return new Promise((resolve, reject) => {
        if (this.isMiniProgram) {
          wx.miniProgram.getStorage({
            key,
            success: (res) => resolve(res.data),
            fail: (err) => reject(err)
          })
        } else {
          // 浏览器环境使用 localStorage
          try {
            const data = localStorage.getItem(key)
            resolve(data ? JSON.parse(data) : null)
          } catch (e) {
            reject(e)
          }
        }
      })
    }

    // 设置小程序存储数据
    setStorage(key, data) {
      return new Promise((resolve, reject) => {
        if (this.isMiniProgram) {
          wx.miniProgram.setStorage({
            key,
            data,
            success: resolve,
            fail: reject
          })
        } else {
          // 浏览器环境使用 localStorage
          try {
            localStorage.setItem(key, JSON.stringify(data))
            resolve()
          } catch (e) {
            reject(e)
          }
        }
      })
    }

    // 移除小程序存储数据
    removeStorage(key) {
      return new Promise((resolve, reject) => {
        if (this.isMiniProgram) {
          wx.miniProgram.removeStorage({
            key,
            success: resolve,
            fail: reject
          })
        } else {
          localStorage.removeItem(key)
          resolve()
        }
      })
    }

    // 打补丁替换 localStorage (可选)
    patchLocalStorage() {
      if (!this.isMiniProgram || typeof window === 'undefined') return

      const self = this
      
      // 保存原始的 localStorage 方法
      const originalSetItem = localStorage.setItem
      const originalGetItem = localStorage.getItem
      const originalRemoveItem = localStorage.removeItem

      // 重写 localStorage 方法
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem(key, value) {
            console.log('[WxBridge] 拦截 setItem:', key)
            self.setStorage(key, value).catch(() => {
              originalSetItem.call(localStorage, key, value)
            })
          },
          getItem(key) {
            // 由于异步问题，getItem 保持同步行为
            return originalGetItem.call(localStorage, key)
          },
          removeItem(key) {
            self.removeStorage(key).catch(() => {
              originalRemoveItem.call(localStorage, key)
            })
          }
        },
        writable: true,
        configurable: true
      })
    }

    // 获取运行环境信息
    getEnv() {
      return {
        isMiniProgram: this.isMiniProgram,
        isBrowser: this.isBrowser,
        platform: this.isMiniProgram ? 'miniprogram' : 'browser'
      }
    }
  }

  // 创建全局实例
  const wxBridge = new WxBridge()

  // 兼容 CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = wxBridge
  }

  // 兼容 AMD
  if (typeof define === 'function' && define.amd) {
    define(() => wxBridge)
  }

  // 挂载到全局
  global.wxBridge = wxBridge

})(typeof window !== 'undefined' ? window : this)
