import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

interface FavoritePackage {
  id: string;
  package_id: string;
  created_at: string;
  travel_packages: {
    id: string;
    title: string;
    description: string;
    image: string;
    price: number;
    duration: number;
    destination: string;
    views: number;
    orders: number;
    favorites: number;
  };
}

export function UserFavorites() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState<FavoritePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  async function fetchFavorites() {
    try {
      const { data, error } = await supabase
        .from('package_favorites')
        .select(`
          *,
          travel_packages (
            id,
            title,
            description,
            image,
            price,
            duration,
            destination,
            views,
            orders,
            favorites
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUnfavorite = async (packageId: string) => {
    try {
      // First delete the favorite record
      const { error: deleteError } = await supabase
        .from('package_favorites')
        .delete()
        .eq('user_id', user?.id)
        .eq('package_id', packageId);

      if (deleteError) throw deleteError;

      // Then update the package's favorites count directly
      const { error: updateError } = await supabase
        .from('travel_packages')
        .update({ favorites: supabase.sql`favorites - 1` })
        .eq('id', packageId);

      if (updateError) throw updateError;

      // Remove from local state
      setFavorites(favorites.filter(fav => fav.package_id !== packageId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">您还没有收藏任何旅行套餐</p>
        <button
          onClick={() => navigate('/packages')}
          className="text-[#F52E6B] hover:text-[#FE6587] font-medium"
        >
          浏览套餐
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的收藏</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((favorite) => (
          <div
            key={favorite.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative h-48">
              <img
                src={favorite.travel_packages.image}
                alt={favorite.travel_packages.title}
                className="w-full h-full object-cover"
                onClick={() => navigate(`/packages/${favorite.travel_packages.id}`)}
              />
              <button
                onClick={() => handleUnfavorite(favorite.travel_packages.id)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md text-[#F52E6B] hover:bg-[#F52E6B] hover:text-white transition-colors"
              >
                <Heart className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <h3 
                className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-[#F52E6B]"
                onClick={() => navigate(`/packages/${favorite.travel_packages.id}`)}
              >
                {favorite.travel_packages.title}
              </h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-500 text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{favorite.travel_packages.destination}</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{favorite.travel_packages.duration} 天</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[#F52E6B] font-semibold">
                  ¥{favorite.travel_packages.price}
                </div>
                <div className="text-sm text-gray-500">
                  {favorite.travel_packages.views} 浏览 · {favorite.travel_packages.orders} 订单
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}