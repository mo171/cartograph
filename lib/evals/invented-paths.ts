import type { FileInput, FolderInput } from "../ai/prompts.ts";

export type PathScore = { score: 0 | 1; mentioned: string[]; invented: string[] };
const BARE_FILE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mts", "cts", "mjs", "cjs", "json", "md", "mdx", "yaml", "yml", "css", "scss", "html", "vue", "svelte", "py", "go", "rs", "sql", "toml", "xml", "svg"]);

export function allowedFilePaths(input: FileInput): ReadonlySet<string> {
  return new Set([input.path, ...input.imports.map((item) => item.path), ...input.importedBy.map((item) => item.path)]);
}

export function allowedFolderPaths(input: FolderInput): ReadonlySet<string> {
  return new Set([
    ...(input.dir === "." ? [] : [`${input.dir}/`]),
    ...input.files.map((item) => item.path),
    ...input.incoming.flatMap(({ from, to }) => [from, to]),
    ...input.outgoing.flatMap(({ from, to }) => [from, to]),
  ]);
}

/** Paths in inline code and bare repository-relative paths in prose. */
export function extractRepositoryPaths(body: string, allowed: ReadonlySet<string> = new Set()): string[] {
  const found = new Set<string>();
  const shownRoots = new Set([...allowed].filter((path) => path.includes("/")).map((path) => path.split("/")[0]));
  const add = (candidate: string, quoted: boolean) => {
    const path = candidate.replace(/^[`'"([{]+|[`'"\])}.,;:!?]+$/g, "");
    if (path.includes("://") || path.startsWith("/")) return;
    const extension = path.split(".").at(-1) ?? "";
    const rootFile = !path.includes("/") &&
      (path === path.toLowerCase() || /^(README|AGENTS|LICENSE|CONTRIBUTING)\./.test(path)) &&
      (BARE_FILE_EXTENSIONS.has(extension) || /^\.env\.(local|example|test)$/.test(path)) &&
      /^\.?[\w@()-]+(?:\.[\w@()-]+)+$/.test(path);
    const slashPath = path.includes("/") && /^[\w@.()\[\]-]+(?:\/[\w@.()\[\]-]+)+\/?$/.test(path);
    if (path.endsWith("/") || rootFile ||
        (slashPath && (quoted || /\.[A-Za-z0-9]{1,12}$/.test(path) || shownRoots.has(path.split("/")[0])))) found.add(path);
  };
  const withoutCode = body.replace(/`([^`\n]+)`/g, (_whole, inner: string) => {
    add(inner.trim(), true);
    return " ";
  });
  for (const token of withoutCode.split(/\s+/)) add(token, false);
  return [...found];
}

export function scoreInventedPaths(body: string, allowed: ReadonlySet<string>): PathScore {
  const mentioned = extractRepositoryPaths(body, allowed);
  const invented = mentioned.filter((path) => !allowed.has(path)).sort();
  return { score: invented.length === 0 ? 1 : 0, mentioned, invented };
}
