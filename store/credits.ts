import { create } from 'zustand';
import {
  getUserCredits,
  fetchTransactions as fetchTransactionAPI,
  consumeCredits as consumeCreditsAPI,
  purchaseCredits as purchaseCreditsAPI
} from '@/api/creditsRest';

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

const checkNetworkConnectivity = () => Promise.resolve(navigator.onLine);

export const useCreditStore = create<CreditStore>((set, get) => ({
  total: 0,
  loading: false,
  error: null,
  transactions: [],
  retryCount: 0,
  setRetryCount: (count: number) => set({ retryCount: count }),

  fetchCredits: async () => {
    set({ loading: true, error: null });
    if (!(await checkNetworkConnectivity())) {
      return set({ error: '网络连接已断开，请检查网络设置后重试', loading: false });
    }

    try {
      const res = await getUserCredits();
      set({ total: res.total, loading: false, retryCount: 0 });
    } catch (err) {
      console.error('Error fetching credits:', err);
      if (get().retryCount < MAX_RETRIES) {
        const nextRetryCount = get().retryCount + 1;
        set({
          retryCount: nextRetryCount,
          error: `正在重试获取积分数据 (${nextRetryCount}/${MAX_RETRIES})...`
        });
        setTimeout(() => get().fetchCredits(), 1000 * Math.pow(2, nextRetryCount));
      } else {
        set({ error: '无法加载积分数据，请检查网络连接后重试', loading: false });
      }
    }
  },

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    if (!(await checkNetworkConnectivity())) {
      return set({ error: '网络连接已断开，请检查网络设置后重试', loading: false });
    }

    try {
      const res = await fetchTransactionAPI();
      set({ transactions: res || [], loading: false, retryCount: 0 });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      if (get().retryCount < MAX_RETRIES) {
        const nextRetryCount = get().retryCount + 1;
        set({
          retryCount: nextRetryCount,
          error: `正在重试获取交易记录 (${nextRetryCount}/${MAX_RETRIES})...`
        });
        setTimeout(() => get().fetchTransactions(), 1000 * Math.pow(2, nextRetryCount));
      } else {
        set({ error: '无法加载交易记录，请检查网络连接后重试', loading: false });
      }
    }
  },

  consumeCredits: async (amount: number, remark: string) => {
    set({ loading: true, error: null });
    if (!(await checkNetworkConnectivity())) {
      set({ error: '网络连接已断开，请检查网络设置后重试', loading: false });
      return false;
    }

    if (!get().hasEnoughCredits(amount)) {
      set({ error: '积分不足', loading: false });
      return false;
    }

    try {
      const res = await consumeCreditsAPI(amount, remark);
      if (!res.success) throw new Error('消费失败');
      set(state => ({ total: state.total - amount }));
      await get().fetchTransactions();
      set({ loading: false });
      return true;
    } catch (err) {
      console.error('Error consuming credits:', err);
      set({ error: '消费积分失败，请重试', loading: false });
      return false;
    }
  },

  purchaseCredits: async (amount: number, remark: string) => {
    set({ loading: true, error: null });
    if (!(await checkNetworkConnectivity())) {
      set({ error: '网络连接已断开，请检查网络设置后重试', loading: false });
      return false;
    }

    try {
      const res = await purchaseCreditsAPI(amount, remark);
      if (!res.success) throw new Error('购买失败');
      set(state => ({ total: state.total + amount }));
      await get().fetchTransactions();
      set({ loading: false });
      return true;
    } catch (err) {
      console.error('Error purchasing credits:', err);
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
