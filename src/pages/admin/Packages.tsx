import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, Calendar, Package, Edit, Trash2, MapPin, Clock, AlertCircle, User, Star, Tag, Globe, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';
import { DatePicker } from '../../components/DatePicker';

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
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  created_at: string;
  expire_at?: string;
  agent_id: string;
  is_discounted: boolean;
  original_price?: number;
  discount_price?: number;
  discount_expires_at?: string;
  is_international: boolean;
  agent: {
    full_name: string;
    agency_id?: string;
  };
}

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: 'approved' | 'rejected', note: string) => void;
  packageTitle: string;
  hasExistingPackage?: boolean;
}

function ReviewDialog({ isOpen, onClose, onConfirm, packageTitle, hasExistingPackage }: ReviewDialogProps) {
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (status === 'rejected' && (!note || note.trim() === '')) {
      setError('拒绝时必须填写审核备注');
      return;
    }
    if (status === 'approved' && hasExistingPackage) {
      setError('该旅行社已有一个已通过的套餐，请先拒绝现有套餐');
      return;
    }
    setError(null);
    onConfirm(status, note);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">审核套餐</h2>
          <p className="mt-1 text-sm text-gray-500">{packageTitle}</p>
          {hasExistingPackage && (
            <p className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              提示：该旅行社已有一个已通过的套餐
            </p>
          )}
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                审核结果
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setStatus('approved')}
                  className={`px-4 py-2 rounded-lg ${
                    status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  通过
                </button>
                <button
                  onClick={() => setStatus('rejected')}
                  className={`px-4 py-2 rounded-lg ${
                    status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  拒绝
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                审核备注 {status === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className={`w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent`}
                placeholder="请输入审核意见..."
              />
              {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-white ${
              status === 'approved'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPackages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'archived'>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [hasExistingPackage, setHasExistingPackage] = useState(false);
  const [maxPackagesPerAgent, setMaxPackagesPerAgent] = useState(5);
  const [userRole, setUserRole] = useState<'admin' | 'reviewer' | null>(null);

  useEffect(() => {
    console.log('[debug] AdminPackages - 当前用户ID:', user?.id);
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
    fetchSystemSettings();
    
    // Check URL params for status filter
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam && ['all', 'pending', 'approved', 'rejected', 'archived'].includes(statusParam)) {
      setStatusFilter(statusParam as any);
    }
  }, [user, navigate, location.search]);

  useEffect(() => {
    console.log('[debug] AdminPackages - userRole变化:', userRole);
    if (userRole) {
      fetchPackages();
    }
  }, [userRole, statusFilter, dateRange]);

  async function checkAccess() {
    try {
      console.log('[debug] AdminPackages - 开始检查权限, 用户ID:', user?.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] AdminPackages - 查询结果:', profile, '错误:', error);

      if (error) {
        console.error('[debug] AdminPackages - 检查权限错误:', error);
        setError('无法验证管理员权限，请重新登录');
        navigate('/auth');
        return;
      }

      if (!['admin', 'reviewer'].includes(profile?.user_role)) {
        console.warn('[debug] AdminPackages - 用户无权限，跳转到首页');
        navigate('/');
        return;
      }
      
      console.log('[debug] AdminPackages - 设置用户角色:', profile.user_role);
      setUserRole(profile.user_role as 'admin' | 'reviewer');
    } catch (error) {
      console.error('[debug] AdminPackages - 检查权限出错:', error);
      setError('无法验证管理员权限，请重新登录');
      navigate('/auth');
    }
  }

  async function fetchSystemSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('max_travel_packages_per_agent')
        .single();
      
      if (error) throw error;
      
      if (data && data.max_travel_packages_per_agent) {
        setMaxPackagesPerAgent(data.max_travel_packages_per_agent);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  }

  async function fetchPackages() {
    try {
      console.log('[debug] AdminPackages - 开始获取套餐列表, 用户角色:', userRole);
      setLoading(true);
      setError(null);
      let query = supabase
        .from('travel_packages')
        .select(`
          *,
          agent:profiles!travel_packages_agent_id_fkey(full_name, agency_id)
        `)
        .order('created_at', { ascending: false });

      // If user is reviewer, they can only see pending packages
      if (userRole === 'reviewer') {
        console.log('[debug] AdminPackages - 审核员只能看到待审核套餐');
        query = query.eq('status', 'pending');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateRange.start && dateRange.end) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data, error } = await query;

      console.log('[debug] AdminPackages - 查询结果:', data?.length || 0, '个套餐, 错误:', error);

      if (error) {
        throw error;
      }

      // Check for expired packages and update their status if needed
      const updatedPackages = await Promise.all((data || []).map(async (pkg) => {
        // Check if package is expired but not yet marked as archived
        if (pkg.status === 'approved' && pkg.expire_at && new Date(pkg.expire_at) < new Date() && pkg.status !== 'archived') {
          // Update the package status to archived in the database
          const { error: updateError } = await supabase
            .from('travel_packages')
            .update({ status: 'archived' })
            .eq('id', pkg.id);
            
          if (updateError) {
            console.error('Error updating expired package:', updateError);
            return pkg;
          }
          
          // Return the updated package with archived status
          return { ...pkg, status: 'archived' };
        }
        
        // Check if discount has expired
        if (pkg.is_discounted && pkg.discount_expires_at && new Date(pkg.discount_expires_at) < new Date()) {
          // Update the package to remove discount
          const { error: updateError } = await supabase
            .from('travel_packages')
            .update({ 
              is_discounted: false,
              price: pkg.original_price
            })
            .eq('id', pkg.id);
            
          if (updateError) {
            console.error('Error updating expired discount:', updateError);
            return pkg;
          }
          
          // Return the updated package with discount removed
          return { 
            ...pkg, 
            is_discounted: false,
            price: pkg.original_price
          };
        }
        
        return pkg;
      }));

      setPackages(updatedPackages);
    } catch (error: any) {
      console.error('[debug] AdminPackages - 获取套餐列表错误:', error);
      
      // Provide user-friendly error message based on error type
      let errorMessage = '获取套餐列表失败';
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = '网络连接失败，请检查网络连接并重试';
      } else if (error.message?.includes('CORS')) {
        errorMessage = '跨域请求失败，请联系系统管理员';
      } else if (error.code === 'PGRST301') {
        errorMessage = '数据库连接失败，请稍后重试';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const checkExistingPackage = async (agentId: string) => {
    const { data, error } = await supabase
      .from('travel_packages')
      .select('id')
      .eq('agent_id', agentId)
      .eq('status', 'approved')
      .limit(maxPackagesPerAgent);

    if (error) {
      console.error('Error checking existing package:', error);
      return false;
    }

    return data && data.length >= maxPackagesPerAgent;
  };

  const handleReview = async (pkg: TravelPackage) => {
    const hasExisting = await checkExistingPackage(pkg.agent_id);
    setHasExistingPackage(hasExisting);
    setSelectedPackage(pkg);
    setShowReviewDialog(true);
    setReviewError(null);
  };

  const handleReviewConfirm = async (status: 'approved' | 'rejected', note: string) => {
    if (!selectedPackage) return;
    
    if (status === 'rejected' && (!note || note.trim() === '')) {
      setReviewError('拒绝时必须填写审核备注');
      return;
    }

    try {
      if (status === 'approved') {
        const hasExisting = await checkExistingPackage(selectedPackage.agent_id);
        if (hasExisting) {
          setReviewError(`该旅行社已有${maxPackagesPerAgent}个已通过的套餐，请先拒绝现有套餐`);
          return;
        }
      }

      console.log('[debug] AdminPackages - 提交审核结果:', status, note);
      const { error } = await supabase
        .from('travel_packages')
        .update({
          status,
          review_note: note
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      setPackages(packages.map(pkg =>
        pkg.id === selectedPackage.id
          ? { ...pkg, status, review_note: note }
          : pkg
      ));

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: selectedPackage.agent_id,
          content: `您的旅行套餐"${selectedPackage.title}"已${status === 'approved' ? '通过' : '被拒绝'}审核。${note ? `\n\n审核意见：${note}` : ''}`,
          type: 'system'
        });

      if (messageError) {
        console.error('Error sending notification:', messageError);
      }

      setShowReviewDialog(false);
      setSelectedPackage(null);
      
      // Refresh packages after review
      fetchPackages();
    } catch (error) {
      console.error('[debug] AdminPackages - 审核失败:', error);
      alert('审核失败，请重试');
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!window.confirm('确定要删除此套餐吗？此操作不可撤销。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('travel_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
      setPackages(packages.filter(pkg => pkg.id !== packageId));
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('删除失败，请重试');
    }
  };

  const filteredPackages = packages.filter(pkg => 
    pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.agent?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pkg.agent?.agency_id && pkg.agent.agency_id.includes(searchTerm))
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Check if a package is expired
  const isExpired = (pkg: TravelPackage) => {
    if (!pkg.expire_at) return false;
    return new Date(pkg.expire_at) < new Date();
  };

  // Check if a package is still in discount period
  const isDiscountActive = (pkg: TravelPackage) => {
    return pkg.is_discounted && 
           pkg.discount_expires_at && 
           new Date(pkg.discount_expires_at) > new Date();
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
        title="套餐管理"
        subtitle="管理旅行套餐产品"
      />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800">出错了</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchPackages();
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
            >
              重试
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {userRole === 'admin' && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索套餐名称、旅行社或旅行社ID..."
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
                    创建时间范围
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
                  <div className="flex flex-wrap gap-2">
                    {['all', 'pending', 'approved', 'rejected', 'archived'].map((status) => (
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
                         status === 'approved' ? '已通过' : 
                         status === 'archived' ? '已下架' : '已拒绝'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {userRole === 'reviewer' && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索套餐名称、旅行社..."
                    className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-700 text-sm">
                审核员只能查看和管理待审核的套餐
              </p>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-48">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStatusBadgeClass(pkg.status)
                    }`}>
                      {pkg.status === 'approved' ? '已通过' :
                       pkg.status === 'rejected' ? '已拒绝' :
                       pkg.status === 'archived' ? '已下架' : '待审核'}
                    </span>
                  </div>
                  
                  {/* Discount badge */}
                  {isDiscountActive(pkg) && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-lg text-xs">
                      限时特价
                    </div>
                  )}
                  
                  {/* International badge */}
                  {pkg.is_international && (
                    <div className="absolute top-4 left-4 bg-blue-500 text-white px-2 py-1 rounded-lg text-xs">
                      境外游
                    </div>
                  )}
                  
                  {/* Expired badge */}
                  {isExpired(pkg) && pkg.status === 'approved' && (
                    <div className="absolute top-4 left-4 bg-gray-500 text-white px-2 py-1 rounded-lg text-xs">
                      已过期
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {pkg.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {pkg.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-500 text-sm">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{pkg.departure || '未设置'} → {pkg.destination}</span>
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{pkg.duration} 天</span>
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <User className="h-4 w-4 mr-2" />
                      <span>
                        {pkg.agent?.full_name || '未知旅行社'}
                        {pkg.agent?.agency_id && ` (ID: ${pkg.agent.agency_id})`}
                      </span>
                    </div>
                    {pkg.expire_at && (
                      <div className="flex items-center text-gray-500 text-sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>下架时间: {new Date(pkg.expire_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {pkg.status === 'archived' && (
                      <div className="flex items-center text-gray-500 text-sm">
                        <Archive className="h-4 w-4 mr-2" />
                        <span>已下架</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#F52E6B] font-semibold">
                      {isDiscountActive(pkg) ? (
                        <div className="flex items-center">
                          <span className="text-gray-400 line-through text-xs mr-1">¥{pkg.original_price}</span>
                          <span>¥{pkg.discount_price}</span>
                        </div>
                      ) : (
                        `¥${pkg.price}`
                      )}
                    </span>
                    <div className="flex space-x-2">
                      {pkg.status === 'pending' && (
                        <button
                          onClick={() => handleReview(pkg)}
                          className="px-3 py-1 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587]"
                        >
                          审核
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/dashboard/edit/${pkg.id}`)}
                        className="p-2 text-gray-600 hover:text-[#F52E6B] transition-colors"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPackages.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无符合条件的套餐</p>
            </div>
          )}
        </div>
      </div>

      {showReviewDialog && selectedPackage && (
        <ReviewDialog
          isOpen={showReviewDialog}
          onClose={() => {
            setShowReviewDialog(false);
            setSelectedPackage(null);
          }}
          onConfirm={handleReviewConfirm}
          packageTitle={selectedPackage.title}
          hasExistingPackage={hasExistingPackage}
        />
      )}
    </div>
  );
}