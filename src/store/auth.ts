import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { setItem, removeItem, getItem } from '../utils/storage.web';

interface User {
  id: string;
  email: string | null;
  phone: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

// Key for storing user data in local storage
const USER_STORAGE_KEY = 'supabase_user';
const SESSION_STORAGE_KEY = 'supabase_session';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => {
    // When setting the user, also store in localStorage for persistence
    if (user) {
      setItem(USER_STORAGE_KEY, user);
    } else {
      removeItem(USER_STORAGE_KEY);
    }
    set({ user });
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data: { session, user } } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!user) {
        throw new Error('登录失败，请稍后重试');
      }

      // Get user role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Sign out the user if we can't get their role
        await supabase.auth.signOut();
        throw new Error('获取用户信息失败，请重试');
      }

      // Store session in local storage
      if (session) {
        setItem(SESSION_STORAGE_KEY, session);
      }

      // Create user object
      const userData = {
        id: user.id,
        email: user.email,
        phone: user.phone
      };

      // Store user data in local storage
      setItem(USER_STORAGE_KEY, userData);

      // Set user state
      set({ user: userData });

      return profile.user_role;
    } catch (error: any) {
      console.error('Sign in error:', error);
      // Ensure we sign out the user on any error
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('Error during sign out after failed sign in:', signOutError);
      }
      throw error;
    }
  },

  signOut: async () => {
    try {
      // First clear the local state
      set({ user: null });
      
      // Remove session and user data from local storage
      removeItem(SESSION_STORAGE_KEY);
      removeItem(USER_STORAGE_KEY);
      
      // Then attempt to sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out error:', error);
      // Even if there's an error, we want to ensure the local state is cleared
      set({ user: null });
      removeItem(SESSION_STORAGE_KEY);
      removeItem(USER_STORAGE_KEY);
    }
  },

  updateProfile: async (data) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', data.id!)
        .single();
        
      if (error) throw error;
      
      // Update local state
      set((state) => {
        const updatedUser = state.user ? { ...state.user, ...data } : null;
        
        // Also update in localStorage
        if (updatedUser) {
          setItem(USER_STORAGE_KEY, updatedUser);
        }
        
        return { user: updatedUser };
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
}));

// Initialize auth state
export const initializeAuth = async () => {
  try {
    // First try to get user from localStorage for immediate UI update
    const storedUser = getItem(USER_STORAGE_KEY);
    if (storedUser) {
      useAuthStore.setState({
        user: storedUser,
        loading: false,
      });
    }

    // Then verify with Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // If we have a session, get the user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update localStorage with fresh data
        const userData = {
          id: user.id,
          email: user.email,
          phone: user.phone
        };
        
        setItem(USER_STORAGE_KEY, userData);
        setItem(SESSION_STORAGE_KEY, session);

        useAuthStore.setState({
          user: userData,
          loading: false,
        });
      } else {
        // No user but session exists - clear everything
        removeItem(USER_STORAGE_KEY);
        removeItem(SESSION_STORAGE_KEY);
        useAuthStore.setState({ user: null, loading: false });
      }
    } else {
      // Try to refresh the session using stored session
      const storedSession = getItem(SESSION_STORAGE_KEY);
      
      if (storedSession && storedSession.refresh_token) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: storedSession.refresh_token
          });
          
          if (!refreshError && refreshData.session && refreshData.user) {
            // Session refreshed successfully
            setItem(SESSION_STORAGE_KEY, refreshData.session);
            
            const userData = {
              id: refreshData.user.id,
              email: refreshData.user.email,
              phone: refreshData.user.phone
            };
            
            setItem(USER_STORAGE_KEY, userData);
            
            useAuthStore.setState({
              user: userData,
              loading: false,
            });
            
            return;
          }
        } catch (refreshError) {
          console.warn('Error refreshing session:', refreshError);
        }
      }
      
      // No valid session - clear everything
      removeItem(USER_STORAGE_KEY);
      removeItem(SESSION_STORAGE_KEY);
      useAuthStore.setState({ user: null, loading: false });
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    // On error, clear state and storage
    removeItem(USER_STORAGE_KEY);
    removeItem(SESSION_STORAGE_KEY);
    useAuthStore.setState({ user: null, loading: false });
  }
};

// Call initializeAuth when the app starts
initializeAuth();