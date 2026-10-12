import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Organization Workspace Page.
 * Server component that reads the current organization during server rendering
 * and displays it on the first paint without relying on client-side hydration.
 */
export const instant = false;

export default async function OrgWorkspacePage({ params }: PageProps) {
  const { slug } = await params;
  const { orgId, orgSlug, orgRole } = await auth.protect();

  if (!orgId || !orgSlug) {
    redirect('/');
  }

  // Invariant: enforce that active organization matches the route slug
  if (orgSlug !== slug) {
    redirect(`/orgs/${orgSlug}`);
  }

  // Read organization server-side during initial render (first paint)
  let orgName = slug;
  let membersCount: number | undefined = undefined;

  try {
    const clerk = await clerkClient();
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    orgName = org.name;
    membersCount = org.membersCount;
  } catch {
    // If request was aborted during client navigation, fallback to slug
    orgName = slug;
  }

  return (
    <AppShell
      org={{
        id: orgId,
        name: orgName,
        slug: orgSlug,
        membersCount,
      }}
      role={orgRole}
    >
      <div className="max-w-2xl font-mono">
        <div className="rounded border border-surface-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Team Workspace
              </h2>
              <p className="text-xs text-foreground/60 mt-0.5">
                Rendered server-side for organization{' '}
                <span className="text-accent font-semibold">{orgName}</span>
              </p>
            </div>
            <span className="rounded bg-incoming/10 border border-incoming/30 px-2 py-0.5 text-[10px] text-incoming font-medium">
              active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <span className="text-foreground/50 text-[10px] uppercase block">
                Organization Slug
              </span>
              <span className="text-foreground font-semibold">{orgSlug}</span>
            </div>
            <div>
              <span className="text-foreground/50 text-[10px] uppercase block">
                Organization ID
              </span>
              <span className="text-foreground text-[11px] break-all">{orgId}</span>
            </div>
            <div>
              <span className="text-foreground/50 text-[10px] uppercase block">
                Current User Role
              </span>
              <span className="text-foreground font-semibold">{orgRole || 'org:member'}</span>
            </div>
            <div>
              <span className="text-foreground/50 text-[10px] uppercase block">
                Total Members
              </span>
              <span className="text-foreground font-semibold">{membersCount ?? 1}</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
