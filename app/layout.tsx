import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

// Fail loudly on startup if environment variables are missing
env.validate();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartograph",
  description: "Repository dependency map",
};

const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--accent)',
    colorBackground: 'var(--surface)',
    colorText: 'var(--foreground)',
    colorTextSecondary: 'var(--foreground)',
    colorInputBackground: 'var(--background)',
    colorInputText: 'var(--foreground)',
    colorNeutral: 'var(--foreground)',
    borderRadius: '0.625rem',
    fontFamily: 'var(--font-sans), system-ui, sans-serif',
  },
  elements: {
    rootBox: 'text-foreground',
    card: 'bg-surface text-foreground border border-surface-border shadow-xl rounded-2xl',
    cardBox: 'shadow-none',
    modalBackdrop: 'bg-black/60 backdrop-blur-xs',
    modalContent:
      'bg-surface text-foreground border border-surface-border shadow-2xl rounded-2xl overflow-hidden',
    headerTitle: 'text-foreground font-semibold tracking-tight text-base',
    headerSubtitle: 'text-foreground/60 text-xs',
    profileSectionTitleText: 'text-foreground font-semibold text-xs',
    profileSectionSubtitleText: 'text-foreground/60 text-xs',
    profileSectionContent: 'text-foreground text-xs',
    profileSection: 'border-b border-surface-border/60 pb-4 mb-4',
    formFieldLabel: 'text-foreground/70 text-xs font-medium mb-1',
    formFieldInput:
      'bg-background border border-surface-border text-foreground rounded-lg text-xs px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent transition-all',
    formButtonPrimary:
      'bg-foreground text-background hover:opacity-90 font-medium text-xs rounded-lg transition-opacity px-3.5 py-2',
    formButtonReset:
      'border border-surface-border text-foreground/70 hover:bg-foreground/[0.04] rounded-lg text-xs px-3 py-2 transition-colors',
    navbar: 'bg-surface/50 border-r border-surface-border',
    navbarButton:
      'text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] rounded-lg transition-colors text-xs px-2.5 py-2',
    navbarButtonActive: 'bg-foreground/[0.08] text-foreground font-medium',
    popoverBox: 'bg-surface border border-surface-border shadow-2xl rounded-xl overflow-hidden',
    footer: 'border-t border-surface-border bg-surface/60',
    footerActionText: 'text-foreground/60 text-xs',
    footerActionLink: 'text-accent hover:underline text-xs',
    dividerLine: 'bg-surface-border',
    dividerText: 'text-foreground/40 text-xs',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var stored = localStorage.getItem('cartograph-theme') || 'system';
    document.documentElement.setAttribute('data-theme', stored);
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (stored === 'system' && systemDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ClerkProvider appearance={clerkAppearance}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}