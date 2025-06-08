import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Edit, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff,
  ExternalLink,
  Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';

interface Destination {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export function AdminDestinations() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentDestination, setCurrentDestination] = useState<Destination | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    link_url: '',
    is_active: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchDestinations();
  }, [user, navigate]);

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

  async function fetchDestinations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('popular_destinations')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
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
        const filePath = `destinations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('package-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('package-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const destinationData = {
        name: formData.name,
        description: formData.description || null,
        image_url: imageUrl,
        link_url: formData.link_url || null,
        is_active: formData.is_active,
        sort_order: currentDestination ? currentDestination.sort_order : destinations.length
      };

      if (currentDestination) {
        // Update existing destination
        const { error } = await supabase
          .from('popular_destinations')
          .update(destinationData)
          .eq('id', currentDestination.id);

        if (error) throw error;
      } else {
        // Create new destination
        const { error } = await supabase
          .from('popular_destinations')
          .insert([destinationData]);

        if (error) throw error;
      }

      // Reset form and refresh data
      resetForm();
      fetchDestinations();
    } catch (error) {
      console.error('Error saving destination:', error);
      setError('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (destination: Destination) => {
    setCurrentDestination(destination);
    setFormData({
      name: destination.name,
      description: destination.description || '',
      image_url: destination.image_url,
      link_url: destination.link_url || '',
      is_active: destination.is_active
    });
    setImagePreview(destination.image_url);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此目的地吗？此操作不可撤销。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('popular_destinations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDestinations();
    } catch (error) {
      console.error('Error deleting destination:', error);
      alert('删除失败，请重试');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('popular_destinations')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      fetchDestinations();
    } catch (error) {
      console.error('Error toggling destination status:', error);
      alert('操作失败，请重试');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = destinations.findIndex(destination => destination.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === destinations.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetDestination = destinations[targetIndex];

    try {
      // Swap sort_order values
      const { error: error1 } = await supabase
        .from('popular_destinations')
        .update({ sort_order: targetDestination.sort_order })
        .eq('id', id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('popular_destinations')
        .update({ sort_order: destinations[currentIndex].sort_order })
        .eq('id', targetDestination.id);

      if (error2) throw error2;

      fetchDestinations();
    } catch (error) {
      console.error('Error reordering destinations:', error);
      alert('操作失败，请重试');
    }
  };

  const resetForm = () => {
    setCurrentDestination(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      link_url: '',
      is_active: true
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
        title="热门目的地管理"
        subtitle="管理首页热门目的地展示"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            添加目的地
          </button>
        }
      />

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {destinations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无热门目的地</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
            >
              添加目的地
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
                    目的地
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
                {destinations.map((destination) => (
                  <tr key={destination.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-16 w-28 rounded overflow-hidden">
                        <img
                          src={destination.image_url}
                          alt={destination.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {destination.name}
                      </div>
                      {destination.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {destination.description}
                        </div>
                      )}
                      {destination.link_url && (
                        <div className="text-xs text-blue-500 mt-1 flex items-center">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {destination.link_url}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        destination.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {destination.is_active ? '已启用' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReorder(destination.id, 'up')}
                          disabled={destinations.indexOf(destination) === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReorder(destination.id, 'down')}
                          disabled={destinations.indexOf(destination) === destinations.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-gray-500">{destination.sort_order}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(destination.id, destination.is_active)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={destination.is_active ? '禁用' : '启用'}
                        >
                          {destination.is_active ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(destination)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="编辑"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(destination.id)}
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

      {/* Destination Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {currentDestination ? '编辑目的地' : '添加目的地'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目的地名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  required
                  maxLength={15}
                />
                <p className="mt-1 text-xs text-gray-500">
                  最多15个字符 ({formData.name.length}/15)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  简要介绍
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-gray-500">
                  最多200个字符 ({formData.description.length}/200)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  封面图片 *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <MapPin className="mx-auto h-12 w-12 text-gray-400" />
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
                      推荐尺寸 800x450，图片比例 16:9，JPG/PNG 格式，文件小于 2MB
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
                  启用此目的地
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