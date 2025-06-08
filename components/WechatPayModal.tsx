import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface WechatPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  productName: string;
  onSuccess: () => void;
}

export function WechatPayModal({ isOpen, onClose, amount, productName, onSuccess }: WechatPayModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [countdown, setCountdown] = useState(120);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const successCallbackRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledSuccessRef = useRef(false);

  // Reset processing state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      hasCalledSuccessRef.current = false;
    }
    
    // Cleanup function to clear any pending callbacks when component unmounts or modal closes
    return () => {
      if (successCallbackRef.current) {
        clearTimeout(successCallbackRef.current);
        successCallbackRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setStatus('loading');
      // Simulate generating QR code
      const qrCodeTimer = setTimeout(() => {
        setStatus('idle');
        setQrCodeUrl('https://images.unsplash.com/photo-1672502642555-e4b3b2e0e5c8?q=80&w=1000&auto=format&fit=crop');
        startCountdown();
      }, 1000);
      
      return () => {
        clearTimeout(qrCodeTimer);
      };
    }
  }, [isOpen]);

  const startCountdown = () => {
    setCountdown(120);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Simulate payment success after random time
    const successTimer = setTimeout(() => {
      setStatus('success');
      clearInterval(timer);
      
      // Call onSuccess after showing success message - ONLY ONCE
      if (successCallbackRef.current) {
        clearTimeout(successCallbackRef.current);
      }
      
      successCallbackRef.current = setTimeout(() => {
        // Use ref to ensure we only call onSuccess once per modal session
        if (!hasCalledSuccessRef.current) {
          console.log('Processing payment success callback');
          hasCalledSuccessRef.current = true;
          onSuccess();
        } else {
          console.log('Payment success callback already processed, skipping');
        }
      }, 1500);
    }, Math.random() * 5000 + 3000); // Random time between 3-8 seconds

    return () => {
      clearInterval(timer);
      clearTimeout(successTimer);
      if (successCallbackRef.current) {
        clearTimeout(successCallbackRef.current);
      }
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={status === 'loading'}
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">微信支付</h2>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">商品</span>
            <span className="font-medium">{productName}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-gray-700 font-medium">支付金额</span>
            <span className="text-xl font-bold text-[#F52E6B]">¥{amount}</span>
          </div>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#F52E6B] border-t-transparent"></div>
            <p className="mt-4 text-gray-600">正在生成支付二维码...</p>
          </div>
        )}

        {status === 'idle' && qrCodeUrl && (
          <div className="flex flex-col items-center">
            <div className="bg-white p-2 border border-gray-200 rounded-lg mb-4">
              <img 
                src={qrCodeUrl} 
                alt="微信支付二维码" 
                className="w-48 h-48 object-cover"
              />
            </div>
            <p className="text-sm text-gray-600 mb-2">请使用微信扫一扫，扫描二维码完成支付</p>
            <p className="text-sm text-gray-500">二维码有效期：{Math.floor(countdown / 60)}:{countdown % 60 < 10 ? '0' : ''}{countdown % 60}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-6">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">支付成功</h3>
            <p className="text-gray-600">您的积分已添加到账户</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-6">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">支付失败</h3>
            <p className="text-gray-600 mb-4">请重新尝试支付</p>
            <button
              onClick={() => {
                setStatus('idle');
                startCountdown();
              }}
              className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587]"
            >
              重新支付
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
