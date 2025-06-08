import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  targetDate: string;
  className?: string;
}

export function Countdown({ targetDate, className = '' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const difference = target.getTime() - now.getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return;
      }
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate]);

  if (isExpired) {
    return <span className={className}>已结束</span>;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <Clock className="h-3 w-3 mr-1" />
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}天 `}
        {timeLeft.hours.toString().padStart(2, '0')}:
        {timeLeft.minutes.toString().padStart(2, '0')}:
        {timeLeft.seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}