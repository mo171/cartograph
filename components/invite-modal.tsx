'use client';

import { useActionState, useState } from 'react';
import { inviteMemberAction, InviteResult } from '@/app/actions/invite';

interface InviteModalProps {
  isAdmin: boolean;
}

export function InviteModal({ isAdmin }: InviteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<InviteResult | null, FormData>(
    inviteMemberAction,
    null
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1 text-[11px] font-mono rounded border border-surface-border bg-surface text-foreground hover:border-foreground/30 transition-none cursor-pointer"
      >
        + invite
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded border border-surface-border bg-surface p-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                Invite Teammate
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="font-mono text-xs text-foreground/50 hover:text-foreground cursor-pointer"
              >
                [esc]
              </button>
            </div>

            <form action={formAction} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block font-mono text-[11px] text-foreground/70 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="teammate@example.com"
                  className="w-full rounded border border-surface-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-role"
                  className="block font-mono text-[11px] text-foreground/70 mb-1"
                >
                  Role
                </label>
                <select
                  id="invite-role"
                  name="role"
                  defaultValue="org:member"
                  className="w-full rounded border border-surface-border bg-background px-2 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="org:member">Member</option>
                  <option value="org:admin">Admin</option>
                </select>
              </div>

              {state?.error && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 font-mono text-[11px] text-red-600 dark:text-red-400">
                  {state.error}
                </div>
              )}

              {state?.success && (
                <div className="p-2 rounded bg-green-500/10 border border-green-500/20 font-mono text-[11px] text-green-600 dark:text-green-400">
                  Invitation sent. They will land on the login page upon accepting.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-surface-border text-foreground/70 hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1 text-[11px] font-mono rounded bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

