import wxbuf from '../lib/wxbuf/index.js';

const store = wxbuf.createStore({
  state: {
    user: null,
    isLogin: false,
  },

  actions: {
    setUser(data: any) {
      this.setData({ user: data, isLogin: !!data });
    },
  },

  setup() {
    const user = wx.getStorageSync('user');
    this.setData({ user, isLogin: !!user });
  },
});

export default store; // 确保正确导出
