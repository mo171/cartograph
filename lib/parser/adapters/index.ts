import { docusaurusAdapter } from "./docusaurus.ts";
import { expressAdapter } from "./express.ts";
import { fallbackAdapter } from "./fallback.ts";
import { nestjsAdapter } from "./nestjs.ts";
import { nextjsAdapter } from "./nextjs.ts";
import { reactAdapter } from "./react.ts";
import type { FrameworkAdapter, ProjectInfo } from "./types.ts";

// Fixed order, first match wins. Frameworks built on React come before React
// itself, since they depend on it too. Express comes after the frameworks that
// can run on it (a Next.js custom server, NestJS's Express platform), and the
// fallback stays last.
const ADAPTERS: readonly FrameworkAdapter[] = [
  nextjsAdapter,
  nestjsAdapter,
  expressAdapter,
  docusaurusAdapter,
  reactAdapter,
  fallbackAdapter,
];

export function selectAdapter(project: ProjectInfo): FrameworkAdapter {
  return ADAPTERS.find((adapter) => adapter.detect(project)) ?? fallbackAdapter;
}

export type { FrameworkAdapter, ProjectInfo };
