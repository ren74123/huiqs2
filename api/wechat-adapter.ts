// src-weapp/api/wechat-adapter.ts
import Taro from '@tarojs/taro'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '' // 你在 .env 里配置的后端地址，如 http://localhost:3000

export async function wechatRequest<T = any>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  data?: any
): Promise<{ status: 'success' | 'error'; data?: T; message?: string }> {
  try {
    const res = await Taro.request<T>({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return {
        status: 'success',
        data: res.data
      }
    } else {
      return {
        status: 'error',
        message: `接口错误: ${res.statusCode}`
      }
    }
  } catch (err) {
    console.error('请求失败:', err)
    return {
      status: 'error',
      message: '网络异常，请稍后重试'
    }
  }
}
