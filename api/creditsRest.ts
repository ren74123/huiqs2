import request from '@/api/request';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/credits`;

/**
 * 获取用户积分
 * @returns 用户积分信息
 */
export const getUserCredits = async (): Promise<{ total: number }> => {
  try {
    const response = await request<{ total: number }>({
      url: API_BASE_URL,
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('获取用户积分失败:', error);
    throw error;
  }
};

/**
 * 获取用户积分交易记录
 * @returns 交易记录列表
 */
export const fetchTransactions = async (): Promise<any[]> => {
  try {
    const response = await request<any[]>({
      url: `${API_BASE_URL}/transactions`,
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('获取交易记录失败:', error);
    throw error;
  }
};

/**
 * 购买积分
 * @param amount 购买数量
 * @param remark 备注
 * @returns 购买结果
 */
export const purchaseCredits = async (amount: number, remark: string): Promise<{ success: boolean; data: any }> => {
  try {
    const response = await request<{ success: boolean; data: any }>({
      url: `${API_BASE_URL}/purchase`,
      method: 'POST',
      data: { amount, remark }
    });
    return response;
  } catch (error) {
    console.error('购买积分失败:', error);
    throw error;
  }
};

/**
 * 消费积分
 * @param amount 消费数量
 * @param remark 备注
 * @returns 消费结果
 */
export const consumeCredits = async (amount: number, remark: string): Promise<{ success: boolean; data: any }> => {
  try {
    const response = await request<{ success: boolean; data: any }>({
      url: `${API_BASE_URL}/consume`,
      method: 'POST',
      data: { amount, remark }
    });
    return response;
  } catch (error) {
    console.error('消费积分失败:', error);
    throw error;
  }
};
