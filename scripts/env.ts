import nextEnv from "@next/env";

let loaded = false;

/** Load `.env*` files with the same precedence as Next.js. */
export function loadCartographEnv(): void {
  if (loaded) return;
  nextEnv.loadEnvConfig(process.cwd());
  loaded = true;
}
