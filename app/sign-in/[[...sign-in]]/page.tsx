import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { ThemeControl } from "@/components/theme-control";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-11 items-center justify-between border-b border-surface-border bg-surface px-4 font-mono text-xs">
        <span className="font-bold tracking-wider text-foreground">CARTOGRAPH</span>
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
