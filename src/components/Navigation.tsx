import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plane, Package, User, Map } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { MessageBadge } from './MessageBadge';

export function Navigation() {
  const location = useLocation();
  const { user } = useAuthStore();
  
  const navItems = [
    {
      path: '/',
      icon: Plane,
      label: '首页'
    },
    {
      path: '/plan',
      icon: Map,
      label: '制定计划'
    },
    {
      path: '/packages',
      icon: Package,
      label: '旅行套餐'
    },
    {
      path: '/profile',
      icon: User,
      label: '我的'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-screen-xl mx-auto overflow-x-auto">
        <div className="flex items-center h-16 px-4">
          <div className="flex space-x-8 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex flex-col items-center space-y-1 min-w-[64px] ${
                  location.pathname === item.path ? 'text-[#F52E6B]' : 'text-gray-600'
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs whitespace-nowrap">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}