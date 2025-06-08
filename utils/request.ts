import Taro from '@tarojs/taro';

// 从环境变量获取 API 基础 URL
const API_BASE_URL = process.env.VITE_SUPABASE_URL || 'http://192.168.3.49:3001';

export const webRequest = async (config: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
}) => {
  try {
    // 构建完整的 URL
    let fullUrl = config.url;
    if (!fullUrl.startsWith('http')) {
      // 确保URL以/开头
      if (!fullUrl.startsWith('/')) {
        fullUrl = `/${fullUrl}`;
      }
      // 确保不重复添加/api
      if (!fullUrl.startsWith('/api')) {
        fullUrl = `/api${fullUrl}`;
      }
      fullUrl = `${API_BASE_URL}${fullUrl}`;
    }

    // 获取认证 token
    const token = Taro.getStorageSync('token');
    
    // 合并请求头
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(config.headers || {})
    };

    console.log('📡 发起请求:', {
      url: fullUrl,
      method: config.method,
      headers,
      timestamp: new Date().toISOString()
    });

    const response = await Taro.request({
      url: fullUrl,
      method: config.method,
      data: config.data,
      header: headers
    });

    console.log('📡 收到响应:', {
      url: fullUrl,
      statusCode: response.statusCode,
      data: response.data,
      headers: response.header,
      timestamp: new Date().toISOString()
    });

    // 统一响应格式处理
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {
        status: 'success',
        ...response.data
      };
    } else {
      throw new Error(
        response.data?.message || 
        `请求失败: HTTP ${response.statusCode}`
      );
    }
  } catch (error) {
    console.error('⚠️ 请求异常:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw new Error(`网络请求失败: ${error.message}`);
  }
};

export default webRequest;