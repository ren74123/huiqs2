import React, { useState } from 'react';
import { Package, Briefcase } from 'lucide-react';
import { Orders } from './Orders';
import { EnterpriseOrders } from './EnterpriseOrders';

export function OrderTabs() {
  const [activeTab, setActiveTab] = useState<'regular' | 'enterprise'>('regular');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('regular')}
            className={`py-4 text-sm font-medium border-b-2 px-1 ${
              activeTab === 'regular'
                ? 'border-[#F52E6B] text-[#F52E6B]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              <span>旅行套餐订单</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('enterprise')}
            className={`py-4 text-sm font-medium border-b-2 px-1 ${
              activeTab === 'enterprise'
                ? 'border-[#F52E6B] text-[#F52E6B]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Briefcase className="h-4 w-4 mr-2" />
              <span>企业团建订单</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'regular' ? <Orders /> : <EnterpriseOrders />}
    </div>
  );
}