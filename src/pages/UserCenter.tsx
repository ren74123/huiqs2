import React, { useState } from 'react';
import { Package, Map, Building2, Settings, MessageSquare } from 'lucide-react';
import { Orders } from '../components/user/Orders';
import { TravelPlans } from '../components/user/TravelPlans';
import { Messages } from '../components/user/Messages';
import { UserSettings } from '../components/user/UserSettings';
import { useAuthStore } from '../store/auth';

export function UserCenter() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'plans' | 'messages' | 'settings'>('orders');

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">请先登录</h2>
          <p className="text-gray-600">您需要登录后才能访问个人中心</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'orders',
      label: '我的订单',
      icon: Package,
      color: 'text-blue-500 bg-blue-100',
    },
    {
      id: 'plans',
      label: '我的行程',
      icon: Map,
      color: 'text-green-500 bg-green-100',
    },
    {
      id: 'messages',
      label: '消息',
      icon: MessageSquare,
      color: 'text-purple-500 bg-purple-100',
    },
    {
      id: 'settings',
      label: '设置',
      icon: Settings,
      color: 'text-gray-500 bg-gray-100',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] p-6 text-white">
          <h1 className="text-2xl font-bold">个人中心</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#F52E6B] bg-opacity-10'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-full ${tab.color} flex items-center justify-center mb-2`}>
                <tab.icon className="h-6 w-6" />
              </div>
              <span className={`text-sm font-medium ${
                activeTab === tab.id ? 'text-[#F52E6B]' : 'text-gray-600'
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6">
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'plans' && <TravelPlans />}
          {activeTab === 'messages' && <Messages />}
          {activeTab === 'settings' && <UserSettings />}
        </div>
      </div>
    </div>
  );
}