import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key must be provided');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Add longer refresh intervals
    flowType: 'pkce',
    storage: localStorage,
  },
  // Add global fetch with retry throttling
  global: {
    fetch: async (url, options) => {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry once
      if (response.status === 429) {
        console.warn('[Supabase] Rate limited, waiting 2s before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetch(url, options);
      }
      
      return response;
    },
  },
});