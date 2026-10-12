'use client';

import { OrganizationSwitcher, UserButton, Show } from '@clerk/nextjs';
import { ThemeControl } from '@/components/theme-control';
import { InviteModal } from '@/components/invite-modal';
import React from 'react';

interface AppShellProps {
  role?: string;
  children?: React.ReactNode;
}

export function AppShell({ role, children }: AppShellProps) {
  const isAdmin = role === 'org:admin';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-border bg-surface/80 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="8" r="3" />
                <circle cx="12" cy="18" r="3" />
                <path d="m8.5 7.5 7 1" />
                <path d="m7.5 8.5 3 7" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Cartograph
            </span>
          </div>

          <div className="h-4 w-px bg-surface-border mx-0.5" />

          <Show when="signed-in">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/orgs/:slug"
              afterSelectOrganizationUrl="/orgs/:slug"
              appearance={{
                elements: {
                  rootBox: 'flex items-center text-xs',
                  organizationSwitcherTrigger:
                    'h-8 px-2.5 rounded-lg border border-surface-border bg-surface text-foreground hover:bg-foreground/[0.04] text-xs font-medium transition-colors focus:outline-none flex items-center gap-1.5',
                  organizationSwitcherTriggerIcon:
                    'text-foreground/50 h-3.5 w-3.5 ml-1',
                  organizationSwitcherPopoverCard:
                    'bg-surface border border-surface-border shadow-2xl rounded-xl p-1.5 text-foreground min-w-[240px]',
                  organizationSwitcherPopoverMain: 'space-y-1',
                  organizationSwitcherPopoverActions:
                    'border-t border-surface-border mt-1.5 pt-1.5 space-y-0.5',
                  organizationSwitcherPopoverActionButton:
                    'rounded-lg text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-colors py-2 px-2.5 w-full flex items-center gap-2 cursor-pointer',
                  organizationSwitcherPopoverItem:
                    'rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-foreground/[0.04] transition-colors py-2 px-2.5 w-full flex items-center justify-between cursor-pointer',
                  organizationPreview:
                    'flex items-center gap-2 text-xs font-medium text-foreground',
                  organizationPreviewTitle:
                    'text-xs font-medium text-foreground',
                  organizationPreviewSubtitle:
                    'text-[11px] text-foreground/50 font-normal',
                },
              }}
            />
          </Show>
        </div>

        <div className="flex items-center gap-2.5">
          {role && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-foreground/[0.04] border border-surface-border text-[11px] font-medium text-foreground/60">
              {role.replace('org:', '')}
            </span>
          )}

          <InviteModal isAdmin={isAdmin} />
          <ThemeControl />
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: 'h-7 w-7',
                  userButtonPopoverCard:
                    'bg-surface border border-surface-border shadow-2xl rounded-xl p-1.5 text-foreground min-w-[240px]',
                  userButtonPopoverMain:
                    'p-2.5 border-b border-surface-border mb-1',
                  userButtonPopoverActions:
                    'space-y-0.5',
                  userButtonPopoverActionButton:
                    'rounded-lg text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-colors py-2 px-2.5 w-full flex items-center gap-2 cursor-pointer',
                },
              }}
            />
          </Show>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}

