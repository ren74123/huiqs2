import React, { useState, useEffect } from 'react';
import { Coins, CreditCard, AlertCircle, CheckCircle2, Eye, FileText } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
const supabase = getSupabaseClient();
import { useAuthStore } from '@/store/auth';
import { useCredits } from '@/hooks/useCredits';
import { WechatPayModal } from '@/WechatPayModal';
import { InfoFeePaymentForm } from './InfoFeePaymentForm';
import { InfoFeeHistoryTable } from './InfoFeeHistoryTable';
import { EnterpriseInfoFeePaymentForm } from './EnterpriseInfoFeePaymentForm';
import { EnterpriseInfoFeeHistoryTable } from './EnterpriseInfoFeeHistoryTable';
import { CreditHistory } from './CreditHistory';

interface CreditPackage {
  id: string;
  name: string;
  price: number;
  total: number;
  usageCount: number;
  costPerUse: number;
  recommended?: boolean;
  bestValue?: boolean;
}

interface CreditSettingsProps {
  activeSettingsTab?: 'credits' | 'history' | 'info-fee-payment' | 'info-fee-history' | 'enterprise-fee-payment' | 'enterprise-fee-history';
  orderId?: string | null;
  enterpriseOrderId?: string | null;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'package1',
    name: '套餐一',
    price: 10,
    total: 100,
    usageCount: 2,
    costPerUse: 5
  },
  {
    id: 'package2',
    name: '套餐二',
    price: 30,
    total: 400,
    usageCount: 8,
    costPerUse: 3.75,
    recommended: true
  },
  {
    id: 'package3',
    name: '套餐三',
    price: 100,
    total: 1200,
    usageCount: 24,
    costPerUse: 4.17,
    bestValue: true
  }
];

