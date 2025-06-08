import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Building2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';
import { DatePicker } from '../../components/DatePicker';

interface AgentApplication {
  id: string;
  user_id: string;
  company_name: string;
  license_image: string;
  contact_person: string;
  contact_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  review_reason?: string;
  agency_id?: string;
  user: {
    full_name: string;
    phone: string;
  };
}

export function AdminApplications() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AgentApplication | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchApplications();
  }, [user, navigate, statusFilter, dateRange]);

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

  async function fetchApplications() {
    try {
      setError(null);
      let query = supabase
        .from('agent_applications')
        .select(`
          *,
          user:profiles!agent_applications_user_id_fkey (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateRange.start && dateRange.end) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('获取申请列表失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(applicationId: string, newStatus: 'approved' | 'rejected') {
    if (!selectedApplication) return;
    
    if (newStatus === 'rejected' && !reviewNote.trim()) {
      setError('拒绝时必须填写审核备注');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      if (newStatus === 'approved') {
        // Use RPC function for approval
        const { error: rpcError } = await supabase.rpc('approve_agent_application', {
          application_id: applicationId,
          user_id: selectedApplication.user_id,
          review_note: reviewNote || '审核通过'
        });

        if (rpcError) throw rpcError;
      } else {
        // Regular update for rejection
        const { error: updateError } = await supabase
          .from('agent_applications')
          .update({ 
            status: newStatus,
            review_reason: reviewNote 
          })
          .eq('id', applicationId);

        if (updateError) throw updateError;
      }

      // Send notification
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: selectedApplication.user_id,
          content: newStatus === 'approved' 
            ? `🎉 恭喜，您的旅行社申请已通过审核！您的旅行社ID为：${selectedApplication.agency_id}。现在您可以发布和管理旅行套餐了。`
            : `很抱歉，您的旅行社申请未通过审核。\n\n原因：${reviewNote}`,
          type: 'system'
        });

      if (messageError) {
        console.error('Error sending notification:', messageError);
      }

      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
      
      setSuccess(newStatus === 'approved' ? '申请已通过审核' : '申请已被拒绝');
      setShowReviewModal(false);
      setSelectedApplication(null);
      setReviewNote('');
      
      // Refresh the list after a short delay
      setTimeout(() => {
        fetchApplications();
      }, 1000);
    } catch (error) {
      console.error('Error updating application status:', error);
      setError('操作失败，请重试');
    }
  }

  const handleImageError = () => {
    setImageError(true);
  };

  const filteredApplications = applications.filter(app => 
    app.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.contact_phone.includes(searchTerm) ||
    (app.agency_id && app.agency_id.includes(searchTerm))
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader 
        title="旅行社申请管理"
        subtitle="审核旅行社入驻申请"
      />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded relative">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索公司名称、联系人、电话或旅行社ID..."
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-4 flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-5 w-5 mr-2" />
              筛选
            </button>
          </div>

          <div className={`mt-4 space-y-4 ${showFilters ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  申请时间范围
                </label>
                <div className="flex space-x-2">
                  <DatePicker
                    value={dateRange.start}
                    onChange={(date) => setDateRange({ ...dateRange, start: date })}
                    placeholder="开始日期"
                  />
                  <DatePicker
                    value={dateRange.end}
                    onChange={(date) => setDateRange({ ...dateRange, end: date })}
                    placeholder="结束日期"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  审核状态
                </label>
                <div className="flex space-x-2">
                  {['all', 'pending', 'approved', 'rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status as any)}
                      className={`px-4 py-2 rounded-lg ${
                        statusFilter === status
                          ? 'bg-[#F52E6B] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? '全部' :
                       status === 'pending' ? '待审核' :
                       status === 'approved' ? '已通过' : '已拒绝'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-48">
                  <img
                    src={app.license_image?.split(',')[0] || ''}
                    alt={app.company_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => {
                      setSelectedApplication(app);
                      setShowImageModal(true);
                    }}
                    onError={handleImageError}
                  />
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStatusBadgeClass(app.status)
                    }`}>
                      {app.status === 'approved' ? '已通过' :
                       app.status === 'rejected' ? '已拒绝' : '待审核'}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {app.company_name}
                    </h3>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>联系人：{app.contact_person}</p>
                      <p>电话：{app.contact_phone}</p>
                      <p>申请时间：{new Date(app.created_at).toLocaleDateString()}</p>
                      {app.agency_id && (
                        <p className="font-medium text-gray-700">旅行社ID：{app.agency_id}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    {app.status === 'pending' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedApplication(app);
                            setReviewNote('');
                            setShowReviewModal(true);
                          }}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          拒绝
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApplication(app);
                            setReviewNote('');
                            setShowReviewModal(true);
                          }}
                          className="px-3 py-1 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] transition-colors"
                        >
                          通过
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/admin/agents/${app.id}`)}
                        className="text-[#F52E6B] hover:text-[#FE6587] text-sm"
                      >
                        查看详情
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredApplications.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无符合条件的申请</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">审核申请</h2>
              <p className="mt-1 text-sm text-gray-500">{selectedApplication.company_name}</p>
              {selectedApplication.agency_id && (
                <p className="mt-1 text-sm font-medium text-gray-700">旅行社ID：{selectedApplication.agency_id}</p>
              )}
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900">{selectedApplication.company_name}</h3>
                <div className="mt-1 text-sm text-gray-500">
                  <p>联系人：{selectedApplication.contact_person}</p>
                  <p>电话：{selectedApplication.contact_phone}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  审核备注 {selectedApplication.status === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  placeholder="请输入审核意见..."
                />
                {selectedApplication.status === 'rejected' && !reviewNote && (
                  <p className="mt-1 text-sm text-red-500">拒绝时必须填写审核备注</p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedApplication(null);
                  setReviewNote('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => handleStatusChange(selectedApplication.id, 'rejected')}
                disabled={selectedApplication.status === 'rejected' && !reviewNote}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                拒绝
              </button>
              <button
                onClick={() => handleStatusChange(selectedApplication.id, 'approved')}
                className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              >
                通过
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedApplication && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl mx-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            {!imageError ? (
              <img
                src={selectedApplication.license_image?.split(',')[0] || ''}
                alt="营业执照"
                className="rounded-lg"
                onClick={(e) => e.stopPropagation()}
                onError={handleImageError}
              />
            ) : (
              <div className="bg-white p-8 rounded-lg text-center">
                <p className="text-gray-700">图片加载失败</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}