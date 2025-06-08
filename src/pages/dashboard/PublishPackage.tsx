import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Loader, ArrowLeft, Tag, AlertCircle, Coins, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { Editor } from '../../components/Editor';
import { DatePicker } from '../../components/DatePicker';
import { useCreditStore } from '../../store/credits';

interface FormData {
  title: string;
  description: string;
  content: string;
  originalPrice: string;
  isDiscounted: boolean;
  discountPrice: string;
  discountExpiresAt: string;
  isInternational: boolean;
  duration: string;
  destination: string;
  departure: string; 
  coverImage: File | null;
  expireAt: string;
}

interface SystemSettings {
  is_publish_package_charged: boolean;
  package_publish_cost: number;
  max_travel_packages_per_agent: number;
}

const MAX_TITLE_LENGTH = 35;
const MAX_DESTINATION_LENGTH = 15;
const MAX_DEPARTURE_LENGTH = 15;
const MAX_DESCRIPTION_LENGTH = 120;
const MAX_COVER_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function PublishPackage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { total: credits, fetchCredits, consumeCredits } = useCreditStore();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    is_publish_package_charged: false,
    package_publish_cost: 50,
    max_travel_packages_per_agent: 3
  });
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [showPackageLimitWarning, setShowPackageLimitWarning] = useState(false);
  const [activePackagesCount, setActivePackagesCount] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    content: '',
    originalPrice: '',
    isDiscounted: false,
    isInternational: false,
    discountPrice: '',
    discountExpiresAt: '',
    duration: '3',
    destination: '',
    departure: '',
    coverImage: null,
    expireAt: ''
  });

  // Calculate min and max dates for expiration
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Max date for regular expiration (30 days)
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 30);
  
  // Max date for discount expiration (3 days)
  const maxDiscountDate = new Date(today);
  maxDiscountDate.setDate(today.getDate() + 3);
  
  const discountMaxDate = maxDiscountDate.toISOString().split('T')[0];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
    fetchSystemSettings();
    fetchCredits();
  }, [user, navigate, fetchCredits]);

  useEffect(() => {
    if (user && !isAdmin) {
      fetchActivePackagesCount();
    }
  }, [user, isAdmin]);

  async function fetchActivePackagesCount() {
    try {
      const { count, error } = await supabase
        .from('travel_packages')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user?.id)
        .eq('status', 'approved')
        .or('expire_at.is.null,expire_at.gt.now()');

      if (error) throw error;
      setActivePackagesCount(count || 0);
      
      if (count && count >= systemSettings.max_travel_packages_per_agent) {
        setShowPackageLimitWarning(true);
      }
    } catch (error) {
      console.error('Error fetching active packages count:', error);
    }
  }

  async function checkAccess() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user?.id)
      .single();

    if (profile?.user_role !== 'agent' && profile?.user_role !== 'admin') {
      navigate('/');
    }
    
    setIsAdmin(profile?.user_role === 'admin');
  }

  async function fetchSystemSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('is_publish_package_charged, package_publish_cost, max_travel_packages_per_agent')
        .single();

      if (error) {
        console.error('Error fetching system settings:', error);
        return;
      }

      if (data) {
        setSystemSettings({
          is_publish_package_charged: data.is_publish_package_charged || false,
          package_publish_cost: data.package_publish_cost || 50,
          max_travel_packages_per_agent: data.max_travel_packages_per_agent || 3
        });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  }

  const handleImageUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('package-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('package-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.coverImage) return;

    // Check if publishing is charged and if user has enough credits
    if (systemSettings.is_publish_package_charged && !isAdmin) {
      if (credits < systemSettings.package_publish_cost) {
        setShowCreditWarning(true);
        return;
      }
    }

    // Check package limit for non-admin users
    if (!isAdmin && activePackagesCount >= systemSettings.max_travel_packages_per_agent) {
      setShowPackageLimitWarning(true);
      return;
    }

    setLoading(true);
    try {
      // Validate cover image size
      if (formData.coverImage.size > MAX_COVER_IMAGE_SIZE) {
        throw new Error('封面图片不能超过 5MB');
      }

      // Upload cover image
      const fileExt = formData.coverImage.name.split('.').pop();
      const fileName = `cover_${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(filePath, formData.coverImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);

      // Prepare package data
      const packageData: any = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        agent_id: user.id,
        status: isAdmin ? 'approved' : 'pending',
        destination: formData.destination,
        departure: formData.departure,
        duration: parseInt(formData.duration),
        image: publicUrl,
        expire_at: formData.expireAt || null
      };

      // Handle pricing based on discount status
      if (formData.isDiscounted) {
        packageData.is_discounted = true;
        packageData.original_price = parseFloat(formData.originalPrice);
        packageData.discount_price = parseFloat(formData.discountPrice);
        packageData.price = parseFloat(formData.discountPrice);
        packageData.discount_expires_at = formData.discountExpiresAt || null;
        packageData.is_international = false;
      } else if (formData.isInternational) {
        packageData.is_international = true;
        packageData.is_discounted = false;
        packageData.original_price = parseFloat(formData.originalPrice);
        packageData.price = parseFloat(formData.originalPrice);
      } else {
        packageData.is_discounted = false;
        packageData.is_international = false;
        packageData.original_price = parseFloat(formData.originalPrice);
        packageData.price = parseFloat(formData.originalPrice);
      }

      // Create package
      const { error: insertError } = await supabase
        .from('travel_packages')
        .insert(packageData);

      if (insertError) throw insertError;

      // Consume credits if needed (only for non-admin users)
      if (systemSettings.is_publish_package_charged && !isAdmin) {
        await consumeCredits(
          systemSettings.package_publish_cost,
          '发布旅行套餐'
        );
      }

      // Navigate based on user role
      if (isAdmin) {
        navigate('/admin/packages');
      } else {
        navigate('/dashboard/my-packages');
      }
    } catch (error) {
      console.error('Error publishing package:', error);
      alert(error instanceof Error ? error.message : '发布失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => isAdmin ? navigate('/admin/packages') : navigate(-1)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">发布旅行套餐</h1>
        </div>
      </div>

      {/* Package limit warning */}
      {showPackageLimitWarning && !isAdmin && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="font-medium">已达到套餐发布上限</h3>
            <p className="mt-1 text-sm">
              您当前已有 {activePackagesCount} 个有效套餐，每位代理最多可发布 {systemSettings.max_travel_packages_per_agent} 个有效套餐
            </p>
            <button 
              onClick={() => navigate('/dashboard/my-packages')}
              className="mt-2 text-[#F52E6B] hover:text-[#FE6587] font-medium"
            >
              前往【我的套餐】管理现有套餐
            </button>
          </div>
        </div>
      )}

      {/* Credit warning */}
      {showCreditWarning && !isAdmin && systemSettings.is_publish_package_charged && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="font-medium">积分不足</h3>
            <p className="mt-1 text-sm">
              发布套餐需要 {systemSettings.package_publish_cost} 积分，您当前仅有 {credits} 积分
            </p>
            <button 
              onClick={() => {
                navigate('/profile');
                setTimeout(() => {
                  const element = document.getElementById('credits-tab');
                  if (element) element.click();
                }, 100);
              }}
              className="mt-2 text-[#F52E6B] hover:text-[#FE6587] font-medium"
            >
              立即前往【积分中心】购买积分
            </button>
          </div>
        </div>
      )}

      {/* Credit info banner */}
      {!isAdmin && systemSettings.is_publish_package_charged && !showCreditWarning && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg flex items-center">
          <Coins className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm">
              发布套餐将消耗 <strong>{systemSettings.package_publish_cost}</strong> 积分，您当前有 <strong>{credits}</strong> 积分
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">基本信息</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                套餐标题 * ({formData.title.length}/{MAX_TITLE_LENGTH})
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_TITLE_LENGTH) {
                    setFormData({ ...formData, title: e.target.value });
                  }
                }}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
                maxLength={MAX_TITLE_LENGTH}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出发地 * ({formData.departure.length}/{MAX_DEPARTURE_LENGTH})
              </label>
              <input
                type="text"
                value={formData.departure}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DEPARTURE_LENGTH) {
                    setFormData({ ...formData, departure: e.target.value });
                  }
                }}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
                maxLength={MAX_DEPARTURE_LENGTH}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目的地 * ({formData.destination.length}/{MAX_DESTINATION_LENGTH})
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESTINATION_LENGTH) {
                    setFormData({ ...formData, destination: e.target.value });
                  }
                }}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
                maxLength={MAX_DESTINATION_LENGTH}
              />
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原价（元）*
                </label>
                <input
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="packageType"
                    checked={formData.isDiscounted}
                    onChange={() => setFormData({ 
                      ...formData, 
                      isDiscounted: true,
                      isInternational: false
                    })}
                    className="h-4 w-4 text-[#F52E6B] focus:ring-[#F52E6B] border-gray-300"
                  />
                  <div className="ml-2 flex items-center text-sm font-medium text-gray-700">
                    <Tag className="h-4 w-4 text-[#F52E6B] mr-1" />
                    设为限时特价套餐
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="packageType"
                    checked={formData.isInternational}
                    onChange={() => setFormData({ 
                      ...formData, 
                      isInternational: true,
                      isDiscounted: false
                    })}
                    className="h-4 w-4 text-[#F52E6B] focus:ring-[#F52E6B] border-gray-300"
                  />
                  <div className="ml-2 flex items-center text-sm font-medium text-gray-700">
                    <Globe className="h-4 w-4 text-[#F52E6B] mr-1" />
                    设为境外游套餐
                  </div>
                </label>
              </div>

              {formData.isDiscounted && (
                <div className="pl-6 space-y-4 border-l-2 border-[#F52E6B] bg-pink-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      特价（元）*
                    </label>
                    <input
                      type="number"
                      value={formData.discountPrice}
                      onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      required={formData.isDiscounted}
                      min="0"
                      max={formData.originalPrice || undefined}
                      step="0.01"
                    />
                    {formData.originalPrice && formData.discountPrice && (
                      <p className="mt-1 text-sm text-gray-500">
                        折扣: {Math.round((1 - parseFloat(formData.discountPrice) / parseFloat(formData.originalPrice)) * 100)}% 优惠
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      特价截止日期 *
                    </label>
                    <DatePicker
                      value={formData.discountExpiresAt}
                      onChange={(date) => setFormData({ ...formData, discountExpiresAt: date, expireAt: date })}
                      minDate={new Date(minDate)}
                      maxDate={new Date(discountMaxDate)}
                      placeholder="选择特价截止日期"
                      required={formData.isDiscounted}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      特价截止日期不能超过3天
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  行程天数 *
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  下架时间
                </label>
                <DatePicker
                  value={formData.isDiscounted ? formData.discountExpiresAt : formData.expireAt}
                  onChange={(date) => {
                    if (formData.isDiscounted) {
                      setFormData({ ...formData, discountExpiresAt: date, expireAt: date });
                    } else {
                      setFormData({ ...formData, expireAt: date });
                    }
                  }}
                  minDate={new Date(minDate)}
                  maxDate={formData.isDiscounted ? new Date(discountMaxDate) : new Date(maxDate.toISOString().split('T')[0])}
                  placeholder="选择下架日期"
                  disabled={formData.isDiscounted}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.isDiscounted 
                    ? '特价套餐下架时间与特价截止日期相同' 
                    : '最长30天，到期自动下架'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                简要描述 * ({formData.description.length}/{MAX_DESCRIPTION_LENGTH})
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                    setFormData({ ...formData, description: e.target.value });
                  }
                }}
                rows={4}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">封面图片</h2>
          
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="cover-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-[#F52E6B] hover:text-[#FE6587] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#F52E6B]"
                >
                  <span>上传图片</span>
                  <input
                    id="cover-upload"
                    name="cover-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        if (e.target.files[0].size > MAX_COVER_IMAGE_SIZE) {
                          alert('封面图片不能超过 5MB');
                          return;
                        }
                        setFormData({ ...formData, coverImage: e.target.files[0] });
                      }
                    }}
                    required={!formData.coverImage}
                  />
                </label>
                <p className="pl-1">或拖放图片到此处</p>
              </div>
              <p className="text-xs text-gray-500">
                建议尺寸 1080x720，大小 ≤ 5MB
              </p>
            </div>
          </div>

          {formData.coverImage && (
            <div className="mt-4">
              <img
                src={URL.createObjectURL(formData.coverImage)}
                alt="封面预览"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Rich Text Editor */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">图文详情</h2>
          <Editor
            content={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
            onImageUpload={handleImageUpload}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => isAdmin ? navigate('/admin/packages') : navigate('/dashboard/my-packages')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || 
              (systemSettings.is_publish_package_charged && !isAdmin && credits < systemSettings.package_publish_cost) ||
              (!isAdmin && activePackagesCount >= systemSettings.max_travel_packages_per_agent)}
            className="bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                发布中...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                发布套餐
                {systemSettings.is_publish_package_charged && !isAdmin && (
                  <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                    消耗 {systemSettings.package_publish_cost} 积分
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}