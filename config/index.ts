import { defineConfig } from '@tarojs/cli'
import markdown from 'vite-plugin-markdown'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  projectName: 'taro-mini-clean',
  date: '2025-05-09',
  designWidth: 750,
  deviceRatio: {
    750: 1
  },
  sourceRoot: '.',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'vite',
  plugins: [],
  vite: {
    plugins: [markdown()],
    css: {
      modules: {
        // ✅ 启用 CSS Modules：样式支持 className={styles.xxx}
        generateScopedName: '[local]__[hash:base64:5]'
      },
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer()
        ]
      }
    }
  }
})
