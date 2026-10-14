import type { Edge, EdgeKind, ParsedFile } from "../parser/types.ts";

// What the detail pane lists, as arithmetic over the file and edge lists. Pure,
// so the pane never has to ask anything for it.

/** How many rows each summary ranking shows before saying how many more. */
export const SUMMARY_LIMIT = 10;

export type Neighbour = {
  path: string;
  /** Every kind of edge between the two files, in contract order. */
  kinds: EdgeKind[];
  /** True only when every edge between the two files is type-only. */
  typeOnly: boolean;
};

export type Neighbours = { imports: Neighbour[]; importedBy: Neighbour[] };

// One row per distinct file on the other side, the same unit fan-in and
// fan-out count, so a list's length is the count shown above it.
export function neighboursOf(edges: readonly Edge[], path: string): Neighbours {
  const imports = new Map<string, Neighbour>();
  const importedBy = new Map<string, Neighbour>();
  for (const e of edges) {
    if (e.source === path) add(imports, e.target, e);
    if (e.target === path) add(importedBy, e.source, e);
  }
  return { imports: sorted(imports), importedBy: sorted(importedBy) };
}

function add(into: Map<string, Neighbour>, other: string, e: Edge): void {
  const existing = into.get(other);
  if (!existing) {
    into.set(other, { path: other, kinds: [e.kind], typeOnly: e.typeOnly });
    return;
  }
  if (!existing.kinds.includes(e.kind)) existing.kinds.push(e.kind);
  existing.typeOnly &&= e.typeOnly;
}

function sorted(map: Map<string, Neighbour>): Neighbour[] {
  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export type Ranked = { files: ParsedFile[]; total: number };

export type RepositoryRankings = {
  /** Files something imports, most importers first. */
  mostDependedOn: Ranked;
  /**
   * Files nothing imports. The ones importing the most come first: nothing
   * leads into them and they lead into the most, so reading starts there.
   */
  unimported: Ranked;
};

export function rankRepository(files: readonly ParsedFile[]): RepositoryRankings {
  const depended = files.filter((f) => f.fanIn > 0).sort((a, b) => b.fanIn - a.fanIn || a.path.localeCompare(b.path));
  const unimported = files
    .filter((f) => f.fanIn === 0)
    .sort((a, b) => b.fanOut - a.fanOut || a.path.localeCompare(b.path));
  return {
    mostDependedOn: { files: depended.slice(0, SUMMARY_LIMIT), total: depended.length },
    unimported: { files: unimported.slice(0, SUMMARY_LIMIT), total: unimported.length },
  };
}
