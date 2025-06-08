import { marked } from 'marked';
import privacyContent from './privacy';

Page({
  data: {
    markdownContent: ''
  },

  onLoad: function () {
    const html = marked.parse(privacyContent);
    this.setData({
      markdownContent: html
    });
  },

  onShareAppMessage: function () {
    return {
      title: '绘奇省隐私政策',
      path: '/pages/privacy/index'
    }
  }
});
