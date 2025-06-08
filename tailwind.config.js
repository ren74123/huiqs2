/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  './src-weapp/**/*.{js,jsx,ts,tsx,wxml,wxss,scss,sass,html}',
  './components/**/*.{js,jsx,ts,tsx,wxml,wxss,scss,sass,html}',
  './pages/**/*.{js,jsx,ts,tsx,wxml,wxss,scss,sass,html}',
  ],
  corePlugins: {
    // 禁用小程序不支持的功能
    preflight: false,
    space: false,
    divideWidth: false,
    divideColor: false,
    divideOpacity: false,
    divideStyle: false,
    transform: false,
    filter: false,
    backdropFilter: false,
    boxShadow: false,
    transitionProperty: false,
    transitionDuration: false,
    transitionTimingFunction: false,
    transitionDelay: false,
    animation: false
  },
  theme: {
    extend: {
      colors: {
        primary: '#07C160',   // ✅ 微信绿
        secondary: '#1989fa'  // ✅ 常用蓝
      },
      spacing: {
        '15': '3.75rem'       // ✅ 自定义间距
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem'
      },
      fontSize: {
        xxs: '0.625rem'
      }
    }
  },
  plugins: [],
  safelist: [
    'bg-gray-100',
    'bg-black',
    'bg-opacity-40',
    'h-80',
    'h-[300px]',
    'h-[150px]',
    'h-[60px]',
    'rounded-xl',
    'overflow-hidden',
    'bg-cover',
    'bg-center',
    'w-full',
    'w-[60px]',
    'relative'
  ]
}