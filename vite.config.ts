import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 生成构建时间戳，用于强制刷新缓存
const buildTimestamp = new Date().getTime();

// 自定义插件：给 HTML 中的资源引用添加时间戳查询参数
const cacheBustPlugin = (): Plugin => ({
  name: 'cache-bust',
  enforce: 'post',
  transformIndexHtml(html, ctx) {
    // 只在生产环境添加时间戳
    if (ctx.bundle) {
      // 给 script 和 link 标签的 src/href 添加查询参数
      const result = html
        .replace(/src="([^"]+\.js)"/g, `src="$1?v=${buildTimestamp}"`)
        .replace(/href="([^"]+\.css)"/g, `href="$1?v=${buildTimestamp}"`);
      console.log('[cache-bust] HTML transformed with timestamp:', buildTimestamp);
      return result;
    }
    return html;
  }
});

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    // 允许从小程序 WebView 访问
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  plugins: [react(), cacheBustPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  // 使用根路径，避免子目录部署问题
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 确保资源被正确复制
    copyPublicDir: true,
  },
});
