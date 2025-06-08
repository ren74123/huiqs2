// src-weapp/store/home.ts

import { createAppStore } from '@/libs/wxbuf/createAppStore';
import { getHomeBanners, getPopularDestinations } from '@/api/home';
import type { Banner, Destination } from '@/api/home';

interface HomeState {
  banners: Banner[];
  enterpriseBanners: Banner[];
  destinations: Destination[];
  currentBanner: Banner | null;
  currentEnterpriseBanner: Banner | null;
  loading: boolean;
}

interface HomeActions {
  fetchHomeData: () => Promise<void>;
  setCurrentBanner: (index: number) => void;
  setCurrentEnterpriseBanner: (index: number) => void;
  setLoading: (val: boolean) => void;
}

export const store = createAppStore<HomeState, HomeActions>({
  state: {
    banners: [],
    enterpriseBanners: [],
    destinations: [],
    currentBanner: null,
    currentEnterpriseBanner: null,
    loading: false,
  },

  actions: {
    async fetchHomeData(this: HomeState & HomeActions) {
      this.setLoading(true);
      try {
        const banners: Banner[] = await getHomeBanners();
        const destinations: Destination[] = await getPopularDestinations();

        this.banners = banners.filter(b => b.banner_type !== 'enterprise');
        this.enterpriseBanners = banners.filter(b => b.banner_type === 'enterprise');
        this.destinations = destinations;
        this.currentBanner = this.banners[0] || null;
        this.currentEnterpriseBanner = this.enterpriseBanners[0] || null;
      } catch (err) {
        console.warn('[fetchHomeData] 加载首页数据失败:', err);
      } finally {
        this.setLoading(false);
      }
    },

    setCurrentBanner(this: HomeState, index: number) {
      this.currentBanner = this.banners[index];
    },

    setCurrentEnterpriseBanner(this: HomeState, index: number) {
      this.currentEnterpriseBanner = this.enterpriseBanners[index];
    },

    setLoading(this: HomeState, val: boolean) {
      this.loading = val;
    },
  },
});
