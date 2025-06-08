import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar, User, Phone, CreditCard, Upload, X, Star, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { uploadIdCard } from '../utils/fileUpload';

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
  orders: number;
  average_rating?: number;
  status: string;
  agent_id: string;
  is_discounted: boolean;
  original_price?: number;
  discount_price?: number;
  discount_expires_at?: string;
  agent: {
    full_name: string;
    agency_id?: string;
  };
}

interface FormData {
  contact_name: string;
  contact_phone: string;
  id_card: File | null;
  travel_date: string;
  agreeToTerms: boolean;
}

interface Review {
  id: string;
  user_id: string;
  package_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const NAME_REGEX = /^[\u4e00-\u9fa5]{2,}$/;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

function generateOrderNumber() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${timestamp}${random}`;
}

export function BookPackage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pkg, setPackage] = useState<TravelPackage | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    contact_name: '',
    contact_phone: '',
    id_card: null,
    travel_date: '',
    agreeToTerms: false
  });
  const [formErrors, setFormErrors] = useState({
    contact_name: '',
    contact_phone: '',
    id_card: '',
    agreeToTerms: ''
  });
  const [hasExistingOrder, setHasExistingOrder] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!id) {
      setError('Invalid package ID');
      setLoading(false);
      return;
    }
    fetchPackage();
    checkExistingOrder();
    fetchReviews();
    fetchUserProfile();
  }, [user, id, navigate]);

  async function fetchUserProfile() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Pre-fill form with user profile data
        setFormData(prev => ({
          ...prev,
          contact_name: data.full_name || '',
          contact_phone: data.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  async function fetchPackage() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('travel_packages')
        .select(`
          *,
          agent:profiles!travel_packages_agent_id_fkey(full_name, agency_id)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Package not found');
        }
        throw fetchError;
      }

      if (!data) {
        throw new Error('Package not found');
      }

      // Check if package is approved and not expired
      if (data.status !== 'approved') {
        throw new Error('This package is not available for booking');
      }

      if (data.expire_at && new Date(data.expire_at) < new Date()) {
        throw new Error('This package has expired');
      }

      setPackage(data);

      // Now increment the views after we've handled any necessary updates
      const { error: viewError } = await supabase
        .rpc('increment_package_views', { package_id: id });

      if (viewError) throw viewError;

      // Check if favorited
      if (user) {
        const { data: favorite } = await supabase
          .from('package_favorites')
          .select()
          .eq('user_id', user.id)
          .eq('package_id', id)
          .maybeSingle();

        setIsFavorited(!!favorite);
      }
    } catch (error) {
      console.error('Error fetching package:', error);
      navigate('/packages');
    } finally {
      setLoading(false);
    }
  }

  async function checkExistingOrder() {
    if (!user || !id) return;
    
    try {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('package_id', id);
      
      setHasExistingOrder(count ? count > 0 : false);
    } catch (error) {
      console.warn('Error checking existing order:', error);
      setHasExistingOrder(false);
    }
  }

  async function fetchReviews() {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('package_reviews')
        .select(`
          *,
          user:profiles!package_reviews_user_id_fkey(full_name)
        `)
        .eq('package_id', id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        setReviews(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }

  const validateForm = () => {
    const errors = {
      contact_name: '',
      contact_phone: '',
      id_card: '',
      agreeToTerms: '',
    };

    if (!NAME_REGEX.test(formData.contact_name)) {
      errors.contact_name = '请输入至少2个汉字的姓名';
    }

    if (!PHONE_REGEX.test(formData.contact_phone)) {
      errors.contact_phone = '请输入正确的11位手机号码';
    }

    if (formData.id_card) {
      if (formData.id_card.size > MAX_IMAGE_SIZE) {
        errors.id_card = `图片大小不能超过 ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`;
      } else if (!ACCEPTED_IMAGE_TYPES.includes(formData.id_card.type)) {
        errors.id_card = '请上传 JPG、PNG、GIF 或 WebP 格式的图片';
      }
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = '请阅读并同意预约条款';
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg || !user?.id) return;

    if (hasExistingOrder) {
      alert('您已经预订过此套餐，不能重复预订');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let idCardUrl = '';
      
      const orderNumber = generateOrderNumber();
      
      let { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          package_id: pkg.id,
          contact_name: formData.contact_name,
          contact_phone: formData.contact_phone,
          id_card: formData.id_card ? 'pending_upload' : '',
          travel_date: formData.travel_date,
          status: 'pending',
          order_number: orderNumber
        })
        .select('id')
        .single();

      if (orderError) {
        if (orderError.code === '23505') {
          const newOrderNumber = generateOrderNumber();
          const { data: retryOrderData, error: retryError } = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              package_id: pkg.id,
              contact_name: formData.contact_name,
              contact_phone: formData.contact_phone,
              id_card: formData.id_card ? 'pending_upload' : '',
              travel_date: formData.travel_date,
              status: 'pending',
              order_number: newOrderNumber
            })
            .select('id')
            .single();

          if (retryError) throw retryError;
          if (!retryOrderData) throw new Error('Failed to create order');
          orderData = retryOrderData;
        } else {
          throw orderError;
        }
      }

      if (!orderData || !orderData.id) {
        throw new Error('Failed to create order');
      }

      if (formData.id_card) {
        idCardUrl = await uploadIdCard(formData.id_card, user.id, orderData.id);

        const { error: updateError } = await supabase
          .from('orders')
          .update({ id_card: idCardUrl })
          .eq('id', orderData.id);

        if (updateError) throw updateError;
      }

      const { error: updatePkgError } = await supabase
        .from('travel_packages')
        .update({ orders: pkg.orders + 1 })
        .eq('id', pkg.id);

      if (updatePkgError) throw updatePkgError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      if (profile?.user_role === 'agent') {
        navigate('/profile');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : '预订失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        {rating > 0 && <span className="ml-1 text-sm">{rating.toFixed(1)}</span>}
      </div>
    );
  };

  const getAgentDisplay = () => {
    if (!pkg) return '';
    return pkg.agent.agency_id ? `旅行社 ${pkg.agent.agency_id}` : pkg.agent.full_name;
  };

  const isDiscountActive = () => {
    if (!pkg?.is_discounted || !pkg?.discount_expires_at) return false;
    return new Date(pkg.discount_expires_at) > new Date();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {error || '套餐不存在'}
          </h2>
          <button
            onClick={() => navigate('/packages')}
            className="text-[#F52E6B] hover:text-[#FE6587]"
          >
            返回套餐列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">预订套餐</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Package Info */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-8">
            <img
              src={pkg.image}
              alt={pkg.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">{pkg.title}</h2>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{pkg.destination}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{pkg.duration} 天</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>{getAgentDisplay()}</span>
                </div>
                {pkg.average_rating && (
                  <div className="flex items-center">
                    {renderStars(pkg.average_rating)}
                    <span className="ml-2 text-xs text-gray-500">({reviews.length}条评价)</span>
                  </div>
                )}
              </div>
              <div className="mt-4 text-2xl font-bold text-[#F52E6B]">
                ¥{pkg.price}
              </div>
            </div>

            {/* Reviews Preview */}
            {reviews.length > 0 && (
              <div className="border-t border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">用户评价</h3>
                  <button 
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="text-xs text-[#F52E6B]"
                  >
                    {showAllReviews ? '收起' : '查看更多'}
                  </button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(showAllReviews ? reviews : reviews.slice(0, 3)).map(review => (
                    <div key={review.id} className="border-b border-gray-100 pb-2 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">{review.user.full_name}</span>
                        <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-1">{renderStars(review.rating)}</div>
                      {review.comment && (
                        <p className="mt-1 text-xs text-gray-600">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">填写预订信息</h3>
            
            {hasExistingOrder && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative">
                <p className="font-medium">您已经预订过此套餐，不能重复预订</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系人姓名 *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className={`pl-10 w-full rounded-lg border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent ${
                      formErrors.contact_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                </div>
                {formErrors.contact_name && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.contact_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系电话 *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className={`pl-10 w-full rounded-lg border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent ${
                      formErrors.contact_phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                </div>
                {formErrors.contact_phone && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.contact_phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  身份证照片
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    {formData.id_card ? (
                      <div className="relative">
                        <img
                          src={URL.createObjectURL(formData.id_card)}
                          alt="身份证预览"
                          className="h-32 object-cover rounded-lg mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, id_card: null })}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#F52E6B] hover:text-[#FE6587] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#F52E6B]">
                            <span>上传照片</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept={ACCEPTED_IMAGE_TYPES.join(',')}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  if (file.size > MAX_IMAGE_SIZE) {
                                    setFormErrors({
                                      ...formErrors,
                                      id_card: `图片大小不能超过 ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
                                    });
                                    return;
                                  }
                                  setFormData({ ...formData, id_card: file });
                                  setFormErrors({
                                    ...formErrors,
                                    id_card: ''
                                  });
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">或拖放照片到此处</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          支持 JPG、PNG、GIF、WebP 格式，大小不超过 5MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {formErrors.id_card && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.id_card}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出发日期 *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="date"
                    value={formData.travel_date}
                    onChange={(e) => setFormData({ ...formData, travel_date: e.target.value })}
                    className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-2">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                      className="h-4 w-4 text-[#F52E6B] focus:ring-[#F52E6B] border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="font-medium text-gray-700">
                      我已阅读并同意
                      <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-[#F52E6B] hover:text-[#FE6587] ml-1"
                      >
                        《预约条款》
                      </button>
                    </label>
                  </div>
                </div>
                {formErrors.agreeToTerms && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.agreeToTerms}</p>
                )}
              </div>

              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || hasExistingOrder}
                className="w-full bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
              >
                {submitting ? '提交中...' : hasExistingOrder ? '您已预订过此套餐' : '确认预订'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#F52E6B]" />
                预约条款
              </h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="prose max-w-none">
              <p>尊敬的用户：</p>
              <p>感谢您选择我们的旅游服务。请仔细阅读以下预约条款，这将规范您与旅行社之间的权利义务关系。</p>
              
              <h3>一、预约确认</h3>
              <ol>
                <li>本预约单一经提交，旅行社会在24小时内联系您确认行程。</li>
                <li>旅行社有权根据实际情况接受或拒绝您的预约，拒绝时会提供明确理由。</li>
                <li>预约成功后，请保持电话畅通，以便旅行社与您联系确认详情。</li>
              </ol>
              
              <h3>二、合同关系</h3>
              <ol>
                <li>后续签署的正式旅游合同为用户与旅行社之间的协议，平台不承担担保与监督义务。</li>
                <li>您应当仔细阅读旅游合同的所有条款，确保理解并接受所有权利义务。</li>
                <li>旅游合同一经签署，将受到相关法律法规的保护和约束。</li>
              </ol>
              
              <h3>三、个人信息保护</h3>
              <ol>
                <li>您提供的身份证照片等个人信息仅用于旅行预订，平台将严格保护您的隐私。</li>
                <li>您的个人信息将仅提供给相关旅行社用于行程安排和确认。</li>
              </ol>
              
              <h3>四、争议处理</h3>
              <ol>
                <li>若对旅行社服务有异议，您可以在平台提交投诉，平台将在核实后予以处理。</li>
                <li>平台将尽力协调用户与旅行社之间的纠纷，但最终解决方案应由双方协商确定。</li>
              </ol>
              
              <h3>五、其他事项</h3>
              <ol>
                <li>请确保提供的所有信息真实有效，因信息不实导致的问题由用户自行承担。</li>
                <li>平台保留对本条款进行修改的权利，修改后将通过适当方式通知用户。</li>
              </ol>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowTerms(false);
                  setFormData({ ...formData, agreeToTerms: true });
                }}
                className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
              >
                我已阅读并同意
              </button>
            </div>
          </div>
        
        </div>
      )}
    </div>
  );
}