import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Search, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { DatePicker } from '../../components/DatePicker';

interface InfoFeeLog {
  id: string;
  order_id: string;
  agent_id: string;
  amount: number;
  created_at: string;
  remark: string;
  order: {
    id: string;
    order_number: string;
    travel_packages: {
      title: string;
    };
  };
}

interface InfoFeeHistoryTableProps {
  className?: string;
}

export function InfoFeeHistoryTable({ className = '' }: InfoFeeHistoryTableProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<InfoFeeLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InfoFeeLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchInfoFeeLogs();
    }
  }, [user]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, dateRange]);

  async function fetchInfoFeeLogs() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('info_fee_logs')
        .select(`
          *,
          order:orders (
            id,
            order_number,
            travel_packages (
              title
            )
          )
        `)
        .eq('agent_id', user?.id)
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

  function filterLogs() {
    let filtered = [...logs];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Summary Card */}
        <div className="bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] p-6 text-white">
          <div className="flex items-center mb-2">
            <Coins className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-bold">信息费总计</h2>
          </div>
          <p className="text-3xl font-bold">¥{totalAmount.toFixed(2)}</p>
          <p className="text-sm opacity-80 mt-1">
            {filteredLogs.length} 条记录 {searchTerm || dateRange.start || dateRange.end ? '(已筛选)' : ''}
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
                  placeholder="搜索订单号..."
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-4 flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <Calendar className="h-5 w-5 mr-2" />
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

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {filteredLogs.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支付时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单信息
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
                        订单号: {log.order?.order_number || log.order_id.slice(0, 8)}
                      </div>
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
          )}
        </div>
      </div>
    </div>
  );
}