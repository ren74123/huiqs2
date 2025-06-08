import Taro from '@tarojs/taro';

/**
 * 通用路由跳转函数
 * @param url 页面路径，如 '/pages/Home'
 * @param type 跳转方式：navigate / redirect / switchTab / reLaunch
 * @param params 可选参数，会自动拼接为 URL 查询参数
 */
export function goTo(
  url: string,
  type: 'navigate' | 'redirect' | 'switchTab' | 'reLaunch' = 'navigate',
  params?: Record<string, string | number>
) {
  let fullUrl = url;

  if (params && Object.keys(params).length > 0) {
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    fullUrl += (url.includes('?') ? '&' : '?') + query;
  }

  switch (type) {
    case 'navigate':
      Taro.navigateTo({ url: fullUrl });
      break;
    case 'redirect':
      Taro.redirectTo({ url: fullUrl });
      break;
    case 'switchTab':
      Taro.switchTab({ url: fullUrl });
      break;
    case 'reLaunch':
      Taro.reLaunch({ url: fullUrl });
      break;
    default:
      Taro.navigateTo({ url: fullUrl });
  }
}
