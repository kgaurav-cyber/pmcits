import { createClient } from '@supabase/supabase-js';
import { dbConfig } from './database';

const supabaseUrl = dbConfig.supabaseUrl;
const supabaseServiceKey = dbConfig.supabaseServiceKey;
const supabaseAnonKey = dbConfig.supabaseAnonKey;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

// Create a Supabase Client with the service role key to bypass RLS for administrative backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create a client scoped to a user's JWT token
export const getSupabaseUserClient = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

