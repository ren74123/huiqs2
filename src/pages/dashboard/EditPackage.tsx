import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Plus, Loader, ArrowLeft, Tag, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { Editor } from '../../components/Editor';
import { DatePicker } from '../../components/DatePicker';

interface FormData {
  title: string;
  description: string;
  price: string;
  duration: string;
  destination: string;
  departure: string; // New field for departure location
  coverImage: File | null;
  currentImage: string | null;
  expireAt: string;
  isDiscounted: boolean;
  isInternational: boolean;
  originalPrice: string;
  discountPrice: string;
  discountExpiresAt: string;
}

export function EditPackage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'agent' | 'reviewer' | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    duration: '',
    destination: '',
    departure: '', // Initialize departure field
    coverImage: null,
    currentImage: null,
    expireAt: '',
    isDiscounted: false,
    isInternational: false,
    originalPrice: '',
    discountPrice: '',
    discountExpiresAt: ''
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
    console.log('[debug] EditPackage - 当前用户ID:', user?.id);
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user, id, navigate]);

  async function checkAccess() {
    try {
      console.log('[debug] EditPackage - 开始检查权限, 用户ID:', user?.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] EditPackage - 查询结果:', profile, '错误:', error);

      if (error) {
        console.error('[debug] EditPackage - 检查权限错误:', error);
        navigate('/');
        return;
      }

      if (!['admin', 'agent', 'reviewer'].includes(profile?.user_role)) {
        console.warn('[debug] EditPackage - 用户无权限，跳转到首页');
        navigate('/');
        return;
      }
      
      console.log('[debug] EditPackage - 设置用户角色:', profile.user_role);
      setUserRole(profile.user_role as 'admin' | 'agent' | 'reviewer');
      fetchPackage();
    } catch (error) {
      console.error('[debug] EditPackage - 检查权限出错:', error);
      navigate('/');
    }
  }

  async function fetchPackage() {
    try {
      console.log('[debug] EditPackage - 开始获取套餐详情, ID:', id);
      const { data, error } = await supabase
        .from('travel_packages')
        .select('*')
        .eq('id', id)
        .single();

      console.log('[debug] EditPackage - 查询结果:', data, '错误:', error);

      if (error) throw error;
      if (data) {
        // For reviewers, check if the package is pending
        if (userRole === 'reviewer' && data.status !== 'pending') {
          console.warn('[debug] EditPackage - 审核员只能编辑待审核套餐，跳转到套餐列表');
          navigate('/admin/packages');
          return;
        }

        // For agents, check if they own the package
        if (userRole === 'agent' && data.agent_id !== user?.id) {
          console.warn('[debug] EditPackage - 旅行社只能编辑自己的套餐，跳转到套餐列表');
          navigate('/dashboard/my-packages');
          return;
        }

        setFormData({
          title: data.title,
          description: data.description || '',
          price: data.price.toString(),
          duration: data.duration.toString(),
          destination: data.destination,
          departure: data.departure || '', // Set departure field
          coverImage: null,
          currentImage: data.image,
          expireAt: data.expire_at || '',
          isDiscounted: data.is_discounted || false,
          isInternational: data.is_international || false,
          originalPrice: data.original_price?.toString() || data.price.toString(),
          discountPrice: data.discount_price?.toString() || '',
          discountExpiresAt: data.discount_expires_at || ''
        });
        setEditorContent(data.content || '');
      }
    } catch (error) {
      console.error('[debug] EditPackage - 获取套餐详情错误:', error);
      if (userRole === 'admin') {
        navigate('/admin/packages');
      } else if (userRole === 'reviewer') {
        navigate('/admin/packages');
      } else {
        navigate('/dashboard/my-packages');
      }
    } finally {
      setLoading(false);
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
    if (!user) return;

    setSubmitting(true);
    try {
      let imageUrl = formData.currentImage;

      // Upload new cover image if selected
      if (formData.coverImage) {
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

        imageUrl = publicUrl;
      }

      // Prepare update data
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        content: editorContent,
        duration: parseInt(formData.duration),
        destination: formData.destination,
        departure: formData.departure, // Add departure field
        image: imageUrl
      };

      // For reviewers, don't reset status to pending
      if (userRole !== 'reviewer') {
        updateData.status = 'pending'; // Reset to pending for re-review
      }
      
      updateData.expire_at = formData.expireAt || null;

      // Handle pricing based on discount status
      if (formData.isDiscounted) {
        updateData.is_discounted = true;
        updateData.is_international = false;
        updateData.original_price = parseFloat(formData.originalPrice);
        updateData.discount_price = parseFloat(formData.discountPrice);
        updateData.price = parseFloat(formData.discountPrice);
        updateData.discount_expires_at = formData.discountExpiresAt || null;
      } else if (formData.isInternational) {
        updateData.is_discounted = false;
        updateData.is_international = true;
        updateData.original_price = parseFloat(formData.originalPrice);
        updateData.price = parseFloat(formData.originalPrice);
        updateData.discount_price = null;
        updateData.discount_expires_at = null;
      } else {
        updateData.is_discounted = false;
        updateData.is_international = false;
        updateData.original_price = parseFloat(formData.originalPrice);
        updateData.price = parseFloat(formData.originalPrice);
        updateData.discount_price = null;
        updateData.discount_expires_at = null;
      }

      console.log('[debug] EditPackage - 更新套餐数据:', updateData);

      // Update package
      const { error: updateError } = await supabase
        .from('travel_packages')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      console.log('[debug] EditPackage - 套餐更新成功');

      // Navigate back to the appropriate page based on user role
      if (userRole === 'admin') {
        navigate('/admin/packages');
      } else if (userRole === 'reviewer') {
        navigate('/admin/packages');
      } else {
        navigate('/dashboard/my-packages');
      }
    } catch (error) {
      console.error('[debug] EditPackage - 更新套餐错误:', error);
      alert('更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getBackNavigationPath = () => {
    if (userRole === 'admin') {
      return '/admin/packages';
    } else if (userRole === 'reviewer') {
      return '/admin/packages';
    } else {
      return '/dashboard/my-packages';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(getBackNavigationPath())}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">编辑旅行套餐</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                套餐标题 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出发地 *
              </label>
              <input
                type="text"
                value={formData.departure}
                onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目的地 *
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
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
                简要描述 *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">封面图片</h2>
          
          {formData.currentImage && (
            <div className="mb-4">
              <img
                src={formData.currentImage}
                alt="当前封面"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#F52E6B] hover:text-[#FE6587] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#F52E6B]">
                  <span>上传新图片</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormData({ ...formData, coverImage: e.target.files[0] });
                      }
                    }}
                  />
                </label>
                <p className="pl-1">或拖放图片到此处</p>
              </div>
              <p className="text-xs text-gray-500">
                建议尺寸 1080x720，大小 ≤ 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">图文详情</h2>
          <Editor
            content={editorContent}
            onChange={setEditorContent}
            onImageUpload={handleImageUpload}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(getBackNavigationPath())}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 flex items-center"
          >
            {submitting ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                保存中...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                保存修改
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}