import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import { isValidUUID } from '@/utils/validation';

interface MessageBadgeProps {
  onClick?: () => void;
}

export function MessageBadge({ onClick }: MessageBadgeProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // Start with 2 seconds
  const FETCH_TIMEOUT = 10000; // 10 second timeout

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Subscribe to changes
      const channel = supabase
        .channel('messages_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      // Also subscribe to system messages for admins and agents
      const systemChannel = supabase
        .channel('system_messages_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `type=eq.system`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      // Subscribe to message updates (for read status changes)
      const updateChannel = supabase
        .channel('message_updates_channel')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      // Subscribe to enterprise orders for agents
      const enterpriseOrdersChannel = supabase
        .channel('enterprise_orders_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'enterprise_orders',
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      // Subscribe to order status changes
      const orderStatusChannel = supabase
        .channel('order_status_channel')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `status=in.(contacted,rejected)`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      // Set up interval to refresh unread count every 30 seconds
      const intervalId = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(systemChannel);
        supabase.removeChannel(updateChannel);
        supabase.removeChannel(enterpriseOrdersChannel);
        supabase.removeChannel(orderStatusChannel);
        clearInterval(intervalId);
        setRetryCount(0); // Reset retry count on cleanup
      };
    }
  }, [user]);

  const fetchWithTimeout = async (promise: Promise<any>) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), FETCH_TIMEOUT);
    });
    return Promise.race([promise, timeoutPromise]);
  };

  const fetchUnreadCount = async () => {
    if (!user || !isValidUUID(user.id)) return;
    
    // Check if online
    if (!navigator.onLine) {
      console.log('Device is offline, skipping fetch');
      return;
    }
    
    // Prevent too frequent fetches
    const now = Date.now();
    if (now - lastFetchTime < 2000) return; // Throttle to once per 2 seconds
    setLastFetchTime(now);
    
    try {
      // Get the current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await fetchWithTimeout(
        supabase.auth.getSession()
      );
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error('No valid session found');
      }

      // First check for direct messages
      const { count: directCount, error: directError } = await fetchWithTimeout(
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('read', false)
      );
      
      if (directError) {
        throw new Error(`Direct messages error: ${directError.message}`);
      }
      
      // Then check for system messages based on user role
      const { data: profile, error: profileError } = await fetchWithTimeout(
        supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .single()
      );
        
      if (profileError) {
        throw new Error(`Profile error: ${profileError.message}`);
      }
        
      let systemCount = 0;
      
      if (profile?.user_role === 'admin' || profile?.user_role === 'agent') {
        const { count: sysCount, error: sysError } = await fetchWithTimeout(
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'system')
            .eq('read', false)
        );
          
        if (sysError) {
          throw new Error(`System messages error: ${sysError.message}`);
        }
        
        systemCount = sysCount || 0;
      }
      
      // For agents, also check for enterprise orders
      let enterpriseCount = 0;
      if (profile?.user_role === 'agent') {
        const { count: entCount, error: entError } = await fetchWithTimeout(
          supabase
            .from('enterprise_orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved')
            .not('has_paid_info_fee', 'is', true)
        );
          
        if (entError) {
          throw new Error(`Enterprise orders error: ${entError.message}`);
        }
        
        enterpriseCount = entCount || 0;
      }

      // For agents, check for order status updates
      let orderUpdateCount = 0;
      if (profile?.user_role === 'agent') {
        const { count: orderCount, error: orderError } = await fetchWithTimeout(
          supabase
            .from('message_logs')
            .select(`
              *,
              orders!inner(
                travel_packages!inner(agent_id)
              )
            `, { count: 'exact', head: true })
            .eq('orders.travel_packages.agent_id', user.id)
            .eq('read', false)
        );
            
        if (orderError) {
          throw new Error(`Order updates error: ${orderError.message}`);
        }
        
        orderUpdateCount = orderCount || 0;
      }
      
      // Reset retry count on successful fetch
      setRetryCount(0);
      
      // Set the total count
      const totalCount = (directCount || 0) + systemCount + enterpriseCount + orderUpdateCount;
      setCount(totalCount);

    } catch (error) {
      console.error('Error fetching unread messages:', error);
      
      // Implement exponential backoff with max retries
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return fetchUnreadCount();
      } else {
        console.error('Max retries reached, giving up');
        setRetryCount(0); // Reset for next time
      }
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/messages');
    }
  };

  return (
    <button onClick={handleClick} className="relative p-2 rounded-full hover:bg-gray-100 transition">
      <Bell className="w-6 h-6 text-gray-600" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}