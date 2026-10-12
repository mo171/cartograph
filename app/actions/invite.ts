'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

export interface InviteResult {
  success?: boolean;
  error?: string;
}

/**
 * Server Action to invite a user to the active organization.
 * 
 * Sets redirectUrl to /sign-in so accepting an invitation brings the invitee
 * directly to this app's login page, per spec.
 */
export async function inviteMemberAction(
  prevState: InviteResult | null,
  formData: FormData
): Promise<InviteResult> {
  const email = formData.get('email')?.toString().trim();
  const role = (formData.get('role')?.toString().trim()) || 'org:member';

  if (!email || !email.includes('@')) {
    return { error: 'A valid email address is required.' };
  }

  const { userId, orgId, has } = await auth();

  if (!userId || !orgId) {
    return { error: 'No active organization found.' };
  }

  if (!has({ role: 'org:admin' })) {
    return { error: 'Only organization administrators can invite members.' };
  }

  try {
    const clerk = await clerkClient();
    await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: email,
      role,
      redirectUrl: `${env.APP_URL}/sign-in`,
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send invitation.';
    return { error: message };
  }
}

