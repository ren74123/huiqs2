import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Image, 
  Edit, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff,
  ExternalLink,
  Loader,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';

interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  banner_type: string;
}

export function AdminBanners() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    is_active: true,
    banner_type: 'travel' // Default to travel banner
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerTypeFilter, setBannerTypeFilter] = useState<'all' | 'travel' | 'enterprise'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchBanners();
  }, [user, navigate, bannerTypeFilter]);

  async function checkAdminAccess() {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile?.user_role !== 'admin') {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  }

  async function fetchBanners() {
    try {
      setLoading(true);
      let query = supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });

      if (bannerTypeFilter !== 'all') {
        query = query.eq('banner_type', bannerTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过2MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let imageUrl = formData.image_url;

      // Upload image if a new one is selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('package-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('package-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const bannerData = {
        title: formData.title,
        description: formData.description || null,
        image_url: imageUrl,
        link_url: formData.link_url || null,
        is_active: formData.is_active,
        banner_type: formData.banner_type,
        sort_order: currentBanner ? currentBanner.sort_order : banners.length
      };

      if (currentBanner) {
        // Update existing banner
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', currentBanner.id);

        if (error) throw error;
      } else {
        // Create new banner
        const { error } = await supabase
          .from('banners')
          .insert([bannerData]);

        if (error) throw error;
      }

      // Reset form and refresh data
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      setError('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setCurrentBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || '',
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      is_active: banner.is_active,
      banner_type: banner.banner_type || 'travel'
    });
    setImagePreview(banner.image_url);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此横幅吗？此操作不可撤销。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('删除失败，请重试');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error('Error toggling banner status:', error);
      alert('操作失败，请重试');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(banner => banner.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === banners.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetBanner = banners[targetIndex];

    try {
      // Swap sort_order values
      const { error: error1 } = await supabase
        .from('banners')
        .update({ sort_order: targetBanner.sort_order })
        .eq('id', id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('banners')
        .update({ sort_order: banners[currentIndex].sort_order })
        .eq('id', targetBanner.id);

      if (error2) throw error2;

      fetchBanners();
    } catch (error) {
      console.error('Error reordering banners:', error);
      alert('操作失败，请重试');
    }
  };

  const resetForm = () => {
    setCurrentBanner(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      is_active: true,
      banner_type: 'travel'
    });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader 
        title="横幅管理"
        subtitle="管理首页顶部横幅展示"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            添加横幅
          </button>
        }
      />

      {/* Banner Type Filter */}
      <div className="mb-6 flex space-x-2">
        {['all', 'travel', 'enterprise'].map((type) => (
          <button
            key={type}
            onClick={() => setBannerTypeFilter(type as any)}
            className={`px-4 py-2 rounded-lg ${
              bannerTypeFilter === type
                ? 'bg-[#F52E6B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? '全部' :
             type === 'travel' ? '旅行横幅' : '企业团建横幅'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {banners.length === 0 ? (
          <div className="text-center py-12">
            <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无横幅</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
            >
              添加横幅
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图片
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    排序
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-16 w-28 rounded overflow-hidden">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {banner.title}
                      </div>
                      {banner.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {banner.description}
                        </div>
                      )}
                      {banner.link_url && (
                        <div className="text-xs text-blue-500 mt-1 flex items-center">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {banner.link_url}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        banner.banner_type === 'enterprise' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-pink-100 text-pink-800'
                      }`}>
                        {banner.banner_type === 'enterprise' ? '企业团建' : '旅行'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        banner.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {banner.is_active ? '已启用' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReorder(banner.id, 'up')}
                          disabled={banners.indexOf(banner) === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReorder(banner.id, 'down')}
                          disabled={banners.indexOf(banner) === banners.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-gray-500">{banner.sort_order}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(banner.id, banner.is_active)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={banner.is_active ? '禁用' : '启用'}
                        >
                          {banner.is_active ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(banner)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="编辑"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="删除"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Banner Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {currentBanner ? '编辑横幅' : '添加横幅'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题 *
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
                  描述文字
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  横幅类型 *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="banner_type"
                      value="travel"
                      checked={formData.banner_type === 'travel'}
                      onChange={() => setFormData({ ...formData, banner_type: 'travel' })}
                      className="h-4 w-4 text-[#F52E6B] focus:ring-[#F52E6B] border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">旅行横幅</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="banner_type"
                      value="enterprise"
                      checked={formData.banner_type === 'enterprise'}
                      onChange={() => setFormData({ ...formData, banner_type: 'enterprise' })}
                      className="h-4 w-4 text-[#F52E6B] focus:ring-[#F52E6B] border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">企业团建横幅</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  横幅图片 *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <Image className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#F52E6B] hover:text-[#FE6587] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#F52E6B]">
                        <span>上传图片</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                      <p className="pl-1">或拖放图片到此处</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      推荐尺寸 1200x675，图片比例 16:9，JPG/PNG 格式，文件小于 2MB
                    </p>
                  </div>
                </div>
                
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="预览"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  跳转链接
                </label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  placeholder="例如: /packages 或 https://example.com"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-[#F52E6B] focus:ring-[#F52E6B] border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  启用此横幅
                </label>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!imageFile && !formData.image_url)}
                  className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      保存中...
                    </>
                  ) : (
                    '保存'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}