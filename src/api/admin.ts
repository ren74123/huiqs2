import { supabase } from '../lib/supabase';

export async function listUsers(searchTerm: string) {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    throw error;
  }

  if (searchTerm) {
    return {
      users: users.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    };
  }

  return { users };
}