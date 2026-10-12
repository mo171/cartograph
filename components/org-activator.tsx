'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface OrgActivatorProps {
  orgId: string;
  slug: string;
}

/**
 * Activates the specified organization in the Clerk session once the session
 * is loaded in the browser, then routes to the organization's workspace.
 */
export function OrgActivator({ orgId, slug }: OrgActivatorProps) {
  const { isLoaded, sessionId } = useAuth();
  const { setActive } = useClerk();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function activate() {
      // Must wait for the client-side session to be fully loaded
      if (!isLoaded || !sessionId || !setActive) {
        return;
      }

      try {
        await setActive({ session: sessionId, organization: orgId });
        if (active) {
          router.replace(`/orgs/${slug}`);
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Failed to activate organization';
          setError(message);
        }
      }
    }

    activate();

    return () => {
      active = false;
    };
  }, [isLoaded, sessionId, orgId, slug, setActive, router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center font-mono text-xs text-red-500">
        <p>Organization activation error: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center font-mono text-xs text-foreground/60">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span>Initializing workspace for {slug}...</span>
      </div>
    </div>
  );
}
