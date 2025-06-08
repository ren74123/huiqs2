import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, Calendar, Package, Edit, Trash2, MapPin, Clock, AlertCircle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';
import { DatePicker } from '../../components/DatePicker';

interface TravelPackage {
  id: string;
  title: string;
  description: string;
  content: string;
  image: string;
  price: number;
  duration: number;
  destination: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  agent_id: string;
  agent: {
    full_name: string;
    agency_id?: string;
  };
}

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: 'approved' | 'rejected', note: string) => void;
  packageTitle: string;
  hasExistingPackage?: boolean;
}

function ReviewDialog({ isOpen, onClose, onConfirm, packageTitle, hasExistingPackage }: ReviewDialogProps) {
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (status === 'rejected' && (!note || note.trim() === '')) {
      setError('拒绝时必须填写审核备注');
      return;
    }
    if (status === 'approved' && hasExistingPackage) {
      setError('该旅行社已有一个已通过的套餐，请先拒绝现有套餐');
      return;
    }
    setError(null);
    onConfirm(status, note);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">审核套餐</h2>
          <p className="mt-1 text-sm text-gray-500">{packageTitle}</p>
          {hasExistingPackage && (
            <p className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              提示：该旅行社已有一个已通过的套餐
            </p>
          )}
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                审核结果
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setStatus('approved')}
                  className={`px-4 py-2 rounded-lg ${
                    status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  通过
                </button>
                <button
                  onClick={() => setStatus('rejected')}
                  className={`px-4 py-2 rounded-lg ${
                    status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  拒绝
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                审核备注 {status === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className={`w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent`}
                placeholder="请输入审核意见..."
              />
              {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-white ${
              status === 'approved'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPackages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [searchTe