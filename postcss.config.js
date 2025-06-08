module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    tailwindcss: {
      config: './tailwind.config.js'
    },
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': false
      },
      autoprefixer: {
        flexbox: 'no-2009',
        remove: false // 禁止删除过时前缀，确保小程序兼容性
      }
    }
  }
}