// src-weapp/api/index.ts

// ✅ 默认导出 Supabase 通用 REST 封装
export { default as db } from './supabaseRest'

// ✅ 命名导出各模块 API
export * as auth from './authRest'
export * as profile from './profileRest'
export * as packages from './packagesRest'
export * as orders from './ordersRest'
export * as plans from './plansRest'
export * as messages from './messagesRest'
export * as enterprise from './enterpriseRest'
export * as storage from './storageRest'
export * as home from './home' // ✅ 包括 getHomeBanners、getHomeData 等

// ✅ 导出类型定义（按需添加）
export type {
  // 示例：UserProfile, TravelPackage, OrderInfo 等
  // UserProfile,
  // TravelPackage,
  // OrderInfo,
}
