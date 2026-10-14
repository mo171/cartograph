// Folding the directory tree into a readable number of groups. Pure: paths in,
// groups out. The repository's own shape decides the depth; nothing about which
// folders matter is picked in advance.

export const MAX_GROUPS = 24;
/** "Fewer than a couple of files" is the starting rule. */
const START_THRESHOLD = 2;

export type Group = {
  /** The surviving directory, repository-relative. "." for the root. */
  dir: string;
  /** Every file folded into this group, sorted. */
  files: string[];
};

export type Folding = {
  /** The lowest threshold that landed at or under MAX_GROUPS. */
  threshold: number;
  groups: Group[];
  groupOf: ReadonlyMap<string, string>;
};

type FileInDir = { path: string; module: string };

export function foldDirectories(files: readonly FileInDir[]): Folding {
  // Raise the threshold one step at a time and keep the first that fits. At a
  // high enough threshold everything folds into the root, so this terminates.
  for (let threshold = START_THRESHOLD; ; threshold++) {
    const groups = foldAt(files, threshold);
    if (groups.length <= MAX_GROUPS) {
      const groupOf = new Map<string, string>();
      for (const g of groups) for (const f of g.files) groupOf.set(f, g.dir);
      return { threshold, groups, groupOf };
    }
  }
}

function foldAt(files: readonly FileInDir[], threshold: number): Group[] {
  // Every directory starts as its own node, including ancestors that hold no
  // files directly, so an empty level can fold away like any other.
  const members = new Map<string, string[]>();
  for (const f of files) {
    for (const dir of [f.module, ...ancestors(f.module)]) if (!members.has(dir)) members.set(dir, []);
    members.get(f.module)?.push(f.path);
  }

  const maxDepth = Math.max(0, ...[...members.keys()].map(depth));
  for (let d = maxDepth; d >= 1; d--) {
    // Decide the whole level before applying any of it, so no merge at this
    // depth changes what another merge at the same depth sees.
    const merging = [...members].filter(([dir, list]) => depth(dir) === d && list.length < threshold);
    for (const [dir, list] of merging) {
      members.get(parentOf(dir))?.push(...list);
      members.delete(dir);
    }
  }

  return [...members]
    .filter(([, list]) => list.length > 0)
    .map(([dir, list]) => ({ dir, files: list.sort() }))
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

function depth(dir: string): number {
  return dir === "." ? 0 : dir.split("/").length;
}

function parentOf(dir: string): string {
  const i = dir.lastIndexOf("/");
  return i === -1 ? "." : dir.slice(0, i);
}

function ancestors(dir: string): string[] {
  const out: string[] = [];
  for (let d = dir; d !== "."; ) {
    d = parentOf(d);
    out.push(d);
  }
  return out;
}
