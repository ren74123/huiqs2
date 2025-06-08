// ✅ 重构后的微信小程序版 auth.ts（不再依赖 Supabase SDK）
import { create } from 'zustand';
import Taro from '@tarojs/taro';
import request from '@/api/request';

interface User {
  id: string;
  phone: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => {
    if (user) {
      Taro.setStorageSync(USER_STORAGE_KEY, user);
    } else {
      Taro.removeStorageSync(USER_STORAGE_KEY);
    }
    set({ user });
  },

  login: async (phone, code) => {
    const res = await request({
      url: '/api/auth/verify-code-login',
      method: 'POST',
      data: { phone, code },
    });

    const { token, userInfo } = res.data.data;

    if (!token || !userInfo) {
      throw new Error('登录失败');
    }

    Taro.setStorageSync(TOKEN_STORAGE_KEY, token);
    Taro.setStorageSync(USER_STORAGE_KEY, userInfo);

    set({ user: userInfo });
  },

  logout: () => {
    Taro.removeStorageSync(TOKEN_STORAGE_KEY);
    Taro.removeStorageSync(USER_STORAGE_KEY);
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      const res = await request({
        url: '/api/auth/user',
        method: 'GET',
      });
      const user = res.data.user;
      Taro.setStorageSync(USER_STORAGE_KEY, user);
      set({ user });
    } catch (err) {
      console.warn('获取用户失败，自动退出登录');
      Taro.removeStorageSync(TOKEN_STORAGE_KEY);
      Taro.removeStorageSync(USER_STORAGE_KEY);
      set({ user: null });
    }
  },
}));

// 初始化用户状态
export const initializeAuth = () => {
  const storedUser = Taro.getStorageSync(USER_STORAGE_KEY);
  if (storedUser) {
    useAuthStore.setState({ user: storedUser, loading: false });
  } else {
    useAuthStore.setState({ user: null, loading: false });
  }
};

initializeAuth();
