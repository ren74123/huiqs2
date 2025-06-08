import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Coins, Download, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';
import { DatePicker } from '../../components/DatePicker';

interface InfoFeeLog {
  id: string;
  order_id: string;
  agent_id: string;
  amount: number;
  created_at: string;
  remark: string;
  agent: {
    full_name: string;
    agency_id: string;
    phone: string;
    email: string;
  };
  order: {
    id: string;
    order_number: string;
    travel_packages: {
      title: string;
    };
  };
}

interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'consume' | 'purchase';
  amount: number;
  remark: string;
  created_at: string;
  user: {
    full_name: string;
    phone: string;
    email: string;
  };
}

export function InfoFeeRecords() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<InfoFeeLog[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InfoFeeLog[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CreditTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCreditsAmount, setTotalCreditsAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info-fee' | 'credits'>('info-fee');
  const [showRecords, setShowRecords] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchInfoFeeLogs();
    fetchCreditTransactions();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'info-fee') {
      filterLogs();
    } else {
      filterTransactions();
    }
    
    // Show records only when there's a search term or date filter
    setShowRecords(!!searchTerm || !!dateRange.start || !!dateRange.end);
  }, [logs, creditTransactions, searchTerm, dateRange, activeTab]);

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

  async function fetchInfoFeeLogs() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('info_fee_logs')
        .select(`
          *,
          agent:profiles!info_fee_logs_agent_id_fkey (
            full_name,
            agency_id,
            phone,
            email
          ),
          order:orders (
            id,
            order_number,
            travel_packages (
              title
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setLogs(data || []);
      setFilteredLogs(data || []);
      
      // Calculate total amount
      const total = (data || []).reduce((sum, log) => sum + log.amount, 0);
      setTotalAmount(total);
    } catch (error: any) {
      console.error('Error fetching info fee logs:', error);
      setError(error.message || '获取信息费记录失败');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCreditTransactions() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          user:profiles!credit_transactions_user_id_fkey (
            full_name,
            phone,
            email
          )
        `)
        .eq('type', 'purchase')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCreditTransactions(data || []);
      setFilteredTransactions(data || []);
      
      // Calculate total amount (in money, not credits)
      // For credit purchases, we need to calculate the actual money spent
      // Assuming a standard rate of 1 credit = 0.1 yuan
      const total = (data || []).reduce((sum, transaction) => {
        // Estimate the money value based on credit amount
        // This is an approximation - in a real system you'd have the actual payment amount
        const moneyValue = transaction.amount * 0.1; // 10 credits = 1 yuan
        return sum + moneyValue;
      }, 0);
      
      setTotalCreditsAmount(total);
    } catch (error: any) {
      console.error('Error fetching credit transactions:', error);
      setError(error.message || '获取积分充值记录失败');
    } finally {
      setLoading(false);
    }
  }

  function filterLogs() {
    let filtered = [...logs];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.agent?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.agent?.agency_id?.includes(searchTerm) ||
        log.agent?.phone?.includes(searchTerm) ||
        log.agent?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.order?.order_number?.includes(searchTerm) ||
        log.order_id.includes(searchTerm)
      );
    }
    
    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) >= new Date(dateRange.start)
      );
    }
    
    if (dateRange.end) {
      // Add one day to include the end date fully
      const endDate = new Date(dateRange.end);
      endDate.setDate(endDate.getDate() + 1);
      
      filtered = filtered.filter(log => 
        new Date(log.created_at) < endDate
      );
    }
    
    setFilteredLogs(filtered);
    
    // Calculate filtered total
    const filteredTotal = filtered.reduce((sum, log) => sum + log.amount, 0);
    setTotalAmount(filteredTotal);
  }

  function filterTransactions() {
    let filtered = [...creditTransactions];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.user?.phone?.includes(searchTerm) ||
        transaction.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.remark?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.created_at) >= new Date(dateRange.start)
      );
    }
    
    if (dateRange.end) {
      // Add one day to include the end date fully
      const endDate = new Date(dateRange.end);
      endDate.setDate(endDate.getDate() + 1);
      
      filtered = filtered.filter(transaction => 
        new Date(transaction.created_at) < endDate
      );
    }
    
    setFilteredTransactions(filtered);
    
    // Calculate filtered total (in money, not credits)
    const filteredTotal = filtered.reduce((sum, transaction) => {
      // Estimate the money value based on credit amount
      const moneyValue = transaction.amount * 0.1; // 10 credits = 1 yuan
      return sum + moneyValue;
    }, 0);
    
    setTotalCreditsAmount(filteredTotal);
  }

  const handleExportCSV = () => {
    // Create CSV content based on active tab
    const headers = activeTab === 'info-fee' 
      ? ['支付时间', '旅行社', '旅行社ID', '联系方式', '邮箱', '订单号', '金额', '备注']
      : ['支付时间', '用户', '手机号', '邮箱', '金额', '备注'];
    
    const rows = activeTab === 'info-fee'
      ? filteredLogs.map(log => [
          new Date(log.created_at).toLocaleString(),
          log.agent?.full_name || '未知',
          log.agent?.agency_id || '未知',
          log.agent?.phone || '未知',
          log.agent?.email || '未知',
          log.order?.order_number || log.order_id.slice(0, 8),
          log.amount.toFixed(2),
          log.remark
        ])
      : filteredTransactions.map(transaction => [
          new Date(transaction.created_at).toLocaleString(),
          transaction.user?.full_name || '未知',
          transaction.user?.phone || '未知',
          transaction.user?.email || '未知',
          transaction.amount.toString(),
          transaction.remark || ''
        ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', activeTab === 'info-fee' 
      ? `信息费记录_${new Date().toISOString().split('T')[0]}.csv`
      : `积分充值记录_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        title="收入"
        subtitle="查看旅行社支付的信息费和用户充值的积分"
        actions={
          <button
            onClick={handleExportCSV}
            className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            导出CSV
          </button>
        }
      />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex space-x-4">
        <button
          onClick={() => setActiveTab('info-fee')}
          className={`px-4 py-2 rounded-lg flex items-center ${
            activeTab === 'info-fee'
              ? 'bg-[#F52E6B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Coins className="h-4 w-4 mr-2" />
          信息费记录
        </button>
        <button
          onClick={() => setActiveTab('credits')}
          className={`px-4 py-2 rounded-lg flex items-center ${
            activeTab === 'credits'
              ? 'bg-[#F52E6B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          积分充值记录
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Summary Card */}
        <div className="bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] p-6 text-white">
          <div className="flex items-center mb-2">
            <Coins className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-bold">
              {activeTab === 'info-fee' ? '信息费总计' : '积分充值总计'}
            </h2>
          </div>
          <p className="text-3xl font-bold">
            {activeTab === 'info-fee' 
              ? `¥${totalAmount.toFixed(2)}` 
              : `¥${totalCreditsAmount.toFixed(2)}`
            }
          </p>
          <p className="text-sm opacity-80 mt-1">
            {activeTab === 'info-fee' 
              ? `${filteredLogs.length} 条记录` 
              : `${filteredTransactions.length} 条记录`
            } 
            {searchTerm || dateRange.start || dateRange.end ? '(已筛选)' : ''}
          </p>
        </div>

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
                  placeholder={activeTab === 'info-fee' 
                    ? "搜索旅行社、旅行社ID、联系方式、邮箱、订单号..." 
                    : "搜索用户名、手机号、邮箱..."
                  }
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-4 flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-5 w-5 mr-2" />
              日期筛选
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始日期
                </label>
                <DatePicker
                  value={dateRange.start}
                  onChange={(date) => setDateRange({ ...dateRange, start: date })}
                  placeholder="选择开始日期"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束日期
                </label>
                <DatePicker
                  value={dateRange.end}
                  onChange={(date) => setDateRange({ ...dateRange, end: date })}
                  placeholder="选择结束日期"
                />
              </div>
            </div>
          )}
        </div>

        {/* Logs Table - Only show when there's a search term or date filter */}
        {showRecords && (
          <div className="overflow-x-auto">
            {activeTab === 'info-fee' ? (
              filteredLogs.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支付时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        旅行社
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        联系方式
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        订单号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        备注
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {log.agent?.full_name || '未知旅行社'}
                          </div>
                          {log.agent?.agency_id && (
                            <div className="text-sm text-gray-500">
                              ID: {log.agent.agency_id}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {log.agent?.phone && <div>{log.agent.phone}</div>}
                            {log.agent?.email && <div>{log.agent.email}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.order?.order_number || log.order_id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[#F52E6B]">
                            ¥{log.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.remark}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无信息费记录</p>
                </div>
              )
            ) : (
              filteredTransactions.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        充值时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        联系方式
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        积分数量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        备注
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.user?.full_name || '未知用户'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {transaction.user?.phone && (
                              <div>{transaction.user.phone}</div>
                            )}
                            {transaction.user?.email && (
                              <div>{transaction.user.email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[#F52E6B]">
                            {transaction.amount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.remark}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无积分充值记录</p>
                </div>
              )
            )}
          </div>
        )}
        
        {/* Show message when no search/filter is applied */}
        {!showRecords && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">请输入搜索条件或选择日期范围查看记录</p>
          </div>
        )}
      </div>
    </div>
  );
}