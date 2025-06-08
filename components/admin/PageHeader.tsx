import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
}

export function PageHeader({ title, subtitle, actions, showBack = true }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Get base admin path
    const adminPath = location.pathname.split('/').slice(0, 3).join('/');
    navigate(adminPath);
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center">
        {showBack && (
          <button
            onClick={handleBack}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center space-x-4">
          {actions}
        </div>
      )}
    </div>
  );
}