// src-weapp/api/home.ts

import { wechatRequest } from './wechat-adapter'
import type { Banner, Destination } from './types'

// ✅ 首页复合数据接口（如轮播图、热门目的地）
export interface HomeData {
  banners: Banner[]
  enterpriseBanners: Banner[]
  destinations: Destination[]
}

// ✅ 单独获取 banner 数据
export async function getHomeBanners(): Promise<Banner[]> {
  const res = await wechatRequest<Banner[]>('/api/home/banners')
  return res.status === 'success' ? res.data || [] : []
}

// ✅ 单独获取目的地数据
export async function getPopularDestinations(): Promise<Destination[]> {
  const res = await wechatRequest<Destination[]>('/api/home/destinations')
  return res.status === 'success' ? res.data || [] : []
}

// ✅ 类型定义（你自己后端统一返回格式）
interface Banner {
  id: string
  title: string
  description: string | null
  image_url: string
  link_url: string | null
  is_active: boolean
  banner_type: string
}

interface Destination {
  id: string
  name: string
  description: string | null
  image_url: string
  link_url: string | null
  is_active: boolean
}

// ✅ Mock 数据（用于网络异常 fallback）
const MOCK_HOME_DATA: HomeData = {
  banners: [
    {
      id: '1',
      title: '默认Banner',
      description: null,
      image_url: '/assets/images/banner1.jpg',
      link_url: null,
      is_active: true,
      banner_type: 'normal'
    }
  ],
  enterpriseBanners: [],
  destinations: [
    {
      id: '1',
      name: '默认目的地',
      description: null,
      image_url: '/assets/images/destination1.jpg',
      link_url: null,
      is_active: true
    }
  ]
}

// ✅ 综合获取首页数据（供首页统一调用）
export async function getHomeData(): Promise<{
  status: 'success' | 'error'
  data?: HomeData
  message?: string
}> {
  try {
    console.log('[API] 开始请求首页数据...')

    // ✅ 调用你微信后端的 API，不是 Supabase
    const [bannersRes, destinationsRes] = await Promise.all([
      wechatRequest<Banner[]>('/api/home/banners'),
      wechatRequest<Destination[]>('/api/home/destinations')
    ])

    if (bannersRes.status === 'error' || destinationsRes.status === 'error') {
      console.warn('使用Mock数据：因API部分失败')
      return {
        status: 'success',
        data: MOCK_HOME_DATA
      }
    }

    const banners = bannersRes.data || []
    const destinations = destinationsRes.data || []

    // ✅ 分类 banners
    const normalBanners = banners.filter(
      b => b.is_active && (b.banner_type === 'normal' || !b.banner_type)
    )

    const enterpriseBanners = banners.filter(
      b => b.is_active && b.banner_type === 'enterprise'
    )

    return {
      status: 'success',
      data: {
        banners: normalBanners,
        enterpriseBanners,
        destinations
      }
    }
  } catch (error) {
    console.error('获取首页数据异常:', error)
    return {
      status: 'success',
      data: MOCK_HOME_DATA
    }
  }
}
