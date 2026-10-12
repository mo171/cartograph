'use client';

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { ThemeControl } from '@/components/theme-control';
import { InviteModal } from '@/components/invite-modal';
import React from 'react';

interface AppShellProps {
  org: {
    id: string;
    name: string;
    slug: string | null;
    membersCount?: number;
  };
  role?: string;
  children?: React.ReactNode;
}

export function AppShell({ org, role, children }: AppShellProps) {
  const isAdmin = role === 'org:admin';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      {/* Top Navigation Bar */}
      <header className="flex h-11 items-center justify-between border-b border-surface-border bg-surface px-3 font-mono text-xs z-20">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-wider text-foreground">CARTOGRAPH</span>
          <span className="text-surface-border">/</span>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/orgs/:slug"
            afterSelectOrganizationUrl="/orgs/:slug"
            appearance={{
              elements: {
                rootBox: 'font-mono text-xs',
                organizationSwitcherTrigger:
                  'py-1 px-2 rounded border border-surface-border bg-background text-foreground hover:bg-surface text-xs font-mono font-normal',
              },
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-foreground/60 border-r border-surface-border pr-3">
            <span>org:</span>
            <span className="text-foreground font-medium">{org.slug || org.name}</span>
            {role && (
              <span className="rounded bg-foreground/5 px-1 py-0.5 text-[10px] text-foreground/50 border border-surface-border">
                {role.replace('org:', '')}
              </span>
            )}
          </div>

          <InviteModal isAdmin={isAdmin} />
          <ThemeControl />
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'h-6 w-6',
              },
            }}
          />
        </div>
      </header>

      {/* Main Multi-Panel Shell */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Explorer Panel (reserved for file tree & repositories in Phase 2+) */}
        <aside className="hidden md:flex w-64 flex-col border-r border-surface-border bg-surface/50 font-mono text-xs">
          <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
            <span>Explorer</span>
            <span className="text-[10px] text-foreground/40 font-normal">v0.1</span>
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="rounded border border-dashed border-surface-border p-3 text-center text-[11px] text-foreground/50">
              Repository tree will render here after parser integration.
            </div>
          </div>
        </aside>

        {/* Center Canvas Viewport */}
        <main className="flex flex-1 flex-col overflow-hidden bg-background relative">
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>

        {/* Right Inspector Panel (reserved for file details & blast radius) */}
        <aside className="hidden lg:flex w-72 flex-col border-l border-surface-border bg-surface/50 font-mono text-xs">
          <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
            <span>Inspector</span>
            <span className="text-[10px] text-foreground/40 font-normal">details</span>
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="space-y-3">
              <div className="rounded border border-surface-border bg-surface p-2.5 text-[11px]">
                <div className="font-semibold text-foreground mb-1">Active Team</div>
                <div className="text-foreground/70 font-mono">{org.name}</div>
                <div className="text-[10px] text-foreground/50 font-mono mt-1 break-all">
                  ID: {org.id}
                </div>
              </div>
              <div className="rounded border border-dashed border-surface-border p-3 text-center text-[11px] text-foreground/50">
                Node and edge metrics will populate when a file is selected.
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer className="flex h-6 items-center justify-between border-t border-surface-border bg-surface px-3 font-mono text-[10px] text-foreground/60 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-incoming" />
            <span>workspace: {org.slug || org.name}</span>
          </span>
          <span>|</span>
          <span>auth: verified</span>
        </div>
        <div className="flex items-center gap-3">
          <span>cartograph shell</span>
        </div>
      </footer>
    </div>
  );
}

