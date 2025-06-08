import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Edit, Trash2, MapPin, Clock, User, Filter, Tag, Calendar, Globe, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

interface TravelPackage {
  id: string;
  title: string;
  description: string;
  content: string;
  image: string;
  price: number;
  duration: number;
  destination: string;
  departure: string;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  created_at: string;
  expire_at?: string;
  is_discounted: boolean;
  original_price?: number;
  discount_price?: number;
  discount_expires_at?: string;
  is_international: boolean;
  agent: {
    full_name: string;
    agency_id?: string;
  } | null;
}

export function MyPackages() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'archived' | 'rejected'>('all');

  useEffect(() => {
    if (user) {
      fetchPackages();
    }
  }, [user, statusFilter]);

  async function fetchPackages() {
    try {
      let query = supabase
        .from('travel_packages')
        .select('*')
        .eq('agent_id', user?.id)
        .order('created_at', { ascending: false });

      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Check for expired packages and update their status if needed
      const updatedPackages = await Promise.all((data || []).map(async (pkg) => {
        // Check if package is expired but not yet marked as archived
        if (pkg.status === 'approved' && pkg.expire_at && new Date(pkg.expire_at) < new Date() && pkg.status !== 'archived') {
          // Update the package status to archived in the database
          const { error: updateError } = await supabase
            .from('travel_packages')
            .update({ status: 'archived' })
            .eq('id', pkg.id);
            
          if (updateError) {
            console.error('Error updating expired package:', updateError);
            return pkg;
          }
          
          // Return the updated package with archived status
          return { ...pkg, status: 'archived' };
        }
        
        // Check if discount has expired
        if (pkg.is_discounted && pkg.discount_expires_at && new Date(pkg.discount_expires_at) < new Date()) {
          // Update the package to remove discount
          const { error: updateError } = await supabase
            .from('travel_packages')
            .update({ 
              is_discounted: false,
              price: pkg.original_price
            })
            .eq('id', pkg.id);
            
          if (updateError) {
            console.error('Error updating expired discount:', updateError);
            return pkg;
          }
          
          // Return the updated package with discount removed
          return { 
            ...pkg, 
            is_discounted: false,
            price: pkg.original_price
          };
        }
        
        return pkg;
      }));
      
      setPackages(updatedPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('确定要删除此套餐吗？此操作不可撤销。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('travel_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPackages(packages.filter(pkg => pkg.id !== id));
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('删除失败，请重试');
    }
  }

  const handleEdit = (id: string) => {
    navigate(`/dashboard/edit/${id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">已通过</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">已拒绝</span>;
      case 'archived':
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">已下架</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">审核中</span>;
    }
  };

  // Check if a package is expired
  const isExpired = (pkg: TravelPackage) => {
    if (!pkg.expire_at) return false;
    return new Date(pkg.expire_at) < new Date();
  };

  // Check if a package is still in discount period
  const isDiscountActive = (pkg: TravelPackage) => {
    return pkg.is_discounted && 
           pkg.discount_expires_at && 
           new Date(pkg.discount_expires_at) > new Date();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">我的套餐</h1>
        <button
          onClick={() => navigate('/dashboard/publish')}
          className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors"
        >
          发布新套餐
        </button>
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex items-center space-x-2">
        <Filter className="h-5 w-5 text-gray-400" />
        <div className="flex space-x-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'pending', label: '审核中' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已拒绝' },
            { value: 'archived', label: '已下架' }
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value as any)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                statusFilter === status.value
                  ? 'bg-[#F52E6B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无套餐</h3>
          <p className="mt-1 text-sm text-gray-500">开始创建您的第一个旅行套餐</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow relative"
            >
              {/* Status badges */}
              <div className="absolute top-4 right-4 z-10">
                {getStatusBadge(pkg.status)}
              </div>

              {/* Discount badge */}
              {isDiscountActive(pkg) && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-lg text-xs z-10">
                  限时特价
                </div>
              )}

              {/* International badge */}
              {pkg.is_international && (
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-2 py-1 rounded-lg text-xs z-10">
                  境外游
                </div>
              )}

              {/* Expired badge */}
              {isExpired(pkg) && pkg.status === 'approved' && (
                <div className="absolute top-4 left-4 bg-gray-500 text-white px-2 py-1 rounded-lg text-xs z-10">
                  已过期
                </div>
              )}

              <div className="relative h-48">
                <img
                  src={pkg.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800'}
                  alt={pkg.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-full shadow-md">
                  {isDiscountActive(pkg) ? (
                    <div className="flex items-center">
                      <span className="text-gray-400 line-through text-xs mr-1">¥{pkg.original_price}</span>
                      <span className="text-[#F52E6B] font-semibold">¥{pkg.discount_price}</span>
                    </div>
                  ) : (
                    <span className="text-[#F52E6B] font-semibold">¥{pkg.price}</span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {pkg.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {pkg.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-500 text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{pkg.departure || '未设置'} → {pkg.destination}</span>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{pkg.duration} 天</span>
                  </div>
                  {pkg.expire_at && (
                    <div className="flex items-center text-gray-500 text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>下架时间: {new Date(pkg.expire_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {pkg.status === 'archived' && (
                    <div className="flex items-center text-gray-500 text-sm">
                      <Archive className="h-4 w-4 mr-2" />
                      <span>已下架</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(pkg.id)}
                    className="p-2 text-gray-600 hover:text-[#F52E6B] transition-colors"
                    title="编辑"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}