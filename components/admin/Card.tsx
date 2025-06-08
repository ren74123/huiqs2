import React from 'react';

interface CardProps {
  title: string;
  value: any;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ title, value, icon, iconBgColor, iconColor, onClick }) => {
  return (
    <div className="rounded-lg p-4 shadow-md cursor-pointer" onClick={onClick}>
      <div className={`flex items-center mb-2`}>
        <div className={`mr-2 p-2 rounded-full ${iconBgColor}`}>
          {icon}
        </div>
        <div className="text-xl font-bold">{title}</div>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
};

export default Card;
