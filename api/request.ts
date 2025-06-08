import Taro from '@tarojs/taro';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function getRequest<T = any>(
  url: string,
  params?: Record<string, any>
): Promise<{ data: T; error?: Error }> {
  return request<T>({
    url,
    method: 'GET',
    data: params
  });
}

export default function request<T = any>(options: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}): Promise<{ data: T; error?: Error }> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  let apiUrl = `${baseUrl}/api${options.url.startsWith('/') ? '' : '/'}${options.url}`;
  let method = options.method;

  // 特殊接口：微信登录
  if (options.url === '/auth/wechat') {
    apiUrl = `${baseUrl}/api/auth/wechat`;
    method = 'POST';
  }

  // 读取本地缓存中的 token
  const token = Taro.getStorageSync('token');

  console.log('🌐 发起 API 请求:', {
    url: apiUrl,
    method,
    data: options.data
  });

  if (token) {
    console.log('🔐 当前 token 存在，长度:', token.length);
  } else {
    console.warn('⚠️ 当前无 token，可能是未登录状态');
  }

  return Taro.request<T>({
    url: apiUrl,
    method,
    data: options.data,
    header: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options.header
    }
  })
    .then(res => {
      // 🔐 登录失效，重定向到登录页
      if (res.statusCode === 401) {
        console.warn('⛔ 401 未授权，跳转登录页');
        Taro.removeStorageSync('token');
        Taro.removeStorageSync('user');

        Taro.redirectTo({
          url: '/pages/index/index' // 登录页路径，请根据你实际页面结构修改
        });

        return { data: null as any, error: new Error('未授权') };
      }

      if (res.statusCode >= 400) {
        return {
          data: null as any,
          error: new Error(res.data?.message || '请求失败')
        };
      }

      return { data: res.data };
    })
    .catch(err => {
      console.error('❌ API 请求错误:', err);
      return { data: null as any, error: err };
    });
}
