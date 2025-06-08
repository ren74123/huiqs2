import React, { useState } from 'react';
import { X, Upload, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { uploadGeneral } from '../../utils/fileUpload';
import { isValidUUID } from '../../utils/validation';

interface EnterpriseApplicationFormProps {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function EnterpriseApplicationForm({ orderId, onClose, onSuccess }: EnterpriseApplicationFormProps) {
  const { user } = useAuthStore();
  const [licenseImages, setLicenseImages] = useState<File[]>([]);
  const [qualificationImages, setQualificationImages] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [errors, setErrors] = useState({
    licenseImages: '',
    qualificationImages: '',
    agreeToTerms: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [totalLicenseSize, setTotalLicenseSize] = useState(0);
  const [totalQualificationSize, setTotalQualificationSize] = useState(0);

  const validateForm = () => {
    const newErrors = {
      licenseImages: '',
      qualificationImages: '',
      agreeToTerms: ''
    };

    if (licenseImages.length === 0) {
      newErrors.licenseImages = '请上传营业执照';
    }

    if (qualificationImages.length === 0) {
      newErrors.qualificationImages = '请上传资质证明';
    }

    if (!agreeToTerms) {
      newErrors.agreeToTerms = '请阅读并同意企业团建接单协议';
    }

    // Check total file size
    if (totalLicenseSize > MAX_TOTAL_SIZE) {
      newErrors.licenseImages = '营业执照图片总大小不能超过20MB';
    }

    if (totalQualificationSize > MAX_TOTAL_SIZE) {
      newErrors.qualificationImages = '资质证明图片总大小不能超过20MB';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'qualification') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes and types
    const validFiles: File[] = [];
    let totalSize = type === 'license' ? totalLicenseSize : totalQualificationSize;
    let errorMessage = '';

    for (const file of files) {
      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        errorMessage = `图片 ${file.name} 超过5MB限制`;
        continue;
      }

      // Check file type
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        errorMessage = `图片 ${file.name} 格式不支持，请使用JPG、PNG、GIF或WebP格式`;
        continue;
      }

      // Check if adding this file would exceed total size limit
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errorMessage = '图片总大小不能超过20MB';
        break;
      }

      totalSize += file.size;
      validFiles.push(file);
    }

    if (type === 'license') {
      setTotalLicenseSize(totalSize);
      setLicenseImages([...licenseImages, ...validFiles]);
      if (errorMessage) {
        setErrors({...errors, licenseImages: errorMessage});
      } else {
        setErrors({...errors, licenseImages: ''});
      }
    } else {
      setTotalQualificationSize(totalSize);
      setQualificationImages([...qualificationImages, ...validFiles]);
      if (errorMessage) {
        setErrors({...errors, qualificationImages: errorMessage});
      } else {
        setErrors({...errors, qualificationImages: ''});
      }
    }
  };

  const removeImage = (index: number, type: 'license' | 'qualification') => {
    if (type === 'license') {
      const newImages = [...licenseImages];
      const removedFile = newImages[index];
      newImages.splice(index, 1);
      setLicenseImages(newImages);
      setTotalLicenseSize(totalLicenseSize - removedFile.size);
    } else {
      const newImages = [...qualificationImages];
      const removedFile = newImages[index];
      newImages.splice(index, 1);
      setQualificationImages(newImages);
      setTotalQualificationSize(totalQualificationSize - removedFile.size);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user || !isValidUUID(orderId)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Upload license images
      const licenseImageUrls: string[] = [];
      for (const file of licenseImages) {
        const url = await uploadFile(
          file, 
          'enterprise_docs', 
          user.id, 
          { enterprise_order_id: orderId, doc_type: 'license' }
        );
        licenseImageUrls.push(url);
      }
      
      // Upload qualification images
      const qualificationImageUrls: string[] = [];
      for (const file of qualificationImages) {
        const url = await uploadFile(
          file, 
          'enterprise_docs', 
          user.id, 
          { enterprise_order_id: orderId, doc_type: 'qualification' }
        );
        qualificationImageUrls.push(url);
      }
      
      // Submit application
      const { error: applicationError } = await supabase
        .from('enterprise_order_applications')
        .insert({
          order_id: orderId,
          agent_id: user.id,
          license_image: licenseImageUrls.join(','),
          qualification_image: qualificationImageUrls.join(','),
          note: note,
          status: 'pending'
        });
        
      if (applicationError) throw applicationError;
      
      // Send notification to admin
      await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          content: `旅行社提交了企业团建接单申请，请查看`,
          type: 'system'
        });
      
      onSuccess();
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('提交申请失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">申请接单</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* License Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            营业执照 * (可上传多张，每张≤5MB，总计≤20MB)
          </label>
          <div className="mt-1 flex flex-wrap gap-4">
            {licenseImages.map((file, index) => (
              <div key={index} className="relative w-24 h-24">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`营业执照 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index, 'license')}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="mt-1 text-xs text-gray-500">添加图片</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => handleImagesChange(e, 'license')}
              />
            </label>
          </div>
          {errors.licenseImages && (
            <p className="mt-1 text-sm text-red-500">{errors.licenseImages}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            已上传 {licenseImages.length} 张，总大小 {(totalLicenseSize / (1024 * 1024)).toFixed(2)}MB
          </p>
        </div>

        {/* Qualification Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            旅行社资质证明 * (可上传多张，每张≤5MB，总计≤20MB)
          </label>
          <div className="mt-1 flex flex-wrap gap-4">
            {qualificationImages.map((file, index) => (
              <div key={index} className="relative w-24 h-24">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`资质证明 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index, 'qualification')}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="mt-1 text-xs text-gray-500">添加图片</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => handleImagesChange(e, 'qualification')}
              />
            </label>
          </div>
          {errors.qualificationImages && (
            <p className="mt-1 text-sm text-red-500">{errors.qualificationImages}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            已上传 {qualificationImages.length} 张，总大小 {(totalQualificationSize / (1024 * 1024)).toFixed(2)}MB
          </p>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            申请备注（可选）
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
            placeholder="请输入申请备注，如特殊资质、服务优势等..."
          />
        </div>

        {/* Terms Agreement */}
        <div className="space-y-2">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
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
                  《企业团建接单协议》
                </button>
              </label>
            </div>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-500">{errors.agreeToTerms}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] disabled:opacity-50 flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                提交中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                提交申请
              </>
            )}
          </button>
        </div>
      </form>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">企业团建接单协议</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="prose max-w-none">
              <h3>一、服务内容</h3>
              <p>旅行社承诺为企业客户提供专业、安全、高质量的团建旅游服务，包括但不限于交通安排、住宿预订、餐饮安排、活动策划等。</p>
              
              <h3>二、服务标准</h3>
              <ol>
                <li>旅行社应当具备合法的经营资质，持有有效的旅行社业务经营许可证。</li>
                <li>旅行社应当为企业团建提供专业的定制方案，满足企业的特定需求。</li>
                <li>旅行社应当确保所提供的服务符合国家相关法律法规和行业标准。</li>
              </ol>
              
              <h3>三、接单流程</h3>
              <ol>
                <li>旅行社通过平台查看企业团建需求，提交接单申请。</li>
                <li>平台审核旅行社资质后，将审核结果通知旅行社。</li>
                <li>审核通过后，旅行社可获取企业客户联系方式，进行进一步沟通。</li>
                <li>旅行社与企业客户达成一致后，签订正式合同。</li>
              </ol>
              
              <h3>四、费用与结算</h3>
              <ol>
                <li>旅行社应向企业客户提供明确的报价方案，包括各项费用的明细。</li>
                <li>旅行社通过平台接单成功并完成服务后，需向平台支付5%的服务费。</li>
                <li>服务费结算方式为月结，平台将在每月初向旅行社提供上月的结算单。</li>
              </ol>
              
              <h3>五、责任与保障</h3>
              <ol>
                <li>旅行社应当为企业团建活动购买相应的保险。</li>
                <li>旅行社对企业团建活动中的安全问题负有主要责任。</li>
                <li>如因旅行社原因导致服务无法正常提供，旅行社应当及时通知企业客户并提供替代方案。</li>
              </ol>
              
              <h3>六、违约责任</h3>
              <p>旅行社如有虚假宣传、服务质量不达标等行为，平台有权取消其接单资格，并要求其承担相应的违约责任。</p>
              
              <h3>七、协议期限</h3>
              <p>本协议自旅行社确认接受之日起生效，至平台或旅行社书面通知终止之日止。</p>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowTerms(false);
                  setAgreeToTerms(true);
                }}
                className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                我已阅读并同意
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}