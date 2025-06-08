import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  description?: string;
  onClick?: () => void;
}

export function Card({ 
  title, 
  value, 
  icon, 
  iconBgColor, 
  iconColor, 
  description,
  onClick 
}: CardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl p-6 shadow hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`${iconBgColor} rounded-xl p-3`}>
          {React.cloneElement(icon as React.ReactElement, {
            className: `h-6 w-6 ${iconColor}`
          })}
        </div>
        <ArrowUpRight className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}