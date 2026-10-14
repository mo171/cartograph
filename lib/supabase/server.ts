import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

// Every request carries the Clerk session token, so policies can read the
// organization claim off it. Supabase never owns a session here: passing
// `accessToken` disables supabase-js's own auth and cookie handling.
export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const { getToken } = await auth();
  return createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { accessToken: async () => (await getToken()) ?? null },
  );
}
