module.exports = {
  env: {
    NODE_ENV: '"production"'
  },
  defineConstants: {
  },
  mini: {},
  h5: {
    /**
     * WebpackChain 插件配置
     * @docs https://github.com/neutrinojs/webpack-chain
     */
    webpackChain: (chain) => {
      /**
       * 如果 h5 端编译后体积过大，可以使用 webpack-bundle-analyzer 查看体积源
       * @docs https://github.com/webpack-contrib/webpack-bundle-analyzer
       */
      chain.plugin('analyzer')
        .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, [
          {
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'report.html'
          }
        ])
    }
  }
}