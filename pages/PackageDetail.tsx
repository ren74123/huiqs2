import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Clock, User, Heart, ArrowLeft, Star, ChevronDown, ChevronUp, Tag, Clock3, Share } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Countdown } from '../components/Countdown';

interface TravelPackage {
  id: string;
  title: string;
  description: string;
  content: string;
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
  status: string;
  agent_id: string;
  is_discounted: boolean;
  original_price?: number;
  discount_price?: number;
  discount_expires_at?: string;
  agent: {
    full_name: string;
    agency_id?: string;
  };
}

interface Review {
  id: string;
  user_id: string;
  package_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

export function PackageDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [pkg, setPackage] = useState<TravelPackage | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number} | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPackage();
      fetchReviews();
    }
  }, [id]);

  useEffect(() => {
    if (!pkg?.is_discounted || !pkg?.discount_expires_at) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const expiryDate = new Date(pkg.discount_expires_at as string);
      
      if (expiryDate <= now) {
        fetchPackage();
        return;
      }
      
      const diffTime = expiryDate.getTime() - now.getTime();
      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft({ days, hours, minutes });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    
    return () => clearInterval(interval);
  }, [pkg?.discount_expires_at]);

  async function fetchPackage() {
    try {
      // First fetch the package details
      let packageData = await supabase
        .from('travel_packages')
        .select(`
          *,
          agent:profiles!travel_packages_agent_id_fkey(full_name, agency_id)
        `)
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        });

      // Check if the package exists and handle discount expiration
      if (packageData) {
        // If the package is discounted but the expiry date has passed,
        // update the package to remove the discount
        if (packageData.is_discounted && packageData.discount_expires_at) {
          const expiryDate = new Date(packageData.discount_expires_at);
          if (expiryDate <= new Date()) {
            const { error: updateError } = await supabase
              .from('travel_packages')
              .update({
                is_discounted: false,
                discount_expires_at: null,
                discount_price: null
              })
              .eq('id', id);

            if (updateError) throw updateError;
            
            // Refetch the package to get updated data
            const { data: updatedData, error: refetchError } = await supabase
              .from('travel_packages')
              .select(`
                *,
                agent:profiles!travel_packages_agent_id_fkey(full_name, agency_id)
              `)
              .eq('id', id)
              .single();

            if (refetchError) throw refetchError;
            packageData = updatedData;
          }
        }

        setPackage(packageData);

        // Now increment the views after we've handled any necessary updates
        const { error: viewError } = await supabase
          .rpc('increment_package_views', { package_id: id });

        if (viewError) throw viewError;

        // Check if favorited
        if (user) {
          const { data: favorite } = await supabase
            .from('package_favorites')
            .select()
            .eq('user_id', user.id)
            .eq('package_id', id)
            .maybeSingle();

          setIsFavorited(!!favorite);
        }
      }
    } catch (error) {
      console.error('Error fetching package:', error);
      navigate('/packages');
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviews() {
    try {
      const { data, error } = await supabase
        .from('package_reviews')
        .select(`
          *,
          user:profiles!package_reviews_user_id_fkey(full_name)
        `)
        .eq('package_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setReviews(data);
        
        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(parseFloat((sum / data.length).toFixed(1)));
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }

  const handleFavorite = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      if (isFavorited) {
        const { error: deleteError } = await supabase
          .from('package_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('package_id', id);

        if (deleteError) throw deleteError;

        const { error: updateError } = await supabase
          .from('travel_packages')
          .update({ favorites: pkg!.favorites - 1 })
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        const { data: existingFavorite } = await supabase
          .from('package_favorites')
          .select()
          .eq('user_id', user.id)
          .eq('package_id', id)
          .maybeSingle();

        if (!existingFavorite) {
          const { error: insertError } = await supabase
            .from('package_favorites')
            .insert({ user_id: user.id, package_id: id });

          if (insertError) throw insertError;

          const { error: updateError } = await supabase
            .from('travel_packages')
            .update({ favorites: pkg!.favorites + 1 })
            .eq('id', id);

          if (updateError) throw updateError;
        }
      }

      setIsFavorited(!isFavorited);
      fetchPackage();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleBook = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/book/${id}`);
  };

  const handleShare = () => {
    setShowShareMenu(!showShareMenu);
  };

  const shareToSocialMedia = (platform: string) => {
    if (!pkg) return;
    
    const shareUrl = window.location.href;
    const shareTitle = `${pkg.title} - ${pkg.destination}旅行套餐`;
    const shareText = `推荐这个${pkg.duration}天的${pkg.destination}旅行套餐，价格：¥${pkg.price}`;
    
    let shareLink = '';
    
    switch (platform) {
      case 'wechat':
        navigator.clipboard.writeText(shareUrl);
        alert('链接已复制，请在微信中粘贴分享');
        break;
      case 'qq':
        shareLink = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&desc=${encodeURIComponent(shareText)}`;
        window.open(shareLink, '_blank');
        break;
      case 'weibo':
        shareLink = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
        window.open(shareLink, '_blank');
        break;
      case 'xiaohongshu':
        navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`);
        alert('内容已复制，请在小红书中粘贴分享');
        break;
      default:
        if (navigator.share) {
          navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
          });
        } else {
          navigator.clipboard.writeText(shareUrl);
          alert('链接已复制到剪贴板');
        }
    }
    
    setShowShareMenu(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getAgentDisplay = () => {
    if (!pkg) return '';
    return pkg.agent.agency_id ? `旅行社 ${pkg.agent.agency_id}` : pkg.agent.full_name;
  };

  const isDiscountActive = () => {
    if (!pkg?.is_discounted || !pkg?.discount_expires_at) return false;
    return new Date(pkg.discount_expires_at) > new Date();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">套餐不存在</h2>
          <button
            onClick={() => navigate('/packages')}
            className="text-[#F52E6B] hover:text-[#FE6587]"
          >
            返回套餐列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-full text-gray-400 hover:text-[#F52E6B] hover:bg-pink-50 relative"
          >
            <Share className="h-6 w-6" />
          </button>
          <button
            onClick={handleFavorite}
            className={`p-2 rounded-full ${
              isFavorited 
                ? 'text-[#F52E6B] bg-pink-50' 
                : 'text-gray-400 hover:text-[#F52E6B] hover:bg-pink-50'
            }`}
          >
            <Heart className="h-6 w-6" />
          </button>
        </div>
        
        {/* Share Menu Popup */}
        {showShareMenu && (
          <div className="absolute right-4 mt-12 bg-white rounded-lg shadow-lg p-3 z-10 border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => shareToSocialMedia('wechat')}
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-1">
                  <span className="text-white text-lg font-bold">微</span>
                </div>
                <span className="text-xs">微信</span>
              </button>
              <button 
                onClick={() => shareToSocialMedia('qq')}
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-1">
                  <span className="text-white text-lg font-bold">Q</span>
                </div>
                <span className="text-xs">QQ</span>
              </button>
              <button 
                onClick={() => shareToSocialMedia('weibo')}
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mb-1">
                  <span className="text-white text-lg font-bold">微</span>
                </div>
                <span className="text-xs">微博</span>
              </button>
              <button 
                onClick={() => shareToSocialMedia('xiaohongshu')}
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center mb-1">
                  <span className="text-white text-lg font-bold">红</span>
                </div>
                <span className="text-xs">小红书</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cover Image */}
      <div className="relative h-[400px] rounded-xl overflow-hidden mb-8">
        <img
          src={pkg.image}
          alt={pkg.title}
          className="w-full h-full object-cover"
        />
        
        {/* Discount badge */}
        {isDiscountActive() && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg shadow-md">
            限时特价
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{pkg.title}</h1>

          {/* Discount banner */}
          {isDiscountActive() && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg">
              <div className="text-red-600 font-bold text-lg">限时特价进行中！</div>
              <div className="text-sm text-gray-600 mt-1">
                原价 <span className="line-through">¥{pkg.original_price}</span>，
                现价仅 <span className="text-[#F52E6B] font-bold">¥{pkg.discount_price}</span>
                {pkg.original_price && pkg.discount_price && (
                  <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                    省 ¥{(pkg.original_price - pkg.discount_price).toFixed(2)}
                  </span>
                )}
              </div>
              {pkg.discount_expires_at && (
                <div className="mt-2 text-xs text-gray-500">
                  <Countdown 
                    targetDate={pkg.discount_expires_at} 
                    className="flex items-center text-red-500 font-medium"
                  />
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {pkg.departure} → {pkg.destination}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {pkg.duration}天
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {getAgentDisplay()}
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6">{pkg.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{pkg.views}</div>
              <div className="text-sm text-gray-500">浏览</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{pkg.orders}</div>
              <div className="text-sm text-gray-500">订单</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{pkg.favorites}</div>
              <div className="text-sm text-gray-500">收藏</div>
            </div>
          </div>
          
          {/* Reviews Summary */}
          {reviews.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">用户评价</h3>
                <div className="flex items-center">
                  {renderStars(Math.floor(averageRating))}
                  <span className="ml-2 font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                  <span className="ml-2 text-sm text-gray-500">({reviews.length}条评价)</span>
                </div>
              </div>
              
              <button 
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="w-full mt-2 text-[#F52E6B] text-sm flex items-center justify-center"
              >
                {showAllReviews ? '收起评价' : '查看全部评价'}
                {showAllReviews ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </button>
              
              {showAllReviews && (
                <div className="mt-4 space-y-4 max-h-80 overflow-y-auto">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 mr-2">{review.user.full_name}</span>
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600 text-sm">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: pkg.content }}
          />
        </div>

        {/* Bottom Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">价格</span>
            <div className="flex items-center">
              {isDiscountActive() ? (
                <>
                  <span className="text-gray-400 line-through text-sm mr-2">¥{pkg.original_price}</span>
                  <span className="text-2xl font-bold text-[#F52E6B]">¥{pkg.discount_price}</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-[#F52E6B]">¥{pkg.price}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleBook}
            className="bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-3 px-8 rounded-lg transition duration-200"
          >
            立即预订
          </button>
        </div>
      </div>
    </div>
  );
}