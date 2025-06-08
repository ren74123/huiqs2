import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  Map, 
  Settings, 
  Shield, 
  LogOut,
  User,
  Plus,
  Heart,
  Building2,
  Coins,
  Camera,
  Upload,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { OrderTabs } from '../components/user/OrderTabs';
import { TravelPlans } from '../components/user/TravelPlans';
import { UserFavorites } from './user/Favorites';
import { MessageBadge } from '../components/MessageBadge';
import { CreditSettings } from '../components/user/CreditSettings';
import { useCreditStore } from '../store/credits';
import { isValidUUID } from '../utils/validation';
import { uploadAvatar } from '../utils/fileUpload';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  user_role: 'user' | 'agent' | 'admin' | 'reviewer';
  avatar_url: string;
  agency_id?: string;
  nickname_changes?: {timestamp: number}[];
}

// Default nicknames for new users
const DEFAULT_NICKNAMES = [
  "旅行者",
  "背包小旅人",
  "星辰旅客",
  "漫游小行者",
  "流浪地图控",
  "行走的风景",
  "云端漫步者",
  "梦里远方",
  "小岛拾光",
  "月光旅人",
  "风中旅影",
  "热气球飞行员",
  "雪山追光者",
  "城市漫游客",
  "古镇拍照狂",
  "海岛日落控"
];

const MAX_NICKNAME_CHANGES = 5;
const NICKNAME_CHANGE_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 8000; // 8 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds


