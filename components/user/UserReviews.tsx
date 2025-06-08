import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Package, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

interface Review {
  id: string;
  package_id: string;
  rating: number;
  comment: string;
  created_at: string;
  travel_packages: {
    id: string;
    title: string;
    image: string;
    destination: string;
    price: number;
  };
}

export function UserReviews() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editData, setEditData] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  async function fetchReviews() {
    try {
      const { data, error } = await supabase
        .from('package_reviews')
        .select(`
          *,
          travel_packages (
            id,
            title,
            image,
            destination,
            price
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleEditReview = (review: Review) => {
    setSelectedReview(review);
    setEditData({
      rating: review.rating,
      comment: review.comment || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('确定要删除此评价吗？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('package_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
      
      // Update local state
      setReviews(reviews.filter(review => review.id !== reviewId));
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('删除失败，请重试');
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedReview) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('package_reviews')
        .update({
          rating: editData.rating,
          comment: editData.comment
        })
        .eq('id', selectedReview.id);

      if (error) throw error;
      
      // Update local state
      setReviews(reviews.map(review => 
        review.id === selectedReview.id 
          ? { ...review, rating: editData.rating, comment: editData.comment }
          : review
      ));
      
      // Close modal
      setShowEditModal(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Error updating review:', error);
      alert('更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer' : ''}`}
            onClick={interactive ? () => setEditData({...editData, rating: star}) : undefined}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">您还没有发表任何评价</p>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的评价</h1>
      
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex">
              <img 
                src={review.travel_packages.image}
                alt={review.travel_packages.title}
                className="w-32 h-32 object-cover cursor-pointer"
                onClick={() => navigate(`/packages/${review.travel_packages.id}`)}
              />
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 
                      className="font-semibold text-gray-900 cursor-pointer hover:text-[#F52E6B]"
                      onClick={() => navigate(`/packages/${review.travel_packages.id}`)}
                    >
                      {review.travel_packages.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {review.travel_packages.destination} · ¥{review.travel_packages.price}
                    </p>
                    <div className="mt-2">
                      {renderStars(review.rating)}
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditReview(review)}
                      className="p-1 text-gray-400 hover:text-[#F52E6B]"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Review Modal */}
      {showEditModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">编辑评价</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评分
              </label>
              <div className="flex items-center">
                {renderStars(editData.rating, true)}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评价内容 (可选)
              </label>
              <textarea
                value={editData.comment}
                onChange={(e) => setEditData({...editData, comment: e.target.value})}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                rows={4}
                placeholder="分享您的体验..."
                maxLength={100}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {editData.comment.length}/100
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedReview(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmitEdit}
                disabled={submitting}
                className="px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
              >
                {submitting ? '提交中...' : '更新评价'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}