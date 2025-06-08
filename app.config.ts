import { Config } from '@tarojs/taro';

const config: Config = {
  pages: [
    'pages/index/index', 
    'pages/Home',              // 首页
    'pages/TravelPlan',              // 制定计划页
    //'pages/Packages',          // 套餐页
    'pages/UserCenter',       // 个人中心页     
    'pages/agreement/index',
    'pages/privacy/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '绘奇省',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#6B7280',
    selectedColor: '#F52E6B',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/Home',
        text: '首页',
        iconPath: 'static/icons/tab-home.png',
        selectedIconPath: 'static/icons/tab-home-active.png'
      },
      {
        pagePath: 'pages/TravelPlan',
       text: '制定计划',
        iconPath: 'static/icons/tab-plan.png',
        selectedIconPath: 'static/icons/tab-plan-active.png'
      },
    //  {
       // pagePath: 'pages/Packages',
      //  text: '旅行套餐',
     //   iconPath: 'static/icons/tab-package.png',
     //   selectedIconPath: 'static/icons/tab-package-active.png'
    //  },
      {
        pagePath: 'pages/UserCenter',
        text: '我的',
        iconPath: 'static/icons/tab-user.png',
        selectedIconPath: 'static/icons/tab-user-active.png'
      }
    ]
  }
};

export default config;
