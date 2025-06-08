import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Search, Tag, X, Globe, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

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

export function Packages() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [destination, setDestination] = useState('');
  const [departure, setDeparture] = useState('');

  const [sortBy, setSortBy] = useState<'hot' | 'international' | 'discount'>('hot');
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  // 仅监听 sortBy 改变时重新获取套餐列表
  useEffect(() => {
    fetchPackages();
  }, [sortBy]);

  // 拉取套餐数据，可传入筛选条件
  async function fetchPackages(params?: {
    destination?: string;
    departure?: string;
  }) {
    try {
      setLoading(true);

      let query = supabase
        .from('travel_packages')
        .select(`
          *,
          agent:profiles!travel_packages_agent_id_fkey(full_name, agency_id)
        `)
        .eq('status', 'approved')
        .or('expire_at.is.null,expire_at.gt.now()');

      if (params?.destination) {
        query = query.ilike('destination', `%${params.destination}%`);
      }

      if (params?.departure) {
        query = query.ilike('departure', `%${params.departure}%`);
      }

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

  // 点击搜索按钮时触发
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); // 阻止表单默认提交行为
    fetchPackages({ destination, departure }); // 根据用户输入条件拉数据
    setShowSearchPanel(false);
  };

  // 清除筛选项
  const clearSearch = () => {
    setDeparture('');
    setDestination('');
    fetchPackages(); // 拉全部数据
  };

  const handlePackageClick = (id: string) => navigate(`/packages/${id}`);

  const handleBooking = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
    } else {
      navigate(`/book/${id}`);
    }
  };

  const isDiscountActive = (pkg: TravelPackage) =>
    pkg.is_discounted &&
    pkg.discount_expires_at &&
    new Date(pkg.discount_expires_at) > new Date();

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-[#1C2340]">精选旅行套餐</h1>
        <button
          onClick={() => setShowSearchPanel(!showSearchPanel)}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 relative"
        >
          <Search className="h-5 w-5 text-gray-600" />
          {(departure || destination) && (
            <span className="absolute -top-1 -right-1 bg-[#F52E6B] text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">!</span>
          )}
        </button>
      </div>

      {/* 搜索区域 */}
      {showSearchPanel && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 animate-fadeIn">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-700">搜索旅行套餐</h3>
            <button onClick={() => setShowSearchPanel(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">出发地</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  placeholder="输入出发地，例如：北京"
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">目的地</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="输入目的地，例如：上海"
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex-1"
              >
                清除
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] flex-1"
              >
                搜索
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 筛选标签 */}
      {(departure || destination) && !showSearchPanel && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">当前筛选:</span>
          {departure && (
            <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
              <span className="mr-1">出发地:</span>
              <span className="font-medium">{departure}</span>
              <button onClick={() => { setDeparture(''); fetchPackages({ destination }); }}>
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600 ml-1" />
              </button>
            </div>
          )}
          {destination && (
            <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
              <span className="mr-1">目的地:</span>
              <span className="font-medium">{destination}</span>
              <button onClick={() => { setDestination(''); fetchPackages({ departure }); }}>
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600 ml-1" />
              </button>
            </div>
          )}
          <button onClick={clearSearch} className="text-[#F52E6B] text-sm hover:underline">清除全部</button>
        </div>
      )}

      {/* 筛选按钮组 */}
      <div className="flex space-x-2 mb-8">
        <button onClick={() => setSortBy('hot')} className={`px-4 py-2 text-sm rounded-full ${sortBy === 'hot' ? 'bg-[#F52E6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>热门推荐</button>
        <button onClick={() => setSortBy('discount')} className={`px-4 py-2 text-sm rounded-full flex items-center ${sortBy === 'discount' ? 'bg-[#F52E6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Tag className="h-3 w-3 mr-1" /> 特价套餐
        </button>
        <button onClick={() => setSortBy('international')} className={`px-4 py-2 text-sm rounded-full flex items-center ${sortBy === 'international' ? 'bg-[#F52E6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Globe className="h-3 w-3 mr-1" /> 境外游
        </button>
      </div>

      {/* 套餐列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages.map((pkg) => (
          <div key={pkg.id} onClick={() => handlePackageClick(pkg.id)} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-[1.02] cursor-pointer relative">
            {isDiscountActive(pkg) && (
              <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-2 py-1 z-10 rounded-br-lg">限时特价</div>
            )}
            {pkg.is_international && (
              <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1 z-10 rounded-br-lg">境外游</div>
            )}
            <div className="relative h-48">
              <img src={pkg.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800'} alt={pkg.title} className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-md">
                {isDiscountActive(pkg) ? (
                  <>
                    <span className="text-gray-400 line-through text-xs mr-1">¥{pkg.original_price}</span>
                    <span className="text-[#F52E6B] font-semibold">¥{pkg.discount_price}</span>
                  </>
                ) : (
                  <span className="text-[#F52E6B] font-semibold">¥{pkg.price}</span>
                )}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#1C2340] mb-2">{pkg.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-gray-500"><Clock className="h-5 w-5 mr-2" /> <span>{pkg.duration} 天</span></div>
                <div className="flex items-center text-gray-500"><MapPin className="h-5 w-5 mr-2" /> <span>{pkg.departure || '未设置'} → {pkg.destination}</span></div>
                {renderStars(pkg.average_rating)}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="space-x-4"><span>{pkg.views} 浏览</span><span>{pkg.orders} 订单</span><span>{pkg.favorites} 收藏</span></div>
                <button onClick={(e) => handleBooking(e, pkg.id)} className="bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-2 px-4 rounded-md transition duration-200">立即预订</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 无结果提示 */}
      {packages.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">暂无符合条件的旅行套餐</div>
          <p className="text-gray-500">请尝试其他目的地或出发地</p>
        </div>
      )}
    </div>
  );
}
