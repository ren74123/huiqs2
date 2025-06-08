import Taro from '@tarojs/taro';
import request from '@/api/request';

export interface User {
  id: string;
  phone?: string;        // ✅ 改为可选
  email?: string;
  isNew?: boolean;
  nickname?: string;     // ✅ 加上后端实际返回的字段
  avatar?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  credits: number;
  isLogin: boolean;
  initialized: boolean; // ✅ 新增字段
}

type Listener = () => void;

class AuthStore {
  private state: AuthState = {
    user: null,
    loading: true,
    credits: 0,
    isLogin: false,
    initialized: false, // ✅ 初始化标志
  };

  private listeners = new Set<Listener>();

  getState = () => this.state;

  setState = (next: Partial<AuthState>) => {
    this.state = { ...this.state, ...next };
    wx.setStorageSync('authState', this.state);
    this.listeners.forEach((fn) => fn());
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  private updateUser(user: User | null) {
    this.setState({
      user,
      isLogin: !!user,
    });

    if (user) {
      Taro.setStorageSync('user', user);
    } else {
      Taro.removeStorageSync('user');
    }
  }

  setUser = (user: User | null) => {
    this.updateUser(user);
  };

  setLoading = (val: boolean) => {
    this.setState({ loading: val });
  };

  loginByPhone = async (phone: string, code: string) => {
    this.setLoading(true);
    try {
      const res = await request({
        url: '/api/auth/verify-code-login',
        method: 'POST',
        data: { phone, code },
      });
      if (res.data?.code === 0) {
        const { token, userInfo } = res.data.data;
        Taro.setStorageSync('token', token);
        this.updateUser(userInfo);
      } else {
        throw new Error(res.data?.message || '登录失败');
      }
    } finally {
      this.setLoading(false);
    }
  };

  loginByWeChat = async (code: string) => {
    this.setLoading(true);
    try {
      const res = await request({
        url: '/api/auth/wechat-login',
        method: 'POST',
        data: { code },
      });
      if (res.data?.code === 0) {
        const { token, userInfo } = res.data.data;
        Taro.setStorageSync('token', token);
        this.updateUser(userInfo);
      } else {
        throw new Error(res.data?.message || '微信登录失败');
      }
    } finally {
      this.setLoading(false);
    }
  };

  loginByWeChatCode = async () => {
    try {
      const res = await Taro.login();
      if (res.code) {
        await this.loginByWeChat(res.code);
      } else {
        throw new Error('wx.login 失败');
      }
    } catch (err) {
      console.error('[loginByWeChatCode] 获取微信 code 失败:', err);
      throw err;
    }
  };

  refreshSession = async () => {
    this.setLoading(true);
    try {
      const token = Taro.getStorageSync('token');
      if (!token) throw new Error('无有效 token');

      const res = await request({
        url: '/api/auth/refresh',
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.code === 0) {
        const { token: newToken, userInfo } = res.data.data;
        Taro.setStorageSync('token', newToken);
        this.updateUser(userInfo);
      } else {
        throw new Error(res.data?.message || '刷新失败');
      }
    } catch (err) {
      console.warn('[refreshSession] 会话刷新失败:', err);
      this.logout();
    } finally {
      this.setLoading(false);
    }
  };

  getCurrentUser = async () => {
    this.setLoading(true);
    try {
      const token = Taro.getStorageSync('token');
      if (!token) throw new Error('未登录');

      const res = await request({
        url: '/api/auth/me',
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.user) {
        this.updateUser(res.data.user);
      } else {
        throw new Error('无法获取用户信息');
      }
    } catch (err) {
      console.error('[getCurrentUser] 获取用户失败:', err);
      this.logout();
    } finally {
      this.setLoading(false);
    }
  };

  logout = () => {
    this.updateUser(null);
    Taro.removeStorageSync('token');
  };

  initialize = async () => {
    try {
      const savedUser = Taro.getStorageSync('user');
      if (savedUser) this.updateUser(savedUser);

      const savedState = wx.getStorageSync('authState');
      if (savedState) this.setState(savedState);

      await this.refreshSession(); // ⏳ 刷新真实状态
    } catch (err) {
      console.warn('[initialize] 初始化失败:', err);
      this.logout();
    } finally {
      this.setState({ loading: false, initialized: true }); // ✅ 关键：标记初始化完成
    }
  };
}

export const store = new AuthStore();
