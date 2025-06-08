import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
//import authStore from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Search, Tag, X, Globe, Star } from 'lucide-react';
import './packages.scss';
import '@/styles/utils.scss';

interface TravelPackage {
  id: string;
  title: string;
  description: string;
  image: string;
  price: number;
  duration: number;
  destination: string;
  departure: string;
  views: number;
  orders: number;
  favorites: number;
  hot_score: number;
  average_rating?: number;
  created_at: string;
  is_discounted: boolean;
  is_international: boolean;
  original_price?: number;
  discount_price?: number;
  discount_expires_at?: string;
  status: string;
  expire_at?: string;
  agent: {
    full_name: string;
    agency_id?: string;
  } | null;
}

export default function Packages() {
  const { user } = useAuthStore();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState('');
  const [departure, setDeparture] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'international' | 'discount'>('hot');
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, [sortBy]);

  async function fetchPackages(params?: { destination?: string; departure?: string }) {
    try {
      setLoading(true);
      let query = supabase
        .from('travel_packages')
        .select('*, agent:profiles!travel_packages_agent_id_fkey(full_name, agency_id)')
        .eq('status', 'approved')
        .or('expire_at.is.null,expire_at.gt.now()');

      if (params?.destination) query = query.ilike('destination', `%${params.destination}%`);
      if (params?.departure) query = query.ilike('departure', `%${params.departure}%`);

      if (sortBy === 'discount') {
        query = query
          .eq('is_discounted', true)
          .gte('discount_expires_at', new Date().toISOString().split('T')[0])
          .order('discount_price', { ascending: true });
      } else if (sortBy === 'international') {
        query = query.eq('is_international', true);
      } else {
        query = query.order('hot_score', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('获取旅行套餐失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPackages({ destination, departure });
    setShowSearchPanel(false);
  };

  const clearSearch = () => {
    setDeparture('');
    setDestination('');
    fetchPackages();
  };

  const handleBooking = (e, id: string) => {
    e.stopPropagation();
    if (!user) {
      Taro.navigateTo({ url: '/pages/AuthPage' });
    } else {
      Taro.navigateTo({ url: `/pages/BookPage?id=${id}` });
    }
  };

  const isDiscountActive = (pkg: TravelPackage) =>
    pkg.is_discounted && pkg.discount_expires_at && new Date(pkg.discount_expires_at) > new Date();

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <View className="flex items-center mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <Text className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <ScrollView scrollY className="packages-wrapper px-4 py-6">
      <View className="flex justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-[#1C2340]">精选旅行套餐</Text>
        <View
          onClick={() => setShowSearchPanel(!showSearchPanel)}
          className="p-2 rounded-full bg-gray-100 hover-bg-gray-200 relative"
        >
          <Search className="h-5 w-5 text-gray-600" />
          {(departure || destination) && (
            <View className="absolute -top-1 -right-1 bg-[#F52E6B] text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">!</View>
          )}
        </View>
      </View>

      {showSearchPanel && (
        <View className="bg-white rounded-lg shadow-md p-4 mb-4 animate-fadeIn">
          <View className="flex justify-between items-center mb-3">
            <Text className="font-medium text-gray-700">搜索旅行套餐</Text>
            <View onClick={() => setShowSearchPanel(false)} className="text-gray-400 hover-text-gray-600">
              <X className="h-5 w-5" />
            </View>
          </View>

          <View className="space-y-3">
            <View>
              <Text className="block text-sm text-gray-600 mb-1">出发地</Text>
              <View className="relative">
                <MapPin className="absolute left-3 top-1_2 transform -translate-y-1_2 text-gray-400 h-5 w-5" />
                <Input
                  value={departure}
                  onInput={(e) => setDeparture(e.detail.value)}
                  placeholder="输入出发地，例如：北京"
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus-outline-none focus-ring-2 focus-ring-[#F52E6B]"
                />
              </View>
            </View>

            <View>
              <Text className="block text-sm text-gray-600 mb-1">目的地</Text>
              <View className="relative">
                <MapPin className="absolute left-3 top-1_2 transform -translate-y-1_2 text-gray-400 h-5 w-5" />
                <Input
                  value={destination}
                  onInput={(e) => setDestination(e.detail.value)}
                  placeholder="输入目的地，例如：上海"
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus-outline-none focus-ring-2 focus-ring-[#F52E6B]"
                />
              </View>
            </View>

            <View className="flex space-x-2 pt-2">
              <Button onClick={clearSearch} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover-bg-gray-50 flex-1">清除</Button>
              <Button onClick={handleSearch} className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover-bg-[#FE6587] flex-1">搜索</Button>
            </View>
          </View>
        </View>
      )}

      <View className="flex space-x-2 mb-6">
        <Button onClick={() => setSortBy('hot')} className={`px-4 py-2 text-sm rounded-full ${sortBy === 'hot' ? 'bg-[#F52E6B] text-white' : 'bg-gray-100 text-gray-600 hover-bg-gray-200'}`}>热门推荐</Button>
        <Button onClick={() => setSortBy('discount')} className={`px-4 py-2 text-sm rounded-full flex items-center ${sortBy === 'discount' ? 'bg-[#F52E6B] text-white' : 'bg-gray-100 text-gray-600 hover-bg-gray-200'}`}><Tag className="h-3 w-3 mr-1" /> 特价套餐</Button>
        <Button onClick={() => setSortBy('international')} className={`px-4 py-2 text-sm rounded-full flex items-center ${sortBy === 'international' ? 'bg-[#F52E6B] text-white' : 'bg-gray-100 text-gray-600 hover-bg-gray-200'}`}><Globe className="h-3 w-3 mr-1" /> 境外游</Button>
      </View>

      <View className="grid grid-cols-1 gap-6">
        {packages.map((pkg) => (
          <View key={pkg.id} onClick={() => Taro.navigateTo({ url: `/pages/PackageDetail?id=${pkg.id}` })} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover-scale-102 cursor-pointer relative">
            {isDiscountActive(pkg) && <View className="absolute top-0 left-0 bg-red-500 text-white text-xs px-2 py-1 z-10 rounded-br-lg">限时特价</View>}
            {pkg.is_international && <View className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1 z-10 rounded-br-lg">境外游</View>}
            <View className="relative h-48">
              <Image mode="aspectFill" src={pkg.image} className="w-full h-full" />
              <View className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-md">
                {isDiscountActive(pkg)
                  ? <><Text className="text-gray-400 line-through text-xs mr-1">¥{pkg.original_price}</Text><Text className="text-[#F52E6B] font-semibold">¥{pkg.discount_price}</Text></>
                  : <Text className="text-[#F52E6B] font-semibold">¥{pkg.price}</Text>
                }
              </View>
            </View>
            <View className="p-6">
              <Text className="text-xl font-bold text-[#1C2340] mb-2">{pkg.title}</Text>
              <Text className="text-gray-600 mb-4 truncate-2-lines">{pkg.description}</Text>
              <View className="space-y-2 mb-6">
                <View className="flex items-center text-gray-500"><Clock className="h-5 w-5 mr-2" /> <Text>{pkg.duration} 天</Text></View>
                <View className="flex items-center text-gray-500"><MapPin className="h-5 w-5 mr-2" /> <Text>{pkg.departure} → {pkg.destination}</Text></View>
                {renderStars(pkg.average_rating)}
              </View>
              <View className="flex items-center justify-between text-sm text-gray-500">
                <View className="space-x-4"><Text>{pkg.views} 浏览</Text><Text>{pkg.orders} 订单</Text><Text>{pkg.favorites} 收藏</Text></View>
                <Button onClick={(e) => handleBooking(e, pkg.id)} className="bg-[#F52E6B] hover-bg-[#FE6587] text-white font-medium py-2 px-4 rounded-md">立即预订</Button>
              </View>
            </View>
          </View>
        ))}

        {!loading && packages.length === 0 && (
          <View className="text-center py-12">
            <Text className="text-gray-400 mb-4">暂无符合条件的旅行套餐</Text>
            <Text className="text-gray-500">请尝试其他目的地或出发地</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
