import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

/**
 * Creates a server-side Supabase client carrying the user's signed-in Clerk JWT.
 * 
 * Architectural decisions:
 * 1. The token is attached via Authorization header so Postgres RLS policies
 *    can read auth.jwt() claims (user_id, org_id) directly.
 * 2. Session management, refresh and cookies belong strictly to Clerk.
 *    Supabase session persistence and auto-refresh are disabled to prevent cookie collisions.
 * 3. Server-only execution ensures tokens are never exposed to browser bundles.
 */
export async function createServerDatabaseClient(): Promise<SupabaseClient> {
  const { getToken } = await auth();

  // Try the custom 'supabase' template if configured, otherwise fall back to session token
  let token: string | null = null;
  try {
    token = await getToken({ template: 'supabase' });
  } catch {
    token = await getToken();
  }
  if (!token) {
    token = await getToken();
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