export function CreditSettings({ activeSettingsTab = 'credits', orderId = null, enterpriseOrderId = null }: CreditSettingsProps) {
  const { user } = useAuthStore();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'credits' | 'history' | 'info-fee-payment' | 'info-fee-history' | 'enterprise-fee-payment' | 'enterprise-fee-history'>(activeSettingsTab);
  const { total, fetchCredits, loading, error, purchaseCredits } = useCredits();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (user?.id) {
      console.log("CreditSettings: 强制刷新积分数据");
      fetchCredits(user.id).then(latestCredits => {
        console.log("CreditSettings: 最新积分数据:", latestCredits);
      });
      fetchUserRole();
    }
  }, [user, fetchCredits]);

  useEffect(() => {
    setActiveTab(activeSettingsTab);
  }, [activeSettingsTab]);

  async function fetchUserRole() {
    try {
      if (!user?.id) {
        setUserRole(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();
        
      if (error) {
        setUserRole(null);
        throw error;
      }
      if (!data) {
        setUserRole(null);
        return;
      }
      
      setUserRole(data.user_role as string | null);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  }

  const handlePurchase = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setShowPayModal(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPackage || !user?.id) return;
    
    try {
      const success = await purchaseCredits(
        selectedPackage.total,
        `购买${selectedPackage.name}（${selectedPackage.total}积分）`,
        user.id
      );
      
      if (success) {
        setShowPayModal(false);
        setShowSuccessMessage(true);
        setStatusMessage(`成功购买了 ${selectedPackage.total} 积分！`);
      } else {
        throw new Error('购买积分失败');
      }
      
      setTimeout(() => {
        setShowSuccessMessage(false);
        setStatusMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error recording purchase:', err);
      setShowPayModal(false);
      setShowSuccessMessage(true);
      setStatusMessage('购买积分失败，请稍后重试');
      setTimeout(() => {
        setShowSuccessMessage(false);
        setStatusMessage('');
      }, 3000);
    }
  };

  const handleInfoFeePaymentSuccess = () => {
    setShowSuccessMessage(true);
    setStatusMessage('信息费支付成功！');
    setTimeout(() => {
      setShowSuccessMessage(false);
      setStatusMessage('');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">积分中心</h2>
        <div className="flex items-center bg-[#F52E6B] bg-opacity-10 text-[#F52E6B] px-3 py-1 rounded-full">
          <Coins className="h-4 w-4 mr-2" />
          <span className="font-medium">{loading ? '加载中...' : `${total} 积分`}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tabs for different sections */}
      {userRole === 'agent' && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('credits')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'credits'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              购买积分
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              积分记录
            </button>
            <button
              onClick={() => setActiveTab('info-fee-payment')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'info-fee-payment'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                旅游信息费
              </div>
            </button>
            <button
              onClick={() => setActiveTab('info-fee-history')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'info-fee-history'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                旅游费记录
              </div>
            </button>
            <button
              onClick={() => setActiveTab('enterprise-fee-payment')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'enterprise-fee-payment'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                团建信息费
              </div>
            </button>
            <button
              onClick={() => setActiveTab('enterprise-fee-history')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'enterprise-fee-history'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                团建费记录
              </div>
            </button>
          </nav>
        </div>
      )}
      
      {/* For non-agent users, show simplified tabs */}
      {userRole !== 'agent' && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('credits')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'credits'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              购买积分
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 text-sm font-medium border-b-2 px-1 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-[#F52E6B] text-[#F52E6B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              积分记录
            </button>
          </nav>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'credits' && (
        <>
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">每次生成旅行计划需要消耗 <strong>50 积分</strong>，新用户赠送 <strong>100 积分</strong>（可免费使用 2 次）</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-700">购买积分</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`border rounded-lg p-4 relative ${
                    pkg.recommended ? 'border-[#F52E6B] border-2' : 'border-gray-200'
                  }`}
                >
                  {pkg.recommended && (
                    <span className="absolute -top-3 left-4 bg-[#F52E6B] text-white text-xs px-2 py-1 rounded-full">
                      推荐
                    </span>
                  )}
                  {pkg.bestValue && (
                    <span className="absolute -top-3 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      划算
                    </span>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                      <div className="flex items-center mt-1">
                        <Coins className="h-4 w-4 text-[#F52E6B] mr-1" />
                        <span className="text-[#F52E6B] font-medium">{pkg.total} 积分</span>
                        <span className="mx-2 text-gray-400">|</span>
                        <span className="text-gray-500 text-sm">可使用 {pkg.usageCount} 次</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        单次成本: ¥{pkg.costPerUse}/次
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-gray-900">¥{pkg.price}</span>
                      <button
                        onClick={() => handlePurchase(pkg)}
                        className="mt-2 bg-[#F52E6B] text-white px-4 py-1 rounded-lg hover:bg-[#FE6587] transition-colors text-sm flex items-center"
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        立即购买
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-500 mt-4">
              <p>积分可用于生成定制旅行计划，每次消耗 50 分</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-700">积分记录</h3>
          <CreditHistory />
        </div>
      )}

      {activeTab === 'info-fee-payment' && (
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-700">旅游套餐信息费支付</h3>
          <InfoFeePaymentForm 
            orderId={orderId} 
            onSuccess={handleInfoFeePaymentSuccess}
          />
        </div>
      )}

      {activeTab === 'info-fee-history' && (
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-700">旅游套餐信息费记录</h3>
          <InfoFeeHistoryTable />
        </div>
      )}

      {activeTab === 'enterprise-fee-payment' && (
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-700">企业团建信息费支付</h3>
          <EnterpriseInfoFeePaymentForm 
            orderId={enterpriseOrderId} 
            onSuccess={handleInfoFeePaymentSuccess}
          />
        </div>
      )}

      {activeTab === 'enterprise-fee-history' && (
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-700">企业团建信息费记录</h3>
          <EnterpriseInfoFeeHistoryTable />
        </div>
      )}

      {/* Wechat Pay Modal */}
      {selectedPackage && (
        <WechatPayModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          amount={selectedPackage.price}
          productName={`${selectedPackage.name}（${selectedPackage.total}积分）`}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
