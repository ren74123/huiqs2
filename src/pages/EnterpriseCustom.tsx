import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Calendar, Users, MapPin, Send, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

interface FormData {
  contactName: string;
  contactPhone: string;
  departureLocation: string;
  destinationLocation: string;
  travelDate: string;
  peopleCount: string;
  requirements: string;
}

export function EnterpriseCustom() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<FormData>({
    contactName: '',
    contactPhone: '',
    departureLocation: '',
    destinationLocation: '',
    travelDate: '',
    peopleCount: '',
    requirements: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.contactName.trim()) {
      newErrors.contactName = '请输入联系人姓名';
    }
    
    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(formData.contactPhone)) {
      newErrors.contactPhone = '请输入正确的手机号格式';
    }
    
    if (!formData.departureLocation.trim()) {
      newErrors.departureLocation = '请输入出发地';
    }
    
    if (!formData.destinationLocation.trim()) {
      newErrors.destinationLocation = '请输入目的地';
    }
    
    if (!formData.travelDate) {
      newErrors.travelDate = '请选择出行时间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    setLoading(true);
    
    try {
      // Submit enterprise custom order
      const { error } = await supabase
        .from('enterprise_orders')
        .insert({
          user_id: user.id,
          contact_name: formData.contactName,
          contact_phone: formData.contactPhone,
          departure_location: formData.departureLocation,
          destination_location: formData.destinationLocation,
          travel_date: formData.travelDate,
          people_count: formData.peopleCount ? parseInt(formData.peopleCount) : null,
          requirements: formData.requirements,
          status: 'pending'
        });
      
      if (error) throw error;
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setFormData({
        contactName: '',
        contactPhone: '',
        departureLocation: '',
        destinationLocation: '',
        travelDate: '',
        peopleCount: '',
        requirements: ''
      });
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting enterprise order:', error);
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">企业团建定制</h1>
      </div>

      {success ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">提交成功</h2>
          <p className="text-gray-600 mb-6">
            您的企业定制需求已成功提交，我们将在 24 小时内与您联系，请留意站内消息并保持手机畅通。
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#F52E6B] text-white py-2 px-6 rounded-lg hover:bg-[#FE6587]"
          >
            返回首页
          </button>
        </div>
      ) : (
        <>
          {/* Process Flow */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-6">定制流程</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#F52E6B] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                  <MapPin className="h-6 w-6 text-[#F52E6B]" />
                </div>
                <span className="text-sm text-gray-700 text-center">选择线路</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#F52E6B] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                  <Calendar className="h-6 w-6 text-[#F52E6B]" />
                </div>
                <span className="text-sm text-gray-700 text-center">确定行程</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#F52E6B] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                  <FileText className="h-6 w-6 text-[#F52E6B]" />
                </div>
                <span className="text-sm text-gray-700 text-center">签订合同</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#F52E6B] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                  <Send className="h-6 w-6 text-[#F52E6B]" />
                </div>
                <span className="text-sm text-gray-700 text-center">放心出行</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">提交定制需求</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系人姓名 *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className={`w-full rounded-lg border ${errors.contactName ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent`}
                  />
                  {errors.contactName && (
                    <p className="mt-1 text-sm text-red-500">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    手机号 *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className={`w-full rounded-lg border ${errors.contactPhone ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent`}
                  />
                  {errors.contactPhone && (
                    <p className="mt-1 text-sm text-red-500">{errors.contactPhone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    出发地 *
                  </label>
                  <input
                    type="text"
                    value={formData.departureLocation}
                    onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                    className={`w-full rounded-lg border ${errors.departureLocation ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent`}
                  />
                  {errors.departureLocation && (
                    <p className="mt-1 text-sm text-red-500">{errors.departureLocation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目的地 *
                  </label>
                  <input
                    type="text"
                    value={formData.destinationLocation}
                    onChange={(e) => setFormData({ ...formData, destinationLocation: e.target.value })}
                    className={`w-full rounded-lg border ${errors.destinationLocation ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent`}
                  />
                  {errors.destinationLocation && (
                    <p className="mt-1 text-sm text-red-500">{errors.destinationLocation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    出行时间 *
                  </label>
                  <input
                    type="date"
                    value={formData.travelDate}
                    onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                    className={`w-full rounded-lg border ${errors.travelDate ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.travelDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.travelDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    人数（可选）
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="number"
                      value={formData.peopleCount}
                      onChange={(e) => setFormData({ ...formData, peopleCount: e.target.value })}
                      className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      placeholder="请输入预计人数"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注需求（可选）
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  placeholder="请输入您的特殊需求，如活动类型、预算范围等"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F52E6B] text-white py-3 rounded-lg font-medium hover:bg-[#FE6587] disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    提交中...
                  </>
                ) : (
                  '立即提交'
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}