export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { total: credits, fetchCredits } = useCreditStore();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'plans' | 'favorites' | 'credits' | 'settings'>('orders');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'credits' | 'history' | 'info-fee-payment' | 'info-fee-history' | 'enterprise-fee-payment' | 'enterprise-fee-history'>('profile');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [enterpriseOrderId, setEnterpriseOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isValidUUID(user.id)) {
      navigate('/auth');
      return;
    }
    fetchUserData();
    fetchCredits();
    
    // Check for query parameters
    const searchParams = new URLSearchParams(location.search);
    const orderIdParam = searchParams.get('order_id');
    const enterpriseOrderIdParam = searchParams.get('enterpriseOrderId');
    const tabParam = searchParams.get('tab');
    const settingsTabParam = searchParams.get('activeSettingsTab');
    
    if (orderIdParam && isValidUUID(orderIdParam)) {
      setOrderId(orderIdParam);
      setActiveTab('credits');
      setActiveSettingsTab('info-fee-payment');
    }
    
    if (enterpriseOrderIdParam && isValidUUID(enterpriseOrderIdParam)) {
      setEnterpriseOrderId(enterpriseOrderIdParam);
      setActiveTab('credits');
      setActiveSettingsTab('enterprise-fee-payment');
    }
    
    if (tabParam === 'credits') {
      setActiveTab('credits');
    }
    
    if (settingsTabParam) {
      setActiveSettingsTab(settingsTabParam as any);
    }
  }, [user, navigate, fetchCredits, location]);

  async function fetchUserData(retryAttempt = 0) {
    try {
      setLoading(true);
      
      // Create an AbortController for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      // Only select the fields we need
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, user_role, avatar_url, agency_id, nickname_changes')
        .eq('id', user?.id)
        .single()
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) throw error;
      
      if (profileData) {
        // If user doesn't have a nickname, assign a random one
        if (!profileData.full_name) {
          const randomNickname = DEFAULT_NICKNAMES[Math.floor(Math.random() * DEFAULT_NICKNAMES.length)];
          await supabase
            .from('profiles')
            .update({ full_name: randomNickname })
            .eq('id', user?.id);
          profileData.full_name = randomNickname;
        }
        
        setProfile(profileData);
        setRetryCount(0); // Reset retry count on successful fetch
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Calculate retry delay with exponential backoff
      const retryDelay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, retryAttempt),
        MAX_RETRY_DELAY
      );
      
      if (retryAttempt < MAX_RETRIES) {
        console.log(`Retrying in ${retryDelay}ms...`);
        setTimeout(() => {
          fetchUserData(retryAttempt + 1);
        }, retryDelay);
      } else {
        // After max retries, try to sign out and redirect to auth
        try {
          await signOut();
          navigate('/auth');
        } catch (signOutError) {
          console.error('Error during sign out after fetch failures:', signOutError);
          navigate('/auth');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    try {
      // First attempt to sign out
      await signOut();
      
      // Clear any remaining session data
      localStorage.removeItem('supabase.auth.token');
      
      // Navigate to auth page
      navigate('/auth');
    } catch (error) {
      console.error('Error during sign out:', error);
      
      // Even if there's an error, clear local storage and redirect
      localStorage.removeItem('supabase.auth.token');
      navigate('/auth');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    // Check file size
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError(`图片大小不能超过 ${MAX_AVATAR_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Check file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError('请上传 JPG、PNG、GIF 或 WebP 格式的图片');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const canChangeAvatar = () => {
    if (!profile?.nickname_changes) return true;
    
    const now = Date.now();
    const recentChanges = profile.nickname_changes.filter(
      change => now - change.timestamp < NICKNAME_CHANGE_INTERVAL
    );
    
    return recentChanges.length < MAX_NICKNAME_CHANGES;
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user || !isValidUUID(user.id)) {
      setAvatarError('Invalid file or user session');
      return;
    }
    
    if (!canChangeAvatar()) {
      setAvatarError('您已达到本月头像修改次数上限，请30天后再试');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      // Check session before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Upload avatar using the utility function
const publicUrl = await uploadAvatar(avatarFile, user.id);


      // Update profile with new avatar URL
      const now = Date.now();
      const updatedChanges = [...(profile?.nickname_changes || []), { timestamp: now }];
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          nickname_changes: updatedChanges
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error('Failed to update profile with new avatar');
      }

      // Update local state
      setProfile(prev => prev ? { 
        ...prev, 
        avatar_url: publicUrl,
        nickname_changes: updatedChanges
      } : null);
      
      // Close modal and reset state
      setShowAvatarModal(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (error instanceof Error) {
        setAvatarError(error.message);
      } else {
        setAvatarError('Avatar upload failed. Please try again.');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">请先登录</h2>
          <p className="text-gray-600">您需要登录后才能访问个人中心</p>
          <button
            onClick={() => navigate('/auth')}
            className="mt-4 px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587]"
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] p-6 text-white relative">
          <div className="flex items-center space-x-4">
            <div 
              className="w-20 h-20 bg-white bg-opacity-20 backdrop-blur-lg rounded-full flex items-center justify-center relative cursor-pointer"
              onClick={() => setShowAvatarModal(true)}
            >
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || '用户头像'} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-white" />
              )}
              <div className="absolute bottom-0 right-0 bg-[#F52E6B] rounded-full p-1">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {profile.full_name || '未设置昵称'}
              </h2>
              <p className="text-sm opacity-90">{profile.phone || '未绑定手机'}</p>
              <div className="flex items-center mt-2 space-x-2">
                <span className="inline-block px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                  {profile.user_role === 'admin' ? '管理员' : 
                   profile.user_role === 'agent' ? (profile.agency_id ? `旅行社 ${profile.agency_id}` : '旅行社') : 
                   profile.user_role === 'reviewer' ? '审核员' : '用户'}
                </span>
                <span className="inline-flex items-center px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                  <Coins className="h-3 w-3 mr-1" />
                  {credits} 积分
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="absolute top-6 right-6 flex items-center space-x-4">
            <MessageBadge />
            <Link 
              to="#"
              onClick={() => setActiveTab('settings')}
              className="text-white hover:text-opacity-80 transition-opacity"
            >
              <Settings className="h-6 w-6" />
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'orders'
                  ? 'border-b-2 border-[#F52E6B] text-[#F52E6B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              我的订单
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'plans'
                  ? 'border-b-2 border-[#F52E6B] text-[#F52E6B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              我的行程
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'favorites'
                  ? 'border-b-2 border-[#F52E6B] text-[#F52E6B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              我的收藏
            </button>
            <button
              id="credits-tab"
              onClick={() => {
                setActiveTab('credits');
                setActiveSettingsTab('credits');
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'credits'
                  ? 'border-b-2 border-[#F52E6B] text-[#F52E6B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              积分中心
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {activeTab === 'orders' && <OrderTabs />}
          {activeTab === 'plans' && <TravelPlans />}
          {activeTab === 'favorites' && <UserFavorites />}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  昵称
                </label>
                <input
                  type="text"
                  value={profile.full_name || ''}
                  onChange={async (e) => {
                    const newName = e.target.value;
                    setProfile(prev => prev ? { ...prev, full_name: newName } : null);
                    try {
                      await supabase
                        .from('profiles')
                        .update({ full_name: newName })
                        .eq('id', user.id);
                    } catch (error) {
                      console.error('Error updating name:', error);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  placeholder="设置昵称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  手机号
                </label>
                <input
                  type="text"
                  value={profile.phone || ''}
                  disabled
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 bg-gray-50 text-gray-500"
                />
              </div>

              {profile.user_role === 'user' && (
                <Link
                  to="/become-agent"
                  className="block w-full bg-[#F52E6B] bg-opacity-10 text-[#F52E6B] font-medium py-2 px-4 rounded-lg hover:bg-opacity-20 transition-colors text-center"
                >
                  申请成为旅行社
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="w-full mt-4 bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition duration-200"
              >
                退出登录
              </button>
            </div>
          )}
          {activeTab === 'credits' && (
            <CreditSettings 
              activeSettingsTab={activeSettingsTab} 
              orderId={orderId}
              enterpriseOrderId={enterpriseOrderId}
            />
          )}
        </div>

        {/* Agent Entry */}
        {profile.user_role === 'agent' && (
          <div className="p-6 border-t border-gray-200">
            <Link
              to="/dashboard/publish"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition duration-200 mb-4"
            >
              <Plus className="h-5 w-5" />
              <span>发布套餐</span>
            </Link>
            <Link
              to="/dashboard/my-packages"
              className="flex items-center justify-center space-x-2 w-full bg-[#F52E6B] bg-opacity-10 text-[#F52E6B] font-medium py-2 px-4 rounded-lg hover:bg-opacity-20 transition-colors mb-4"
            >
              <Package className="h-5 w-5" />
              <span>管理套餐</span>
            </Link>
            <Link
              to="/agent/console"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition duration-200"
            >
              <Shield className="h-5 w-5" />
              <span>进入管理后台</span>
            </Link>
          </div>
        )}

        {/* Reviewer Entry */}
        {profile.user_role === 'reviewer' && (
          <div className="p-6 border-t border-gray-200">
            <Link
              to="/dashboard/publish"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition duration-200 mb-4"
            >
              <Plus className="h-5 w-5" />
              <span>发布套餐</span>
            </Link>
            <Link
              to="/dashboard/my-packages"
              className="flex items-center justify-center space-x-2 w-full bg-[#F52E6B] bg-opacity-10 text-[#F52E6B] font-medium py-2 px-4 rounded-lg hover:bg-opacity-20 transition-colors mb-4"
            >
              <Package className="h-5 w-5" />
              <span>管理套餐</span>
            </Link>
            <Link
              to="/reviewer/console"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition duration-200"
            >
              <Shield className="h-5 w-5" />
              <span>进入管理后台</span>
            </Link>
          </div>
        )}

        {/* Admin Entry */}
        {profile.user_role === 'admin' && (
          <div className="p-6 border-t border-gray-200">
            <Link
              to="/dashboard/publish"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition duration-200 mb-4"
            >
              <Plus className="h-5 w-5" />
              <span>发布套餐</span>
            </Link>
            <Link
              to="/dashboard/my-packages"
              className="flex items-center justify-center space-x-2 w-full bg-[#F52E6B] bg-opacity-10 text-[#F52E6B] font-medium py-2 px-4 rounded-lg hover:bg-opacity-20 transition-colors mb-4"
            >
              <Package className="h-5 w-5" />
              <span>管理套餐</span>
            </Link>
            <Link
              to="/admin"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition duration-200"
            >
              <Shield className="h-5 w-5" />
              <span>进入管理后台</span>
            </Link>
          </div>
        )}

        {/* Avatar Upload Modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">更换头像</h2>
                <button
                  onClick={() => {
                    setShowAvatarModal(false);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    setAvatarError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {avatarError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {avatarError}
                </div>
              )}
              
              {!canChangeAvatar() && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
                  <p>您已达到本月头像修改次数上限（{MAX_NICKNAME_CHANGES}次），请30天后再试</p>
                </div>
              )}
              
              <div className="mb-6">
                {avatarPreview ? (
                  <div className="relative mx-auto w-40 h-40">
                    <img 
                      src={avatarPreview} 
                      alt="头像预览" 
                      className="w-full h-full object-cover rounded-full"
                    />
                    <button
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <Upload className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">点击上传或拖放图片</p>
                    <label className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] cursor-pointer">
                      选择图片
                      <input
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      支持 JPG、PNG、GIF、WebP 格式，大小不超过 5MB
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowAvatarModal(false);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAvatarUpload}
                  disabled={!avatarFile || uploadingAvatar || !canChangeAvatar()}
                  className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
                >
                  {uploadingAvatar ? '上传中...' : '保存'}
                </button>
              </div>
              
              <p className="mt-4 text-xs text-gray-500 text-center">
                每30天内最多可修改{MAX_NICKNAME_CHANGES}次头像
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { UserProfile }