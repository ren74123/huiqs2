import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MessageSquare, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'system' | 'user' | 'agent';
  read: boolean;
  created_at: string;
  source_type?: string;
  source_id?: string;
  source_link?: string;
  sender: {
    full_name: string;
    avatar_url: string;
    user_role: string;
  };
  receiver: {
    full_name: string;
    avatar_url: string;
  };
}

export function AdminMessages() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageType, setMessageType] = useState<'all' | 'system' | 'user' | 'agent'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchMessages();
  }, [user, navigate, messageType]);

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

  async function fetchMessages() {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(
            full_name,
            avatar_url,
            user_role
          ),
          receiver:profiles!receiver_id(
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (messageType !== 'all') {
        query = query.eq('type', messageType);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Mark system messages as read when admin views them
      if (data && data.length > 0) {
        const systemMessages = data.filter(msg => 
          msg.type === 'system' && !msg.read
        );
        
        if (systemMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', systemMessages.map(msg => msg.id));
        }
      }
      
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }

  const getMessageSource = (message: Message) => {
    if (!message.source_type) return null;

    switch (message.source_type) {
      case 'order':
        return {
          text: `订单 #${message.source_id}`,
          link: `/admin/orders/${message.source_id}`
        };
      case 'package':
        return {
          text: `套餐 #${message.source_id}`,
          link: `/admin/packages/${message.source_id}`
        };
      case 'application':
        return {
          text: `旅行社申请 #${message.source_id}`,
          link: `/admin/agents/${message.source_id}`
        };
      default:
        return null;
    }
  };

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.sender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.receiver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMessageClick = async (message: Message) => {
    // Mark message as read if it's not already
    if (!message.read) {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', message.id);
    }
    
    navigate(`/admin/messages/${message.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader 
        title="消息管理"
        subtitle="管理系统消息"
      />

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索消息内容或用户..."
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-4 flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-5 w-5 mr-2" />
              筛选
            </button>
          </div>

          <div className={`mt-4 ${showFilters ? 'block' : 'hidden'}`}>
            <div className="flex space-x-2">
              {['all', 'system', 'user', 'agent'].map((type) => (
                <button
                  key={type}
                  onClick={() => setMessageType(type as any)}
                  className={`px-4 py-2 rounded-lg ${
                    messageType === type
                      ? 'bg-[#F52E6B] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' ? '全部' :
                   type === 'system' ? '系统消息' :
                   type === 'user' ? '用户消息' : '旅行社消息'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无消息</p>
            </div>
          ) : (
            filteredMessages.map((message) => {
              const source = getMessageSource(message);
              return (
                <div
                  key={message.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!message.read ? 'bg-blue-50' : ''}`}
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={message.sender.avatar_url || 'https://via.placeholder.com/40'}
                      alt={message.sender.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900">
                            {message.sender.full_name}
                          </h3>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            message.type === 'system'
                              ? 'bg-blue-100 text-blue-800'
                              : message.type === 'agent'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {message.type === 'system' ? '系统' :
                             message.type === 'agent' ? '旅行社' : '用户'}
                          </span>
                          {source && (
                            <a
                              href={source.link}
                              className="ml-2 text-xs text-[#F52E6B] hover:text-[#FE6587]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {source.text}
                            </a>
                          )}
                          {!message.read && (
                            <span className="ml-2 w-2 h-2 bg-[#F52E6B] rounded-full"></span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 break-words">
                        {message.content}
                      </p>
                      {message.receiver && (
                        <p className="mt-1 text-xs text-gray-500">
                          发送给: {message.receiver.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}