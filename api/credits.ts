// src-weapp/api/credits.ts

import request from './request';

// 获取用户积分
export async function getUserCredits() {
  const token = Taro.getStorageSync('token');
  const res = await request<{ total: number }>({
    url: '/api/credits',
    method: 'GET',
    token,
  });
  return res.data;
}

// 获取积分交易记录
export async function fetchTransactions() {
  const token = Taro.getStorageSync('token');
  const res = await request<any[]>({
    url: '/api/credits/transactions',
    method: 'GET',
    token,
  });
  return res.data;
}

// 消耗积分
export async function consumeCredits(amount: number, remark: string) {
  const token = Taro.getStorageSync('token');
  const res = await request<{ success: boolean }>({
    url: '/api/credits/consume',
    method: 'POST',
    data: { amount, remark },
    token,
  });
  return res.data;
}

// 购买积分
export async function purchaseCredits(amount: number, remark: string) {
  const token = Taro.getStorageSync('token');
  const res = await request<{ success: boolean }>({
    url: '/api/credits/purchase',
    method: 'POST',
    data: { amount, remark },
    token,
  });
  return res.data;
}
