import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// SECURITY: Service role key bypasses RLS — server-side only, never expose to client
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseServerClient(accessToken?: string): SupabaseClient | null {
  if (!supabaseUrl) return null;

  // Prefer service role key: bypasses RLS, security enforced via withAuth + user_id query filters
  if (supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // Fall back to anon key + user JWT (requires RLS policies to be applied)
  if (!supabaseAnonKey || !accessToken) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
