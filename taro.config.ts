import { defineConfig } from '@tarojs/cli'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  projectName: 'huiqisheng',
  date: '2025-06-02',
  designWidth: 750,
  deviceRatio: {
    750: 1
  },

  sourceRoot: 'src-weapp',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'vite',

  plugins: [
    '@tarojs/plugin-platform-weapp'
  ],

  alias: {
    '@': './src-weapp',
    '@/libs': './src-weapp/libs' // ✅ 加上 libs 路径别名
  },

  sass: {},

  mini: {
    debugReact: true,
    postcss: {
      autoprefixer: {
        enable: true
      },
      pxtransform: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false
      }
    }
  },

  vite: {
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer()
        ]
      }
    }
  }
})
