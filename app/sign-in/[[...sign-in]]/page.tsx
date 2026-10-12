import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { ThemeControl } from "@/components/theme-control";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-border bg-surface/80 backdrop-blur-md px-4 sm:px-6">
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
        <ThemeControl />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <Suspense>
          <SignIn />
        </Suspense>
      </div>
    </div>
  );
}
