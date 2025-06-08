import Taro from '@tarojs/taro';
import {
  getUserCredits,
  fetchTransactions as fetchTransactionAPI,
  consumeCredits as consumeCreditsAPI,
  purchaseCredits as purchaseCreditsAPI
} from '@/api/credits';
import request from '@/api/request';

interface User {
  id: string;
  phone: string;
  email?: string;
  isNew?: boolean;
}

interface CreditTransaction {
  id: string;
  type: 'consume' | 'purchase';
  amount: number;
  remark: string;
  created_at: string;
}

interface CreditState {
  user: User | null;
  loading: boolean;
  credits: number;
  transactions: CreditTransaction[];
  retryCount: number;
  error: string | null;
}

type Listener = () => void;

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

let retryTimeout: any = null;

class CreditStore {
  private state: CreditState = {
    user: null,
    loading: true,
    credits: 0,
    transactions: [],
    retryCount: 0,
    error: null
  };

  private listeners = new Set<Listener>();

  getSnapshot = () => this.state;
  getState = () => this.state;

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  setState = (next: Partial<CreditState>) => {
    this.state = { ...this.state, ...next };
    wx.setStorageSync('creditState', this.state);
    this.listeners.forEach((fn) => fn());
  };

  get isLogin() {
    return !!this.state.user;
  }

  setUser = (user: User | null) => {
    this.setState({ user });
    if (user) {
      Taro.setStorageSync(USER_STORAGE_KEY, user);
    } else {
      Taro.removeStorageSync(USER_STORAGE_KEY);
    }
  };

  setLoading = (value: boolean) => this.setState({ loading: value });
  setRetryCount = (count: number) => this.setState({ retryCount: count });
  setError = (err: string | null) => this.setState({ error: err });

  resetCredits = () => {
    this.setState({
      credits: 0,
      transactions: [],
      retryCount: 0,
      error: null
    });
  };

  // ✅ 登录相关复用
  loginByPhone = async (phone: string, code: string) => {
    this.setLoading(true);
    try {
      const res = await request({
        url: '/api/auth/verify-code-login',
        method: 'POST',
        data: { phone, code }
      });
      if (res.data?.code === 0) {
        const { token, userInfo } = res.data.data;
        Taro.setStorageSync(TOKEN_STORAGE_KEY, token);
        this.setUser(userInfo);
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
        data: { code }
      });
      if (res.data?.code === 0) {
        const { token, userInfo } = res.data.data;
        Taro.setStorageSync(TOKEN_STORAGE_KEY, token);
        this.setUser(userInfo);
      } else {
        throw new Error(res.data?.message || '微信登录失败');
      }
    } finally {
      this.setLoading(false);
    }
  };

  loginByWeChatCode = async () => {
    const res = await Taro.login();
    if (res.code) {
      await this.loginByWeChat(res.code);
    } else {
      throw new Error('wx.login 失败');
    }
  };

  refreshSession = async () => {
    this.setLoading(true);
    try {
      const token = Taro.getStorageSync(TOKEN_STORAGE_KEY);
      if (!token) throw new Error('无有效 token');

      const res = await request({
        url: '/api/auth/refresh',
        method: 'POST',
        header: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.code === 0) {
        const { token: newToken, userInfo } = res.data.data;
        Taro.setStorageSync(TOKEN_STORAGE_KEY, newToken);
        this.setUser(userInfo);
      } else {
        throw new Error(res.data?.message || '刷新失败');
      }
    } catch {
      this.logout();
    } finally {
      this.setLoading(false);
    }
  };

  getCurrentUser = async () => {
    this.setLoading(true);
    try {
      const token = Taro.getStorageSync(TOKEN_STORAGE_KEY);
      if (!token) throw new Error('未登录');

      const res = await request({
        url: '/api/auth/me',
        method: 'GET',
        header: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.user) {
        this.setUser(res.data.user);
      } else {
        throw new Error('无法获取用户信息');
      }
    } catch {
      this.logout();
    } finally {
      this.setLoading(false);
    }
  };

  logout = () => {
    this.setUser(null);
    Taro.removeStorageSync(TOKEN_STORAGE_KEY);
  };

  initialize = async () => {
    try {
      const user = Taro.getStorageSync(USER_STORAGE_KEY);
      if (user) this.setUser(user);

      const saved = wx.getStorageSync('creditState');
      if (saved) this.setState(saved);

      await this.refreshSession();
    } catch {
      this.logout();
    } finally {
      this.setLoading(false);
    }
  };

  fetchCredits = async () => {
    this.setLoading(true);
    this.setError(null);
    try {
      const net = await Taro.getNetworkType();
      if (net.networkType === 'none') throw new Error('网络断开');
      const res = await getUserCredits();
      this.setState({ credits: res.total });
      this.setRetryCount(0);
    } catch {
      if (this.state.retryCount < MAX_RETRIES) {
        this.setRetryCount(this.state.retryCount + 1);
        clearTimeout(retryTimeout);
        retryTimeout = setTimeout(() => this.fetchCredits(), RETRY_DELAY * (this.state.retryCount + 1));
        this.setError(`正在重试获取积分数据 (${this.state.retryCount + 1}/${MAX_RETRIES})...`);
      } else {
        this.setError('无法加载积分数据，请检查网络连接后重试');
      }
    } finally {
      this.setLoading(false);
    }
  };

  fetchTransactions = async () => {
    this.setLoading(true);
    this.setError(null);
    try {
      const net = await Taro.getNetworkType();
      if (net.networkType === 'none') throw new Error('网络断开');
      const res = await fetchTransactionAPI();
      this.setState({ transactions: res });
      this.setRetryCount(0);
    } catch {
      if (this.state.retryCount < MAX_RETRIES) {
        this.setRetryCount(this.state.retryCount + 1);
        clearTimeout(retryTimeout);
        retryTimeout = setTimeout(() => this.fetchTransactions(), RETRY_DELAY * (this.state.retryCount + 1));
        this.setError(`正在重试获取交易记录 (${this.state.retryCount + 1}/${MAX_RETRIES})...`);
      } else {
        this.setError('无法加载交易记录，请检查网络连接后重试');
      }
    } finally {
      this.setLoading(false);
    }
  };

  consumeCredits = async ({ amount, remark }: { amount: number; remark: string }) => {
    const net = await Taro.getNetworkType();
    if (net.networkType === 'none') {
      this.setError('网络连接已断开，请检查网络设置后重试');
      return;
    }

    if (this.state.credits < amount) {
      this.setError('积分不足');
      return;
    }

    try {
      const res = await consumeCreditsAPI(amount, remark);
      if (!res.success) throw new Error('消费失败');
      this.setState({ credits: this.state.credits - amount });
      await this.fetchTransactions();
    } catch {
      this.setError('消费积分失败，请重试');
    }
  };

  purchaseCredits = async ({ amount, remark }: { amount: number; remark: string }) => {
    const net = await Taro.getNetworkType();
    if (net.networkType === 'none') {
      this.setError('网络连接已断开，请检查网络设置后重试');
      return;
    }

    try {
      const res = await purchaseCreditsAPI(amount, remark);
      if (!res.success) throw new Error('购买失败');
      this.setState({ credits: this.state.credits + amount });
      await this.fetchTransactions();
    } catch {
      this.setError('购买积分失败，请重试');
    }
  };
}

export const store = new CreditStore();
