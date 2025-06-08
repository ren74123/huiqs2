module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true
    }],
    '@babel/preset-react' // ✅ 显式支持 JSX
  ],
  plugins: [
    '@babel/plugin-transform-react-jsx' // ✅ 可选，增强 JSX 转换
  ]
}
