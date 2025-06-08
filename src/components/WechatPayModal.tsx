import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      setStatus('loading');
      // Simulate generating QR code
      setTimeout(() => {
        setStatus('idle');
        setQrCodeUrl('https://images.unsplash.com/photo-1672502642555-e4b3b2e0e5c8?q=80&w=1000&auto=format&fit=crop');
        startCountdown();
      }, 1000);
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
      
      // Call onSuccess after showing success message
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }, Math.random() * 5000 + 3000); // Random time between 3-8 seconds

    return () => {
      clearInterval(timer);
      clearTimeout(successTimer);
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
          <div className="flex justify-between items-center">
            <span className="text-gray-600">金额</span>
            <span className="font-medium text-lg">¥{amount.toFixed(2)}</span>
          </div>
        </div>

        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">正在生成支付二维码...</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg shadow-inner mb-4">
              <img src={qrCodeUrl} alt="微信支付二维码" className="w-48 h-48 mx-auto" />
            </div>
            <p className="text-gray-600 mb-2">请使用微信扫描二维码完成支付</p>
            <p className="text-sm text-gray-500">二维码有效期：{countdown}秒</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">支付成功</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">支付失败</p>
            <p className="text-gray-600 mt-2">请重新尝试或联系客服</p>
          </div>
        )}
      </div>
    </div>
  );
}