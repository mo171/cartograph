import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getVisibleAnalyses } from '@/lib/data/analyses';
import { AnalysesList } from '@/components/dashboard/analyses-list';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const instant = false;

/**
 * Organization Workspace & Dashboard.
 * 
 * Fetches visible analyses via database client carrying the user's Clerk JWT.
 * Postgres Row-Level Security filters analyses to the active organization without
 * any application-level tenant filtering.
 */
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
    orgName = slug;
  }

  // Query database under RLS: no application-level org filter
  const { analyses, error: dbError } = await getVisibleAnalyses();

  return (
    <AppShell role={orgRole}>
      <div className="space-y-8">
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {orgName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <p className="text-xs text-foreground/60 mt-1">
              Dependency graphs and codebase architecture for this organization
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-foreground/60">
            <div className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-foreground/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{membersCount ?? 1} {membersCount === 1 ? 'member' : 'members'}</span>
            </div>
            <span className="text-surface-border">•</span>
            <span className="font-mono text-[11px] text-foreground/50">
              {orgSlug}
            </span>
          </div>
        </div>

        {/* Database Error Alert (if tables/migrations are not yet applied) */}
        {dbError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
            <div className="font-medium mb-1">Database connection notice:</div>
            <div className="font-mono text-[11px]">{dbError}</div>
          </div>
        )}

        {/* Dashboard Analyses List */}
        <AnalysesList analyses={analyses} orgName={orgName} />
      </div>
    </AppShell>
  );
}
