import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Package, Map, Users, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export function Home() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [enterpriseBanners, setEnterpriseBanners] = useState<Banner[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [currentEnterpriseBanner, setCurrentEnterpriseBanner] = useState(0);

  useEffect(() => {
    fetchBanners();
    fetchDestinations();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  useEffect(() => {
    if (enterpriseBanners.length > 1) {
      const interval = setInterval(() => {
        setCurrentEnterpriseBanner((prev) => (prev + 1) % enterpriseBanners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [enterpriseBanners]);

  async function fetchBanners() {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching banners:', error);
        return;
      }
      
      // Split banners by type
      const travelBanners = data?.filter(banner => banner.banner_type !== 'enterprise') || [];
      const enterpriseBanners = data?.filter(banner => banner.banner_type === 'enterprise') || [];
      
      setBanners(travelBanners);
      setEnterpriseBanners(enterpriseBanners);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  }

  async function fetchDestinations() {
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('popular_destinations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setDestinations(data || []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setError('Unable to load destinations. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const renderBannerContent = (banner: Banner) => {
    if (banner.link_url) {
      return (
        <Link to={banner.link_url.startsWith('http') ? banner.link_url : banner.link_url}>
          <div className="relative h-[400px] bg-cover bg-center rounded-xl overflow-hidden mb-8" style={{ backgroundImage: `url("${banner.image_url}")` }}>
            <div className="absolute inset-0 bg-black bg-opacity-50" />
            <div className="relative h-full px-4 flex flex-col justify-center">
              <h1 className="text-3xl font-bold text-white mb-4">{banner.title}</h1>
              {banner.description && (
                <p className="text-lg text-white mb-6">{banner.description}</p>
              )}
            </div>
          </div>
        </Link>
      );
    }
    
    return (
      <div className="relative h-[400px] bg-cover bg-center rounded-xl overflow-hidden mb-8" style={{ backgroundImage: `url("${banner.image_url}")` }}>
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="relative h-full px-4 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white mb-4">{banner.title}</h1>
          {banner.description && (
            <p className="text-lg text-white mb-6">{banner.description}</p>
          )}
          <div className="flex gap-4">
            <Link
              to="/plan"
              className="bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              制定行程
            </Link>
            <Link
              to="/packages"
              className="bg-white hover:bg-gray-100 text-[#1C2340] font-medium py-2 px-4 rounded-md transition duration-200"
            >
              浏览套餐
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderEnterpriseBanner = (banner: Banner) => {
    if (!banner) return null;
    
    if (banner.link_url) {
      return (
        <Link to={banner.link_url.startsWith('http') ? banner.link_url : banner.link_url}>
          <div className="relative h-[200px] bg-cover bg-center rounded-xl overflow-hidden mb-8" style={{ backgroundImage: `url("${banner.image_url}")` }}>
            <div className="absolute inset-0 bg-black bg-opacity-60" />
            <div className="relative h-full px-4 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-white mb-2">{banner.title}</h2>
              {banner.description && (
                <p className="text-white mb-4">{banner.description}</p>
              )}
              <div className="inline-block">
                <span className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors inline-flex items-center">
                  <Briefcase className="h-4 w-4 mr-2" />
                  立即定制
                </span>
              </div>
            </div>
          </div>
        </Link>
      );
    }
    
    return (
      <Link to="/enterprise-custom">
        <div className="relative h-[200px] bg-cover bg-center rounded-xl overflow-hidden mb-8" style={{ backgroundImage: `url("${banner.image_url}")` }}>
          <div className="absolute inset-0 bg-black bg-opacity-60" />
          <div className="relative h-full px-4 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-white mb-2">{banner.title}</h2>
            {banner.description && (
              <p className="text-white mb-4">{banner.description}</p>
            )}
            <div className="inline-block">
              <span className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors inline-flex items-center">
                <Briefcase className="h-4 w-4 mr-2" />
                立即定制
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div>
      {/* Hero Section */}
      {banners.length > 0 ? (
        <div className="relative">
          {renderBannerContent(banners[currentBanner])}
          
          {/* Banner indicators */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBanner(index)}
                  className={`h-2 w-2 rounded-full ${
                    index === currentBanner ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div 
          className="relative h-[400px] bg-cover bg-center rounded-xl overflow-hidden mb-8"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2021&q=80")'
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          <div className="relative h-full px-4 flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              开启你的下一段旅程
            </h1>
            <p className="text-lg text-white mb-6">
              发现精彩目的地，使用AI规划个性化行程，预订难忘的旅行体验
            </p>
            <div className="flex gap-4">
              <Link
                to="/plan"
                className="bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                制定行程
              </Link>
              <Link
                to="/packages"
                className="bg-white hover:bg-gray-100 text-[#1C2340] font-medium py-2 px-4 rounded-md transition duration-200"
              >
                浏览套餐
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Team Building Banner */}
      {enterpriseBanners.length > 0 ? (
        <div className="relative mb-8">
          {renderEnterpriseBanner(enterpriseBanners[currentEnterpriseBanner])}
          
          {/* Banner indicators */}
          {enterpriseBanners.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {enterpriseBanners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentEnterpriseBanner(index)}
                  className={`h-2 w-2 rounded-full ${
                    index === currentEnterpriseBanner ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8">
          <Link to="/enterprise-custom">
            <div className="relative h-[200px] bg-cover bg-center rounded-xl overflow-hidden" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")' }}>
              <div className="absolute inset-0 bg-black bg-opacity-60" />
              <div className="relative h-full px-4 flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-white mb-2">企业团建定制游</h2>
                <p className="text-white mb-4">一站式团建解决方案，专业定制，省心省力</p>
                <div className="inline-block">
                  <span className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors inline-flex items-center">
                    <Briefcase className="h-4 w-4 mr-2" />
                    立即定制
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Features Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#1C2340] mb-6">
          为什么选择我们
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="bg-[#F52E6B] bg-opacity-10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Plane className="h-6 w-6 text-[#F52E6B]" />
            </div>
            <h3 className="text-base font-semibold text-[#1C2340] mb-1">
              AI智能规划
            </h3>
            <p className="text-sm text-gray-600">
              根据个人喜好生成定制行程
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="bg-[#F52E6B] bg-opacity-10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-[#F52E6B]" />
            </div>
            <h3 className="text-base font-semibold text-[#1C2340] mb-1">
              精选套餐
            </h3>
            <p className="text-sm text-gray-600">
              专业旅行社精心设计路线
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="bg-[#F52E6B] bg-opacity-10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Map className="h-6 w-6 text-[#F52E6B]" />
            </div>
            <h3 className="text-base font-semibold text-[#1C2340] mb-1">
              全球目的地
            </h3>
            <p className="text-sm text-gray-600">
              覆盖世界各地热门景点
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="bg-[#F52E6B] bg-opacity-10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-[#F52E6B]" />
            </div>
            <h3 className="text-base font-semibold text-[#1C2340] mb-1">
              专业服务
            </h3>
            <p className="text-sm text-gray-600">
              认证旅行顾问一对一服务
            </p>
          </div>
        </div>
      </div>

      {/* Popular Destinations */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#1C2340] mb-6">
          热门目的地
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchDestinations();
                }}
                className="text-[#F52E6B] hover:text-[#FE6587] font-medium"
              >
                重试
              </button>
            </div>
          ) : destinations.length > 0 ? (
            destinations.map((destination) => (
              <div 
                key={destination.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="relative h-48">
                  <img
                    src={destination.image_url}
                    alt={destination.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-[#1C2340] mb-2">
                    {destination.name}
                  </h3>
                  {destination.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {destination.description}
                    </p>
                  )}
                  {destination.link_url ? (
                    <Link
                      to={destination.link_url.startsWith('http') ? destination.link_url : destination.link_url}
                      className="text-[#F52E6B] hover:text-[#FE6587] text-sm font-medium"
                    >
                      开始规划 →
                    </Link>
                  ) : (
                    <Link
                      to="/plan"
                      className="text-[#F52E6B] hover:text-[#FE6587] text-sm font-medium"
                    >
                      开始规划 →
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            [
              {
                name: '巴厘岛',
                image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
                description: '热带天堂，美丽海滩与丰富文化的完美融合'
              },
              {
                name: '巴黎',
                image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
                description: '艺术之都，浪漫与文化的象征'
              },
              {
                name: '东京',
                image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26',
                description: '现代都市与传统日本的完美结合'
              }
            ].map((destination, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="relative h-48">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-[#1C2340] mb-2">
                    {destination.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {destination.description}
                  </p>
                  <Link
                    to="/plan"
                    className="text-[#F52E6B] hover:text-[#FE6587] text-sm font-medium"
                  >
                    开始规划 →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}