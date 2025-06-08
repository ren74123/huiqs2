import React, { useState, useEffect } from 'react';
import { Building2, Phone, User, Upload, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import { uploadLicense } from '../utils/fileUpload';

const MAX_COMPANY_LENGTH = 30;
const MAX_CONTACT_LENGTH = 15;
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface FormData {
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  licenseImages: File[];
  agreeToTerms: boolean;
}

export function AgentApplication() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [maxPackages, setMaxPackages] = useState(1);
  const [commissionRate, setCommissionRate] = useState(5);
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactPerson: '',
    contactPhone: '',
    licenseImages: [],
    agreeToTerms: false,
  });
  const [formErrors, setFormErrors] = useState({
    companyName: '',
    contactPerson: '',
    contactPhone: '',
    licenseImages: '',
    agreeToTerms: '',
  });

  useEffect(() => {
    if (user) {
      checkExistingApplication();
      fetchSystemSettings();
      fetchUserProfile();
    }
  }, [user]);

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
          contactPerson: data.full_name || '',
          contactPhone: data.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  async function fetchSystemSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('max_travel_packages_per_agent, commission_rate')
        .eq('id', 1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMaxPackages(data.max_travel_packages_per_agent || 1);
        setCommissionRate(data.commission_rate || 5);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      // Use default values on error
      setMaxPackages(1);
      setCommissionRate(5);
    }
  }

  async function checkExistingApplication() {
    try {
      const { data: application } = await supabase
        .from('agent_applications')
        .select('status')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (application) {
        setHasSubmitted(application.status === 'pending');
      }
    } catch (error) {
      console.error('Error checking application status:', error);
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-[#1C2340] mb-4">请先登录</h2>
          <p className="text-gray-600">您需要登录后才能申请成为旅行社</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const errors = {
      companyName: '',
      contactPerson: '',
      contactPhone: '',
      licenseImages: '',
      agreeToTerms: '',
    };

    // Validate company name
    if (formData.companyName.length === 0) {
      errors.companyName = '请输入公司名称';
    } else if (formData.companyName.length > MAX_COMPANY_LENGTH) {
      errors.companyName = `公司名称不能超过${MAX_COMPANY_LENGTH}个字符`;
    }

    // Validate contact person
    if (formData.contactPerson.length === 0) {
      errors.contactPerson = '请输入联系人姓名';
    } else if (formData.contactPerson.length > MAX_CONTACT_LENGTH) {
      errors.contactPerson = `联系人姓名不能超过${MAX_CONTACT_LENGTH}个字符`;
    }

    // Validate phone
    if (!PHONE_REGEX.test(formData.contactPhone)) {
      errors.contactPhone = '请输入正确的11位手机号码';
    }

    // Validate images
    if (formData.licenseImages.length === 0) {
      errors.licenseImages = '请上传营业执照照片';
    }

    // Validate terms agreement
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = '请阅读并同意旅行社入驻平台政策协议';
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleImageUpload = (files: FileList) => {
    const newImages = Array.from(files).filter(file => {
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`图片 ${file.name} 超过 5MB 限制`);
        return false;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        alert(`图片 ${file.name} 格式不支持，请使用 JPG、PNG、GIF 或 WebP 格式`);
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      licenseImages: [...prev.licenseImages, ...newImages]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      licenseImages: prev.licenseImages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Upload all license images
      const imageUrls: string[] = [];
      for (const file of formData.licenseImages) {
        const imageUrl = await uploadLicense(file, user.id);
        imageUrls.push(imageUrl);
      }

      // Create application
      const { error: applicationError } = await supabase
        .from('agent_applications')
        .insert({
          user_id: user.id,
          company_name: formData.companyName,
          contact_person: formData.contactPerson,
          contact_phone: formData.contactPhone,
          license_image: imageUrls.join(','),
          status: 'pending'
        });

      if (applicationError) throw applicationError;

      setHasSubmitted(true);
      navigate('/profile');
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('提交申请失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-[#1C2340] mb-6">申请成为旅行社</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              公司名称 * ({formData.companyName.length}/{MAX_COMPANY_LENGTH})
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_COMPANY_LENGTH) {
                    setFormData({ ...formData, companyName: e.target.value });
                  }
                }}
                className={`pl-10 w-full rounded-md border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent ${
                  formErrors.companyName ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={MAX_COMPANY_LENGTH}
                disabled={hasSubmitted}
                required
              />
            </div>
            {formErrors.companyName && (
              <p className="mt-1 text-sm text-red-500">{formErrors.companyName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              联系人 * ({formData.contactPerson.length}/{MAX_CONTACT_LENGTH})
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CONTACT_LENGTH) {
                    setFormData({ ...formData, contactPerson: e.target.value });
                  }
                }}
                className={`pl-10 w-full rounded-md border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent ${
                  formErrors.contactPerson ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={MAX_CONTACT_LENGTH}
                disabled={hasSubmitted}
                required
              />
            </div>
            {formErrors.contactPerson && (
              <p className="mt-1 text-sm text-red-500">{formErrors.contactPerson}</p>
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
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className={`pl-10 w-full rounded-md border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent ${
                  formErrors.contactPhone ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={11}
                disabled={hasSubmitted}
                required
              />
            </div>
            {formErrors.contactPhone && (
              <p className="mt-1 text-sm text-red-500">{formErrors.contactPhone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              营业执照 *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#F52E6B] hover:text-[#FE6587] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#F52E6B]">
                    <span>上传照片</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          handleImageUpload(e.target.files);
                        }
                      }}
                      disabled={hasSubmitted}
                    />
                  </label>
                  <p className="pl-1">或拖放照片到此处</p>
                </div>
                <p className="text-xs text-gray-500">
                  支持 JPG、PNG、GIF、WebP 格式，单张图片不超过 5MB
                </p>
              </div>
            </div>

            {/* Preview Images */}
            {formData.licenseImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {formData.licenseImages.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`营业执照 ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                      disabled={hasSubmitted}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formErrors.licenseImages && (
              <p className="mt-1 text-sm text-red-500">{formErrors.licenseImages}</p>
            )}
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
                  disabled={hasSubmitted}
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
                    《旅行社入驻平台政策协议》
                  </button>
                </label>
              </div>
            </div>
            {formErrors.agreeToTerms && (
              <p className="text-sm text-red-500">{formErrors.agreeToTerms}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || hasSubmitted}
            className="w-full bg-[#F52E6B] hover:bg-[#FE6587] text-white font-medium py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
          >
            {loading ? '提交中...' : hasSubmitted ? '申请已提交，等待审核' : '提交申请'}
          </button>
        </form>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">旅行社入驻平台政策协议</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="prose max-w-none">
              <p>尊敬的旅行社合作伙伴：</p>
              <p>感谢您选择加入我们的旅游平台。请仔细阅读以下协议条款，这将规范我们之间的合作关系。</p>
              
              <h3>一、套餐发布规则</h3>
              <ol>
                <li>旅行社在平台上最多可同时发布<strong>{maxPackages}</strong>个旅游套餐，有效期最长1个月。</li>
                <li>所有套餐内容必须真实、准确，不得有虚假宣传或误导性描述。</li>
                <li>套餐价格必须包含明确的费用说明，标明包含和不包含的项目。</li>
              </ol>
              
              <h3>二、订单处理规范</h3>
              <ol>
                <li>对于用户预约的订单，应在24小时内进行处理，并决定是否接受。</li>
                <li>拒绝订单时，必须填写明确理由。</li>
                <li>接受订单后，应及时与客户联系确认行程细节。</li>
              </ol>
              
              <h3>三、费用与结算</h3>
              <ol>
                <li>用户线下成交的订单，如属平台撮合，需向平台缴纳<strong>{commissionRate}%</strong>的返点。</li>
                <li>平台将按月与旅行社进行结算。</li>
              </ol>
              
              <h3>四、责任与纠纷</h3>
              <ol>
                <li>平台不对旅行社和用户之间签订的合同条款承担法律责任，相关纠纷由旅行社与用户协商处理。</li>
                <li>用户可就服务质量进行评价或投诉，平台有权对不良行为进行处理。</li>
                <li>旅行社应确保提供的服务符合国家相关法律法规。</li>
              </ol>
              
              <h3>五、账号管理</h3>
              <ol>
                <li>旅行社应妥善保管账号信息，因账号管理不善造成的损失由旅行社自行承担。</li>
                <li>平台有权对违反协议的旅行社采取警告、限制发布、暂停或终止合作等措施。</li>
              </ol>
              
              <h3>六、协议变更</h3>
              <p>平台保留修改本协议的权利，修改后将通过平台公告或其他方式通知旅行社。</p>
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