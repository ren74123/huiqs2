import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Settings } from 'lucide-react';

export function AgentDashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] p-6 text-white">
          <h1 className="text-2xl font-bold">旅行社管理后台</h1>
        </div>

        {/* Quick Actions */}
        <div className="p-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/dashboard/publish')}
            className="flex flex-col items-center justify-center p-6 bg-[#F52E6B] bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors"
          >
            <Package className="h-8 w-8 text-[#F52E6B] mb-2" />
            <span className="text-[#F52E6B] font-medium">发布套餐</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/my-packages')}
            className="flex flex-col items-center justify-center p-6 bg-[#F52E6B] bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors"
          >
            <Settings className="h-8 w-8 text-[#F52E6B] mb-2" />
            <span className="text-[#F52E6B] font-medium">套餐管理</span>
          </button>
        </div>

        {/* Admin Entry */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/agent/console')}
            className="w-full bg-[#F52E6B] text-white font-medium py-3 px-4 rounded-lg hover:bg-[#FE6587] transition-colors"
          >
            进入管理后台
          </button>
        </div>
      </div>
    </div>
  );
}