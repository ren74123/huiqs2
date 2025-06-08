import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminNavigation } from './Navigation';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { MessageBadge } from '../../components/MessageBadge';
import { Settings } from 'lucide-react';

export function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
  }, [user, navigate]);

  async function checkAdminAccess() {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error checking admin access:', error);
        navigate('/');
        return;
      }

      if (profile?.user_role !== 'admin') {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
            <div className="flex items-center space-x-4">
              <MessageBadge onClick={() => navigate('/admin/messages')} />
              <button 
                onClick={() => navigate('/profile')}
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <AdminNavigation />
      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
}