import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrgActivator } from '@/components/org-activator';

/**
 * Root Landing Route.
 * 
 * Ensures all enabled sign-in methods arrive at the same destination.
 * If the user has an active organization, redirects directly to its workspace.
 * If the user is on a brand new account without an organization, automatically
 * provisions one on their behalf without prompting, then activates and redirects.
 * If the user has memberships (e.g., from an accepted invitation), activates the
 * membership organization and redirects to its workspace.
 */
export const instant = false;

export default async function HomePage() {
  const { userId, orgId, orgSlug } = await auth.protect();

  // If already in an active organization, redirect directly to its workspace
  if (orgId && orgSlug) {
    redirect(`/orgs/${orgSlug}`);
  }

  let membershipsData: { organization: { id: string; slug: string | null } }[] = [];

  try {
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({ userId });
    membershipsData = memberships.data;
  } catch {
    membershipsData = [];
  }

  if (membershipsData.length > 0) {
    const org = membershipsData[0].organization;
    return <OrgActivator orgId={org.id} slug={org.slug || org.id} />;
  }

  let targetOrgId: string | null = null;
  let targetSlug: string | null = null;

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const teamName =
      user.firstName
        ? `${user.firstName}'s Team`
        : user.username
          ? `${user.username}'s Team`
          : user.emailAddresses[0]?.emailAddress
            ? `${user.emailAddresses[0].emailAddress.split('@')[0]}'s Team`
            : 'Workspace';

    const newOrg = await clerk.organizations.createOrganization({
      name: teamName,
      createdBy: userId,
    });
    targetOrgId = newOrg.id;
    targetSlug = newOrg.slug || newOrg.id;
  } catch {
    // If concurrent creation or transient error, retry fetching memberships
    const clerk = await clerkClient();
    const retry = await clerk.users.getOrganizationMembershipList({ userId });
    if (retry.data.length > 0) {
      const org = retry.data[0].organization;
      targetOrgId = org.id;
      targetSlug = org.slug || org.id;
    }
  }

  if (targetOrgId && targetSlug) {
    return <OrgActivator orgId={targetOrgId} slug={targetSlug} />;
  }

  throw new Error('Unable to provision organization for workspace.');
}
