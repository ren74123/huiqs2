import Taro from '@tarojs/taro';
import { store as authStore } from '@/store/auth';

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';

export default {
  emailLogin: async (email: string, password: string) => {
    // 示例逻辑
    return { data: { token: 'fake-token' } }
  }
}

/**
 * 登录成功后统一保存登录态并跳转首页
 */
export function loginAndRedirect(token: string, user: any, redirectUrl = '/pages/index/index') {
  // 本地持久化
  Taro.setStorageSync(TOKEN_STORAGE_KEY, token);
  Taro.setStorageSync(USER_STORAGE_KEY, user);

  // 更新全局状态
  authStore.setUser(user);

  // 跳转页面
  Taro.reLaunch({ url: redirectUrl });
}
