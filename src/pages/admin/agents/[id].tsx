import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, User, Phone, Calendar, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth';
import { PageHeader } from '../../../components/admin/PageHeader';
import { getSignedFile } from '@/utils/file';

interface AgentApplication {
  id: string;
  user_id: string;
  company_name: string;
  contact_person: string;
  contact_phone: string;
  license_image: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  review_reason?: string;
  agency_id?: string;
}

export function AgentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<AgentApplication | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'reviewer' | null>(null);
  const [licenseUrls, setLicenseUrls] = useState<string[]>([]);
  const [imageLoadErrors, setImageLoadErrors] = useState<boolean[]>([]);

  useEffect(() => {
    console.log('[debug] AgentDetail - 当前用户ID:', user?.id);
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
    fetchApplication();
  }, [user, id, navigate]);

  async function checkAccess() {
    try {
      console.log('[debug] AgentDetail - 开始检查权限, 用户ID:', user?.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] AgentDetail - 查询结果:', profile, '错误:', error);

      if (error) throw error;

      if (profile?.user_role !== 'admin' && profile?.user_role !== 'reviewer') {
        console.warn('[debug] AgentDetail - 用户不是审核员，跳转到首页');
        navigate('/');
      } else {
        console.log('[debug] AgentDetail - 设置用户角色:', profile.user_role);
        setUserRole(profile.user_role as 'admin' | 'reviewer');
      }
    } catch (error) {
      console.error('[debug] AgentDetail - 检查权限出错:', error);
      navigate('/');
    }
  }

  async function fetchApplication() {
    try {
      console.log('[debug] AgentDetail - 开始获取申请详情, ID:', id);
      const { data, error } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('id', id)
        .single();

      console.log('[debug] AgentDetail - 查询结果:', data, '错误:', error);

      if (error) throw error;
      setApplication(data);
      
      // 如果有license_image，处理图片
      if (data?.license_image) {
        await processLicenseImages(data.license_image);
      }
    } catch (error) {
      console.error('[debug] AgentDetail - 获取申请详情错误:', error);
      navigate('/admin/agents');
    } finally {
      setLoading(false);
    }
  }

  async function processLicenseImages(licenseImageStr: string) {
    try {
      // 处理逗号分隔的多个图片路径
      const imagePaths = licenseImageStr.split(',').map(path => path.trim()).filter(Boolean);
      console.log('[debug] 图片路径列表:', imagePaths);
      
      const urls = [];
      for (const path of imagePaths) {
        try {
          // 直接使用路径获取签名URL
          const signedUrl = await getSignedFile('licenses', path);
          if (signedUrl) {
            urls.push(signedUrl);
          }
        } catch (err) {
          console.error(`获取图片 ${path} 签名URL失败:`, err);
        }
      }
      
      console.log('[debug] 获取到的签名URL:', urls.length);
      setLicenseUrls(urls);
      setImageLoadErrors(new Array(urls.length).fill(false));
    } catch (error) {
      console.error('处理营业执照图片错误:', error);
    }
  }

  async function handleApprove() {
    if (!application) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('[debug] AgentDetail - 开始审批申请, 用户角色:', userRole);
      if (userRole === 'admin') {
        // Admin can use the RPC function
        const { error: transactionError } = await supabase.rpc('approve_agent_application', {
          application_id: application.id,
          user_id: application.user_id,
          review_note: reviewReason || '审核通过'
        });

        console.log('[debug] AgentDetail - RPC调用结果, 错误:', transactionError);
        if (transactionError) throw transactionError;
      } else {
        // Reviewer needs to update the application status directly
        console.log('[debug] AgentDetail - 审核员直接更新申请状态');
        const { error: updateError } = await supabase
          .from('agent_applications')
          .update({
            status: 'approved',
            review_reason: reviewReason || '审核通过'
          })
          .eq('id', application.id);

        console.log('[debug] AgentDetail - 更新申请状态结果, 错误:', updateError);
        if (updateError) throw updateError;

        // Update user role to agent
        console.log('[debug] AgentDetail - 更新用户角色为agent');
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            user_role: 'agent',
            agency_id: application.agency_id
          })
          .eq('id', application.user_id);

        console.log('[debug] AgentDetail - 更新用户角色结果, 错误:', profileError);
        if (profileError) throw profileError;
      }

      // Send notification
      console.log('[debug] AgentDetail - 发送通知');
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: application.user_id,
          content: `🎉 恭喜，您的旅行社申请已通过审核！您的旅行社ID为：${application.agency_id}。现在您可以发布和管理旅行套餐了。`,
          type: 'system'
        });

      console.log('[debug] AgentDetail - 发送通知结果, 错误:', messageError);
      if (messageError) {
        console.error('Error sending notification:', messageError);
      }

      // Update local state
      setApplication(prev => prev ? { ...prev, status: 'approved' } : null);
      setSuccess('申请已通过审核');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/admin/agents');
      }, 1000);
    } catch (error) {
      console.error('[debug] AgentDetail - 审批申请错误:', error);
      setError('审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!application || !reviewReason) {
      setError('请填写拒绝理由');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('[debug] AgentDetail - 开始拒绝申请');
      const { error } = await supabase
        .from('agent_applications')
        .update({
          status: 'rejected',
          review_reason: reviewReason
        })
        .eq('id', application.id);

      console.log('[debug] AgentDetail - 拒绝申请结果, 错误:', error);
      if (error) throw error;

      // Send notification
      console.log('[debug] AgentDetail - 发送拒绝通知');
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: application.user_id,
          content: `很抱歉，您的旅行社申请未通过审核。\n\n原因：${reviewReason}`,
          type: 'system'
        });

      console.log('[debug] AgentDetail - 发送拒绝通知结果, 错误:', messageError);
      if (messageError) {
        console.error('Error sending notification:', messageError);
      }

      // Update local state
      setApplication(prev => prev ? { ...prev, status: 'rejected' } : null);
      setSuccess('申请已被拒绝');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/admin/agents');
      }, 1000);
    } catch (error) {
      console.error('[debug] AgentDetail - 拒绝申请错误:', error);
      setError('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  const handleImageError = (index: number) => {
    const newErrors = [...imageLoadErrors];
    newErrors[index] = true;
    setImageLoadErrors(newErrors);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">申请不存在</h2>
          <button
            onClick={() => navigate('/admin/agents')}
            className="text-[#F52E6B] hover:text-[#FE6587]"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader 
        title="申请详情"
        subtitle="审核旅行社入驻申请"
      />

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded relative">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                公司名称
              </label>
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">{application?.company_name}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系人
              </label>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">{application?.contact_person}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系电话
              </label>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">{application?.contact_phone}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申请时间
              </label>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {application?.created_at && new Date(application.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {application.agency_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  旅行社ID
                </label>
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900 font-medium">{application.agency_id}</span>
                </div>
              </div>
            )}
          </div>

          {/* License Images */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              营业执照
            </label>
            <div className="grid grid-cols-2 gap-4">
              {licenseUrls.length > 0 ? (
                licenseUrls.map((imageUrl, index) => (
                  <div 
                    key={index}
                    className="relative cursor-pointer"
                    onClick={() => setSelectedImage(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`营业执照 ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={() => handleImageError(index)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity rounded-lg">
                      <span className="text-white opacity-0 hover:opacity-100">
                        点击查看大图
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">暂无营业执照图片或图片加载失败</p>
                </div>
              )}
            </div>
          </div>

          {/* Review Section */}
          {application?.status === 'pending' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">审核操作</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  审核意见
                </label>
                <textarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  placeholder="请输入审核意见..."
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleReject}
                  disabled={submitting || !reviewReason}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50"
                >
                  拒绝
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
                >
                  通过
                </button>
              </div>
            </div>
          )}

          {/* Review Result */}
          {application?.status !== 'pending' && application?.review_reason && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">审核结果</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{application.review_reason}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl mx-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="营业执照"
              className="rounded-lg max-h-[90vh] w-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}