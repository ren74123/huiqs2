import React, { useState, useEffect } from 'react';
import { Search, Coins, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';

interface User {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  user_role: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'consume' | 'purchase';
  amount: number;
  remark: string;
  created_at: string;
}

export function CreditManagement() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [remark, setRemark] = useState<string>('管理员充值');
  const [userCredits, setUserCredits] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<CreditTransaction[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (selectedUser) {
      fetchUserCredits(selectedUser.id);
      fetchRecentTransactions(selectedUser.id);
    }
  }, [selectedUser]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ searchTerm })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const { users: authUsers } = await response.json();

      // Get profiles for the matched users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, user_role')
        .in('id', authUsers.map(u => u.id));

      if (profilesError) throw profilesError;

      // Combine auth users with their profiles
      const formattedResults = authUsers.map(authUser => {
        const profile = profiles?.find(p => p.id === authUser.id) || {
          id: authUser.id,
          full_name: '未设置昵称',
          phone: '',
          user_role: 'user'
        };
        return {
          ...profile,
          email: authUser.email
        };
      });

      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('搜索用户失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('total')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserCredits(data?.total || 0);
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setUserCredits(0);
    }
  };

  const fetchRecentTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTransactions(data || []);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      setRecentTransactions([]);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser) return;
    if (creditAmount <= 0) {
      setError('积分数量必须大于0');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Call the add_credits RPC function
      const { error } = await supabase.rpc('add_credits', {
        p_user_id: selectedUser.id,
        p_amount: creditAmount,
        p_remark: remark || '管理员充值'
      });

      if (error) throw error;

      // Refresh user credits and transactions
      fetchUserCredits(selectedUser.id);
      fetchRecentTransactions(selectedUser.id);
      
      setSuccess(`成功为用户 ${selectedUser.full_name || selectedUser.email} 充值 ${creditAmount} 积分`);
      
      // Reset form
      setCreditAmount(100);
      setRemark('管理员充值');
    } catch (error) {
      console.error('Error adding credits:', error);
      setError('充值失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader 
        title="积分管理"
        subtitle="管理用户积分"
      />

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <div className="flex-1 mb-4 md:mb-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索用户（邮箱、昵称或手机号）"
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors"
            >
              搜索
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">搜索结果</h3>
              <div className="bg-gray-50 rounded-lg p-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                    onClick={() => setSelectedUser(result)}
                  >
                    <div>
                      <p className="font-medium">{result.full_name || '未设置昵称'}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500">
                        {result.email && <span className="mr-2">{result.email}</span>}
                        {result.phone && <span>{result.phone}</span>}
                      </div>
                    </div>
                    <button
                      className="text-[#F52E6B] hover:text-[#FE6587]"
                    >
                      选择
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>{success}</span>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedUser.full_name || '未设置昵称'}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center text-gray-500">
                    {selectedUser.email && <span className="mr-2">{selectedUser.email}</span>}
                    {selectedUser.phone && <span>{selectedUser.phone || '未绑定手机'}</span>}
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center bg-[#F52E6B] bg-opacity-10 text-[#F52E6B] px-4 py-2 rounded-full">
                  <Coins className="h-5 w-5 mr-2" />
                  <span className="font-bold">{userCredits} 积分</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">充值积分</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      积分数量
                    </label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                        className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      备注
                    </label>
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      placeholder="充值原因或备注"
                    />
                  </div>

                  <button
                    onClick={handleAddCredits}
                    disabled={submitting}
                    className="w-full bg-[#F52E6B] text-white py-2 px-4 rounded-lg hover:bg-[#FE6587] disabled:opacity-50 flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        处理中...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-2" />
                        充值积分
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">最近交易记录</h3>
                {recentTransactions.length === 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-gray-500">暂无交易记录</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.type === 'purchase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.type === 'purchase' ? '充值' : '消费'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`font-medium ${
                                transaction.type === 'purchase' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.type === 'purchase' ? '+' : '-'}{transaction.amount}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {transaction.remark}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(transaction.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedUser && !loading && searchTerm && searchResults.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-gray-500">未找到匹配的用户</p>
          </div>
        )}

        {!selectedUser && !searchTerm && (
          <div className="p-6 text-center">
            <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">请搜索用户以管理积分</p>
          </div>
        )}
      </div>
    </div>
  );
}