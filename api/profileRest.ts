import { getSupabaseClient } from '@/lib/supabase';
const supabase = getSupabaseClient();
import Taro from '@tarojs/taro';

// 统一环境检测
const isWeapp = process.env.TARO_ENV && process.env.TARO_ENV !== 'h5';

/**
 * Get user profile by ID
 * @param userId User ID
 * @param token Auth token
 * @returns User profile
 */
export async function getUserProfile(userId: string, token: string) {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);
    
    if (error) throw error;
    
    return profiles[0] || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 * @param userId User ID
 * @param updates Profile updates
 * @param token Auth token
 * @returns Updated profile
 */
export async function updateUserProfile(userId: string, updates: any, token: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get user credits
 * @param userId User ID
 * @param token Auth token
 * @returns User credits
 */
export async function getUserCredits(userId: string, token: string) {
  try {
    console.log(`Fetching credits for user ${userId}`);
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('total')
      .eq('user_id', userId)
      .single();
    
    if (creditsError) throw creditsError;
    
    if (!credits) {
      console.warn(`No credits record found for user ${userId}, initializing...`);
      // Initialize credits record if not exists
      const { error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          total: 100, // Default starting credits
          updated_at: new Date().toISOString()
        });
      
      if (insertError) throw insertError;
      
      return { total: 100 };
    }
    
    console.log(`Found credits for user ${userId}:`, credits);
    return credits;
  } catch (error) {
    const errorInfo = {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    console.error('Error fetching user credits:', errorInfo);
    throw error;
  }
}

/**
 * Get credit transactions
 * @param userId User ID
 * @param token Auth token
 * @returns Credit transactions
 */
export async function getCreditTransactions(userId: string, token: string) {
  try {
    const { data: transactions, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return transactions;
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    throw error;
  }
}

/**
 * Consume credits
 * @param userId User ID
 * @param amount Amount to consume
 * @param remark Remark
 * @param token Auth token
 * @returns Success status
 */
export async function consumeCredits(userId: string, amount: number, remark: string, token: string) {
  try {
    const { data, error } = await supabase
      .rpc('consume_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_remark: remark
      });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error consuming credits:', error);
    throw error;
  }
}

/**
 * Add credits
 * @param userId User ID
 * @param amount Amount to add
 * @param remark Remark
 * @param token Auth token
 * @returns Success status
 */
export async function addCredits(userId: string, amount: number, remark: string, token: string) {
  try {
    const { data, error } = await supabase
      .rpc('add_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_remark: remark
      });
    
    if (error) throw error;
    return data;
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
