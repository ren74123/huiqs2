import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Trash2, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
  sender: {
    full_name: string;
    avatar_url: string;
  };
  receiver: {
    full_name: string;
    avatar_url: string;
  };
}

export function MessageDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchMessage();
  }, [user, id, navigate]);

  async function checkAdminAccess() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user?.id)
      .single();

    if (profile?.user_role !== 'admin') {
      navigate('/');
    }
  }

  async function fetchMessage() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url),
          receiver:profiles!receiver_id(full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setMessage(data);

      // Mark as read if unread
      if (data && !data.read) {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('id', id);
      }
    } catch (error) {
      console.error('Error fetching message:', error);
      navigate('/admin/messages');
    } finally {
      setLoading(false);
    }
  }

  async function handleReply() {
    if (!message || !replyContent.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: message.sender_id,
          content: replyContent,
          type: 'system',
          read: false
        });

      if (error) throw error;
      setReplyContent('');
      navigate('/admin/messages');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('回复失败，请重试');
    }
  }

  async function handleDelete() {
    if (!window.confirm('确定要删除此消息吗？此操作不可撤销。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      navigate('/admin/messages');
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('删除失败，请重试');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">消息不存在</h2>
          <button
            onClick={() => navigate('/admin/messages')}
            className="text-[#F52E6B] hover:text-[#FE6587]"
          >
            返回消息列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/messages')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">消息详情</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDelete}
                className="bg-red-100 text-red-600 hover:bg-red-200 p-2 rounded-lg"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <img
              src={message.sender.avatar_url || 'https://via.placeholder.com/40'}
              alt={message.sender.full_name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <div className="flex items-center">
                <h3 className="font-medium text-gray-900">
                  {message.sender.full_name}
                </h3>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  message.type === 'system'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {message.type === 'system' ? '系统' : '用户'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Reply Form */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              回复消息
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="输入回复内容..."
                className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
              />
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="h-5 w-5" />
                <span>回复</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}