import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (!url || !anonKey) {
  if (import.meta.env.DEV) {
    console.warn(
      '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Supabase Auth will be disabled.'
    );
  }
} else {
  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Singleton Supabase client. Null when the required environment variables are
 * missing, so callers must handle the disabled-auth case gracefully.
 */
export const supabase = client;
