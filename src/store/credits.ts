import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface UserCredits {
  total: number;
  loading: boolean;
  error: string | null;
}

interface CreditTransaction {
  id: string;
  type: 'consume' | 'purchase';
  amount: number;
  remark: string;
  created_at: string;
}

interface CreditStore extends UserCredits {
  transactions: CreditTransaction[];
  fetchCredits: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  consumeCredits: (amount: number, remark: string) => Promise<boolean>;
  purchaseCredits: (amount: number, remark: string) => Promise<boolean>;
  hasEnoughCredits: (amount: number) => boolean;
  reset: () => void;
  retryCount: number;
  setRetryCount: (count: number) => void;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 10000;

// Check if we have network connectivity
const checkNetworkConnectivity = () => {
  return Promise.resolve(navigator.onLine);
};

export const useCreditStore = create<CreditStore>((set, get) => ({
  total: 0,
  loading: false,
  error: null,
  transactions: [],
  retryCount: 0,
  setRetryCount: (count: number) => set({ retryCount: count }),

  fetchCredits: async () => {
    set({ loading: true, error: null });

    // Check network connectivity first
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      set({ 
        error: '网络连接已断开，请检查网络设置后重试',
        loading: false 
      });
      return;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        set({ loading: false });
        return;
      }

      const userId = session.user.id;

      // Get user credits
      const { data, error } = await supabase
        .from('user_credits')
        .select('total')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No credits record found, initialize with 100
          const { data: newData, error: insertError } = await supabase
            .from('user_credits')
            .insert({ user_id: userId, total: 100 })
            .select('total')
            .single();

          if (insertError) throw insertError;
          set({ total: newData?.total || 100, loading: false });
        } else {
          throw error;
        }
      } else {
        set({ total: data?.total || 0, loading: false });
      }
      
      set({ retryCount: 0 }); // Reset retry count on successful fetch

    } catch (error) {
      console.error('Error fetching credits:', error);
      
      // Implement retry logic with exponential backoff
      if (get().retryCount < MAX_RETRIES) {
        const nextRetryCount = get().retryCount + 1;
        const backoffTime = Math.min(1000 * Math.pow(2, nextRetryCount), 10000);
        
        set({ 
          retryCount: nextRetryCount,
          error: `正在重试获取积分数据 (${nextRetryCount}/${MAX_RETRIES})...`
        });
        
        setTimeout(() => {
          get().fetchCredits();
        }, backoffTime);
      } else {
        set({ 
          error: '无法加载积分数据，请检查网络连接后重试',
          loading: false 
        });
      }
    }
  },

  fetchTransactions: async () => {
    set({ loading: true, error: null });

    // Check network connectivity first
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      set({ 
        error: '网络连接已断开，请检查网络设置后重试',
        loading: false 
      });
      return;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        set({ loading: false });
        return;
      }

      const userId = session.user.id;

      // Get credit transactions
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      set({ transactions: data || [], loading: false });
      set({ retryCount: 0 }); // Reset retry count on successful fetch

    } catch (error) {
      console.error('Error fetching transactions:', error);
      
      // Implement retry logic with exponential backoff
      if (get().retryCount < MAX_RETRIES) {
        const nextRetryCount = get().retryCount + 1;
        const backoffTime = Math.min(1000 * Math.pow(2, nextRetryCount), 10000);
        
        set({ 
          retryCount: nextRetryCount,
          error: `正在重试获取交易记录 (${nextRetryCount}/${MAX_RETRIES})...`
        });
        
        setTimeout(() => {
          get().fetchTransactions();
        }, backoffTime);
      } else {
        set({ 
          error: '无法加载交易记录，请检查网络连接后重试',
          loading: false 
        });
      }
    }
  },

  consumeCredits: async (amount: number, remark: string) => {
    set({ loading: true, error: null });

    // Check network connectivity first
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      set({ 
        error: '网络连接已断开，请检查网络设置后重试',
        loading: false 
      });
      return false;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        set({ loading: false });
        return false;
      }

      const userId = session.user.id;

      // Check if user has enough credits
      if (!get().hasEnoughCredits(amount)) {
        set({ error: '积分不足', loading: false });
        return false;
      }

      // Consume credits
      const { error } = await supabase.rpc('consume_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_remark: remark
      });
      
      if (error) throw error;
      
      // Update local state
      set(state => ({ total: state.total - amount }));
      await get().fetchTransactions();
      
      set({ loading: false });
      return true;
    } catch (error) {
      console.error('Error consuming credits:', error);
      set({ error: '消费积分失败，请重试', loading: false });
      return false;
    }
  },

  purchaseCredits: async (amount: number, remark: string) => {
    set({ loading: true, error: null });

    // Check network connectivity first
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      set({ 
        error: '网络连接已断开，请检查网络设置后重试',
        loading: false 
      });
      return false;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        set({ loading: false });
        return false;
      }

      const userId = session.user.id;

      // Add credits
      const { error } = await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_remark: remark
      });
      
      if (error) throw error;
      
      // Update local state
      set(state => ({ total: state.total + amount }));
      await get().fetchTransactions();
      
      set({ loading: false });
      return true;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      set({ error: '购买积分失败，请重试', loading: false });
      return false;
    }
  },

  hasEnoughCredits: (amount: number) => {
    return get().total >= amount;
  },

  reset: () => {
    set({
      total: 0,
      loading: false,
      error: null,
      transactions: [],
      retryCount: 0
    });
  }
}));