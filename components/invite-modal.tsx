'use client';

import { useActionState, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg border border-surface-border bg-surface text-foreground hover:bg-foreground/[0.04] transition-colors cursor-pointer"
      >
        <svg
          className="h-3.5 w-3.5 text-foreground/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
        <span>Invite</span>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-surface-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Invite Team Member
                  </h3>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    Send an invitation to join this organization
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-1 text-foreground/40 hover:text-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>

              <form action={formAction} className="mt-4 space-y-3.5">
                <div>
                  <label
                    htmlFor="invite-email"
                    className="block text-xs font-medium text-foreground/70 mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="invite-email"
                    name="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="teammate@example.com"
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-role"
                    className="block text-xs font-medium text-foreground/70 mb-1.5"
                  >
                    Role
                  </label>
                  <div className="relative">
                    <select
                      id="invite-role"
                      name="role"
                      defaultValue="org:member"
                      className="w-full appearance-none rounded-lg border border-surface-border bg-background px-3 py-2 pr-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all cursor-pointer"
                    >
                      <option value="org:member" className="bg-surface text-foreground">
                        Member
                      </option>
                      <option value="org:admin" className="bg-surface text-foreground">
                        Admin
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-foreground/50">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {state?.error && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                    {state.error}
                  </div>
                )}

                {state?.success && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                    Invitation sent. They will land on the login page upon accepting.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-border text-foreground/70 hover:bg-foreground/[0.04] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                  >
                    {isPending ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

