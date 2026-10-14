import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ThemeControl } from "@/components/theme-control";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

// Everything inside the app renders within this shell, always under an
// active organization. No organization yet means first sign-in: /start
// resolves one before the workspace is shown.
export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const { orgId } = await auth();
  if (!orgId) redirect("/start");

  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
        <span className="font-mono text-xs font-semibold tracking-tight">cartograph</span>
        <span className="text-line">/</span>
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/"
          afterLeaveOrganizationUrl="/start"
        />
        <div className="ml-auto flex items-center gap-3">
          <ThemeControl initial={theme} />
          <UserButton />
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
