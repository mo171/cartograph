/**
 * Environment configuration validator.
 * Fails loudly at startup if any required environment variable is missing.
 */

function requireEnv(key: string, fallbackKey?: string): string {
  const val = process.env[key] || (fallbackKey ? process.env[fallbackKey] : undefined);
  if (!val || val.trim() === '') {
    throw new Error(
      `[Cartograph Boot Error] Missing required environment variable: ${key}${
        fallbackKey ? ` (or ${fallbackKey})` : ''
      }`
    );
  }
  return val.trim();
}

export const env = {
  get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY(): string {
    return requireEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  },
  get CLERK_SECRET_KEY(): string {
    return requireEnv('CLERK_SECRET_KEY');
  },
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  },
  get APP_URL(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  },
  validate(): void {
    // Access every required property to trigger validation immediately
    void this.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    void this.CLERK_SECRET_KEY;
    void this.NEXT_PUBLIC_SUPABASE_URL;
    void this.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
};

