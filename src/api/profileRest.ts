import { request } from '@/utils/request';

const BASE_URL = '/api/user';

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string, token: string) {
  try {
    const res = await request({
      url: `${BASE_URL}/profile/${userId}`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${token}`
      }
    });

    return res || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: any, token: string) {
  try {
    return await request({
      url: `${BASE_URL}/profile/${userId}`,
      method: 'PATCH',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      data: updates
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get user credits
 */
export async function getUserCredits(userId: string, token: string) {
  try {
    const res = await request({
      url: `${BASE_URL}/credits/${userId}`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${token}`
      }
    });

    return res || { total: 0 };
  } catch (error) {
    console.error('Error fetching user credits:', error);
    throw error;
  }
}

/**
 * Get credit transactions
 */
export async function getCreditTransactions(userId: string, token: string) {
  try {
    return await request({
      url: `${BASE_URL}/credits/${userId}/transactions`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    throw error;
  }
}

/**
 * Consume credits
 */
export async function consumeCredits(userId: string, amount: number, remark: string, token: string) {
  try {
    return await request({
      url: `${BASE_URL}/credits/${userId}/consume`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      data: { amount, remark }
    });
  } catch (error) {
    console.error('Error consuming credits:', error);
    throw error;
  }
}

/**
 * Add credits
 */
export async function addCredits(userId: string, amount: number, remark: string, token: string) {
  try {
    return await request({
      url: `${BASE_URL}/credits/${userId}/add`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      data: { amount, remark }
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    throw error;
  }
}

export default {
  getUserProfile,
  updateUserProfile,
  getUserCredits,
  getCreditTransactions,
  consumeCredits,
  addCredits
};
