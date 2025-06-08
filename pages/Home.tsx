import React, { useEffect, useState } from 'react';
import { View, Swiper, SwiperItem, Image, Text, Navigator, Button } from '@tarojs/components';
import { getHomeBanners, getPopularDestinations } from '@/api/home';
import './Home.scss';
import { loginAndRedirect } from '@/utils/auth';


interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  banner_type: string;
}

interface Destination {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
}

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [enterpriseBanners, setEnterpriseBanners] = useState<Banner[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [currentEnterpriseBanner, setCurrentEnterpriseBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetchBanners();
    fetchDestinations();
  }, []);

  const fetchBanners = async () => {
    const response = await getHomeBanners();
    const list = response?.data || [];
    setBanners(list.filter(b => b.banner_type !== 'enterprise'));
    setEnterpriseBanners(list.filter(b => b.banner_type === 'enterprise'));
  };

   const fetchDestinations = async () => {
    const response = await getPopularDestinations();
    setDestinations(response?.data || []);
  };

  return (
    <View className="home-page">
      <View className="banner-swiper-wrapper">
        <Swiper
          className="banner-swiper"
          autoplay
          interval={5000}
          circular
          onChange={(e) => setCurrentBanner(banners[e.detail.current])}
        >
          {banners.map(banner => (
            <SwiperItem key={banner.id}>
              <Image className="banner-img" src={banner.image_url} mode="aspectFill" />
            </SwiperItem>
          ))}
        </Swiper>

        <View className="banner-text-overlay">
          <Text className="banner-title">{currentBanner?.title || banners[0]?.title}</Text>
          <Text className="banner-desc">{currentBanner?.description || banners[0]?.description}</Text>
          <View className="banner-btn-group">
            <Navigator url="/pages/TravelPlan/index" className="btn-primary">制定行程</Navigator>
            <Navigator url="/pages/packages/index" className="btn-secondary">浏览套餐</Navigator>
          </View>
        </View>
      </View>

      {enterpriseBanners.length > 0 && (
        <View className="enterprise-swiper-box">
          <Swiper
            className="banner-swiper"
            autoplay
            interval={5000}
            circular
            onChange={(e) => setCurrentEnterpriseBanner(enterpriseBanners[e.detail.current])}
          >
            {enterpriseBanners.map(banner => (
              <SwiperItem key={banner.id}>
                <View className="enterprise-banner">
                  <Image className="banner-img" src={banner.image_url} mode="aspectFill" />
                  <View className="enterprise-text-overlay">
                    <Text className="enterprise-title">{banner.title}</Text>
                    <Text className="enterprise-desc">{banner.description}</Text>
                    <Navigator url="/pages/enterprise/index" className="btn-enterprise">立即定制</Navigator>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>
      )}

      <View className="features-section">
        <View className="section-title">为什么选择我们</View>
        <View className="features-grid">
          <FeatureCard icon="ai" title="AI智能规划" desc="根据个人喜好生成定制行程" />
          <FeatureCard icon="package" title="精选套餐" desc="专业旅行社精心设计路线" />
          <FeatureCard icon="global" title="全球目的地" desc="覆盖世界各地热门景点" />
          <FeatureCard icon="service" title="专业服务" desc="认证旅行顾问一对一服务" />
        </View>
      </View>

      <View className="destinations-section">
        <View className="section-title">热门目的地</View>
        <View className="space-y-4">
          {destinations.map(dest => (
            <View key={dest.id} className="destination-card">
              <Image src={dest.image_url} mode="aspectFill" className="destination-img" />
              <View className="destination-info">
                <View className="destination-name">{dest.name}</View>
                <View className="destination-desc">{dest.description}</View>
                <Button
                  className="btn-start-plan"
                  onClick={() => Taro.navigateTo({ url: `/pages/TravelPlan/index?from=${dest.name}` })}
                >
                  开始规划 →
                </Button>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View className="feature-item">
      <View className={`feature-icon feature-${icon}`} />
      <Text className="feature-title">{title}</Text>
      <Text className="feature-desc">{desc}</Text>
    </View>
  );
}
