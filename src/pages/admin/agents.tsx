import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';
import { DatePicker } from '../../components/DatePicker';

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

export function AdminAgents() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'reviewer' | null>(null);

  useEffect(() => {
    console.log('[debug] AdminAgents - 当前用户ID:', user?.id);
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user, navigate]);

  useEffect(() => {
    if (userRole) {
      fetchApplications();
    }
  }, [userRole, statusFilter, dateRange]);

  async function checkAccess() {
    try {
      console.log('[debug] AdminAgents - 开始检查权限, 用户ID:', user?.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] AdminAgents - 查询结果:', profile, '错误:', error);

      if (error) {
        console.error('[debug] AdminAgents - 检查权限错误:', error);
        navigate('/');
        return;
      }

      if (profile?.user_role !== 'admin' && profile?.user_role !== 'reviewer') {
        console.warn('[debug] AdminAgents - 用户无权限，跳转到首页');
        navigate('/');
        return;
      }
      
      console.log('[debug] AdminAgents - 设置用户角色:', profile.user_role);
      setUserRole(profile.user_role as 'admin' | 'reviewer');
    } catch (error) {
      console.error('[debug] AdminAgents - 检查权限出错:', error);
      navigate('/');
    }
  }

  async function fetchApplications() {
    try {
      setError(null);
      let query = supabase
        .from('agent_applications')
        .select('*')
        .order('created_at', { ascending: false });

      // If user is reviewer, they can only see pending applications
      if (userRole === 'reviewer') {
        query = query.eq('status', 'pending');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateRange.start && dateRange.end) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      if (!data) {
        throw new Error('No data received from the server');
      }

      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredApplications = applications.filter(app => 
    app.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.contact_phone.includes(searchTerm)
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
        title="旅行社申请管理"
        subtitle="审核旅行社入驻申请"
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
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
                  placeholder="搜索公司名称..."
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-4 flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-5 w-5 mr-2" />筛选
            </button>
          </div>

          <div className={`mt-4 space-y-4 ${showFilters ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">提交时间范围</label>
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

              {userRole === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">审核状态</label>
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
              )}
            </div>
          </div>

          {userRole === 'reviewer' && (
            <div className="mt-4 bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-700 text-sm">
                审核员只能查看和管理待审核的旅行社申请
              </p>
            </div>
          )}
        </div>

        {/* Applications Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公司名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">电话</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{app.company_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.contact_person}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{app.contact_phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(app.status)}`}>
                      {app.status === 'approved' ? '已通过' :
                        app.status === 'rejected' ? '已拒绝' : '待审核'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(app.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/admin/agents/${app.id}`)}
                      className="text-[#F52E6B] hover:text-[#FE6587] mr-4"
                    >
                      查看
                    </button>
                    {app.status === 'pending' && (
                      <button
                        onClick={() => navigate(`/admin/agents/${app.id}`)}
                        className="text-[#F52E6B] hover:text-[#FE6587]"
                      >
                        审核
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredApplications.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无符合条件的申请</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}