import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  // 开发环境不使用 base，生产环境使用
  base: process.env.NODE_ENV === 'production' ? '/Flying_V1/' : '/',
  build: {
    // 确保资源文件名包含哈希，便于缓存控制
    rollupOptions: {
      output: {
        // 添加版本戳到入口文件名，避免缓存问题
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
});
