import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // ... 你原来的配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@styles': path.resolve(__dirname, './styles'),
      'zustand': path.resolve(__dirname, '..', 'node_modules/zustand'),
    },
  },
  define: {
    'globalThis.React': 'React', // ✅ 强制注入 React
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-redux', 'zustand'], // ✅ 明确预构建
  },
  build: {
    rollupOptions: {
     external: ['zustand', 'react-router-dom'], // ✅ 外部保留
    },
  },
  css: {
    postcss: {
      plugins: [
        require('tailwindcss')({
          config: path.resolve(__dirname, 'tailwind.config.js'),
        }),
        require('autoprefixer'),
      ],
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
});
