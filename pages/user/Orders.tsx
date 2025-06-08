import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Calendar, Clock, AlertCircle, MessageSquare, UserCircle, Star, FileCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

interface Order {
  id: string;
  package_id: string;
  contact_name: string;
  contact_phone: string;
  travel_date: string;
  status: 'pending' | 'contacted' | 'rejected';
  created_at: string;
  contract_status?: 'pending' | 'confirmed' | 'rejected';
  travel_packages: {
    id: string;
    title: string;
    price: number;
    destination: string;
    duration: number;
    image: string;
    agent: {
      full_name: string;
      agency_id?: string;
    };
  };
}

interface Message {
  id: string;
  order_id: string;
  from_role: 'user' | 'agent';
  message: string;
  created_at: string;
}

interface Review {
  id: string;
  user_id: string;
  package_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export function Orders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showContractConfirmModal, setShowContractConfirmModal] = useState(false);
  const [contractConfirmOrderId, setContractConfirmOrderId] = useState<string | null>(null);
  const [submittingContract, setSubmittingContract] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchUserReviews();
    }
  }, [user]);

  async function fetchOrders() {
    try {
      setError(null);
      setLoading(true);

      const { data, error: supabaseError } = await supabase
        .from('orders')
        .select(`
          *,
          travel_packages (
            id,
            title,
            price,
            destination,
            duration,
            image,
            agent:profiles!travel_packages_agent_id_fkey (
              full_name,
              agency_id
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      setOrders(data || []);

      // Fetch messages for each order
      if (data && data.length > 0) {
        const orderMessages: Record<string, Message[]> = {};
        
for (const order of data) {
  if (!order?.id || !isValidUUID(order.id)) continue;
console.warn('Invalid order.id:', order?.id);
    if (typeof id !== 'string' || !isValidUUID(id)) continue;
  const { data: messageData, error: messageError } = await supabase
    .from('message_logs')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (!messageError && messageData) {
    orderMessages[order.id] = messageData;
  }
}
        
        setMessages(orderMessages);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('无法加载订单数据，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserReviews() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('package_reviews')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      if (data) {
        const reviewsMap: Record<string, Review> = {};
        data.forEach(review => {
          reviewsMap[review.package_id] = review;
        });
        setReviews(reviewsMap);
      }
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  }

  const handleReviewSubmit = async () => {
    if (!user || !selectedOrderId) return;
    
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;
    
    setSubmittingReview(true);
    
    try {
      const packageId = order.package_id;
      const existingReview = reviews[packageId];
      
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('package_reviews')
          .update({
            rating: reviewData.rating,
            comment: reviewData.comment
          })
          .eq('id', existingReview.id);
          
        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from('package_reviews')
          .insert({
            user_id: user.id,
            package_id: packageId,
            rating: reviewData.rating,
            comment: reviewData.comment
          });
          
        if (error) throw error;
      }
      
      // Refresh reviews
      await fetchUserReviews();
      
      // Close modal
      setShowReviewModal(false);
      setSelectedOrderId(null);
      setReviewData({ rating: 5, comment: '' });
      
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('评价提交失败，请重试');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleContractConfirm = async () => {
    if (!user || !contractConfirmOrderId) return;
    
    setSubmittingContract(true);
    
    try {
      // Update order contract status
      const { error } = await supabase
        .from('orders')
        .update({
          contract_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', contractConfirmOrderId);
        
      if (error) throw error;
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === contractConfirmOrderId 
          ? { ...order, contract_status: 'pending' } 
          : order
      ));
      
      // Close modal
      setShowContractConfirmModal(false);
      setContractConfirmOrderId(null);
      
    } catch (error) {
      console.error('Error submitting contract confirmation:', error);
      alert('提交失败，请重试');
    } finally {
      setSubmittingContract(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'contacted':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">已联系</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">已拒绝</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">待联系</span>;
    }
  };

  const getContractStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">已确认签约</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">待审核</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">审核未通过</span>;
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter(order => 
    showRejected ? true : order.status !== 'rejected'
  );

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getAgentDisplay = (order: Order) => {
    if (order.travel_packages?.agent?.agency_id) {
      return `旅行社 ${order.travel_packages.agent.agency_id}`;
    }
    return order.travel_packages?.agent?.full_name || '未知旅行社';
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer' : ''}`}
            onClick={interactive ? () => setReviewData({...reviewData, rating: star}) : undefined}
          />
        ))}
        {rating > 0 && <span className="ml-1 text-sm">{rating.toFixed(1)}</span>}
      </div>
    );
  };

  const hasReview = (packageId: string) => {
    return !!reviews[packageId];
  };

  const isReviewEditable = (order: Order) => {
    // Check if the order has a confirmed contract status
    return !(order.contract_status === 'confirmed');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-700 mb-4">{error}</p>
        <button 
          onClick={() => fetchOrders()}
          className="inline-block bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
        >
          重试
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">暂无订单记录</p>
        <button 
          onClick={() => navigate('/packages')}
          className="inline-block bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
        >
          浏览套餐
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">我的订单</h2>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showRejected}
            onChange={(e) => setShowRejected(e.target.checked)}
            className="rounded border-gray-300 text-[#F52E6B] focus:ring-[#F52E6B]"
          />
          <span className="text-sm text-gray-600">显示已拒绝订单</span>
        </label>
      </div>

      {filteredOrders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow w-full"
        >
          <div className="flex">
            <img 
              src={order.travel_packages?.image}
              alt={order.travel_packages?.title}
              className="w-32 h-32 object-cover"
            />
            <div className="flex-1 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {order.travel_packages?.title}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{order.travel_packages?.destination}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{order.travel_packages?.duration}天</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(order.travel_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <UserCircle className="h-4 w-4 mr-1" />
                      <span>{getAgentDisplay(order)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-[#F52E6B]">
                    ¥{order.travel_packages?.price}
                  </span>
                  <div className="mt-2">
                    {getStatusBadge(order.status)}
                  </div>
                  {order.contract_status && (
                    <div className="mt-1">
                      {getContractStatusBadge(order.contract_status)}
                    </div>
                  )}
                  
                  {/* Review button - only show for contacted orders */}
                  {order.status === 'contacted' && (
                    <button
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setShowReviewModal(true);
                        
                        // Pre-fill existing review data if available
                        const existingReview = reviews[order.package_id];
                        if (existingReview) {
                          setReviewData({
                            rating: existingReview.rating,
                            comment: existingReview.comment
                          });
                        } else {
                          setReviewData({ rating: 5, comment: '' });
                        }
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {hasReview(order.package_id) ? '查看评价' : '去评价'}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Review display */}
              {hasReview(order.package_id) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 mr-2">我的评价:</span>
                      {renderStars(reviews[order.package_id].rating)}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(reviews[order.package_id].created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {reviews[order.package_id].comment && (
                    <p className="mt-1 text-sm text-gray-600">{reviews[order.package_id].comment}</p>
                  )}
                </div>
              )}
              
              {/* Contract confirmation button - only show for contacted orders without confirmation */}
              {order.status === 'contacted' && !order.contract_status && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setContractConfirmOrderId(order.id);
                      setShowContractConfirmModal(true);
                    }}
                    className="flex items-center text-sm text-[#F52E6B] hover:text-[#FE6587] bg-pink-50 px-3 py-2 rounded-lg w-full justify-center"
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    <span>我已与旅行社达成线下签约（确认可得200积分奖励）</span>
                  </button>
                </div>
              )}
              
              {/* Contract status display - show for pending or confirmed contracts */}
              {order.status === 'contacted' && order.contract_status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
                    <FileCheck className="h-4 w-4 mr-2" />
                    <span>已提交，待审核</span>
                  </div>
                </div>
              )}
              
              {/* Message indicator */}
              {messages[order.id] && messages[order.id].length > 0 && (
                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => toggleOrderExpand(order.id)}
                    className="flex items-center text-sm text-[#F52E6B] hover:text-[#FE6587]"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>{messages[order.id].length}条消息</span>
                    <span className="ml-1">{expandedOrder === order.id ? '收起' : '展开'}</span>
                  </button>
                </div>
              )}
              
              {/* Messages */}
              {expandedOrder === order.id && messages[order.id] && messages[order.id].length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">沟通记录</h4>
                  <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                    {messages[order.id].map((message, index) => (
                      <div key={index} className="text-sm text-gray-600 mb-2 pb-2 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-medium ${message.from_role === 'agent' ? 'text-[#F52E6B]' : 'text-gray-700'}`}>
                            {message.from_role === 'agent' ? getAgentDisplay(order) : '我'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p>{message.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {hasReview(orders.find(o => o.id === selectedOrderId)?.package_id || '') ? '我的评价' : '评价套餐'}
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评分
              </label>
              <div className="flex items-center">
                {renderStars(reviewData.rating, isReviewEditable(orders.find(o => o.id === selectedOrderId)!))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评价内容 (可选)
              </label>
              <textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                rows={4}
                placeholder="分享您的体验..."
                maxLength={100}
                disabled={!isReviewEditable(orders.find(o => o.id === selectedOrderId)!)}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {reviewData.comment.length}/100
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedOrderId(null);
                  setReviewData({ rating: 5, comment: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                关闭
              </button>
              {isReviewEditable(orders.find(o => o.id === selectedOrderId)!) && (
                <button
                  onClick={handleReviewSubmit}
                  disabled={submittingReview}
                  className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
                >
                  {submittingReview ? '提交中...' : (hasReview(orders.find(o => o.id === selectedOrderId)?.package_id || '') ? '更新评价' : '提交评价')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Confirmation Modal */}
      {showContractConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">线下签约确认</h2>
            
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <p className="text-yellow-800 font-medium mb-2">⚠️ 请如实确认您已与旅行社签订线下合同</p>
              <p className="text-sm text-yellow-700">
                我们会与旅行社进行核实，并在24小时内完成审核<br />
                审核通过后，您将获得200积分奖励<br />
                积分可在"用户中心 &gt; 设置 &gt; 我的积分"中查看
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowContractConfirmModal(false);
                  setContractConfirmOrderId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleContractConfirm}
                disabled={submittingContract}
                className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
              >
                {submittingContract ? '提交中...' : '我已确认签约'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}