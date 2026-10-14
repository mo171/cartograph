import type { Edge, ParsedFile } from "../parser/types.ts";
import type { Folding, Group } from "./fold.ts";
import { shortestUniqueLabels } from "./labels.ts";

// What's on the canvas for a given set of open groups: one object per group,
// either folded or opened into a panel of rows, and the file edges projected
// onto whatever currently stands for each file. Pure.

/** Rows a panel shows at once. Past this it scrolls through a window of them. */
export const MAX_ROWS = 14;
/** Handles standing for the rows scrolled out above and below the window. */
export const ABOVE_HANDLE = "^";
export const BELOW_HANDLE = "v";

export type Row = { path: string; label: string; fanIn: number; fanOut: number };

type Common = { id: string; dir: string; label: string; fileCount: number; fanIn: number; fanOut: number };
export type FoldedObject = Common & { kind: "folded" };
export type PanelObject = Common & {
  kind: "panel";
  rows: Row[];
  /** Whether the files outnumber the window, so the panel scrolls. */
  scrolls: boolean;
  /** Index of the first shown row among all the group's ranked files. */
  offset: number;
  above: number;
  below: number;
  /**
   * Longest row label at any offset. A label unique among every file in the
   * open panels is at least as long as one unique among the rows shown, so
   * this bounds them all and the panel's width holds still while it scrolls.
   */
  rowChars: number;
};
export type MapObject = FoldedObject | PanelObject;

export type MapEdge = {
  id: string;
  source: string;
  /** A row's path inside a panel, ABOVE_HANDLE/BELOW_HANDLE, or null for a folded node. */
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
  /** How many file-level edges this one line stands for. */
  count: number;
};

export type Endpoint = { object: string; handle: string | null };

export type MapView = {
  objects: MapObject[];
  edges: MapEdge[];
  /** What currently stands for each file on the canvas. */
  endpointOf: ReadonlyMap<string, Endpoint>;
};

export function groupId(dir: string): string {
  return `dir:${dir}`;
}

export function buildView(
  files: readonly ParsedFile[],
  edges: readonly Edge[],
  folding: Folding,
  /** Open groups, each with its scroll offset. Clamped here, so any number is safe. */
  open: ReadonlyMap<string, number>,
): MapView {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const fan = groupFan(folding, edges);
  const groupLabels = shortestUniqueLabels(folding.groups.map((g) => g.dir));

  const windows = new Map<string, { ranked: string[]; offset: number; shown: string[] }>();
  for (const g of folding.groups) {
    const requested = open.get(groupId(g.dir));
    if (requested === undefined) continue;
    const ranked = rankGroupFiles(g, byPath);
    const offset = clampOffset(requested, ranked.length);
    windows.set(g.dir, { ranked, offset, shown: ranked.slice(offset, offset + MAX_ROWS) });
  }
  const rowLabels = shortestUniqueLabels([...windows.values()].flatMap((w) => w.shown));
  const widestLabels = shortestUniqueLabels([...windows.values()].flatMap((w) => w.ranked));

  const objects = folding.groups.map((g): MapObject => {
    const common: Common = {
      id: groupId(g.dir),
      dir: g.dir,
      label: g.dir === "." ? "(root)" : (groupLabels.get(g.dir) ?? g.dir),
      fileCount: g.files.length,
      fanIn: fan.get(g.dir)?.fanIn ?? 0,
      fanOut: fan.get(g.dir)?.fanOut ?? 0,
    };
    const w = windows.get(g.dir);
    if (!w) return { ...common, kind: "folded" };
    return {
      ...common,
      kind: "panel",
      scrolls: w.ranked.length > MAX_ROWS,
      offset: w.offset,
      above: w.offset,
      below: w.ranked.length - w.offset - w.shown.length,
      rowChars: Math.max(0, ...w.ranked.map((f) => widestLabels.get(f)?.length ?? f.length)),
      rows: w.shown.map((path) => ({
        path,
        label: rowLabels.get(path) ?? path,
        fanIn: byPath.get(path)?.fanIn ?? 0,
        fanOut: byPath.get(path)?.fanOut ?? 0,
      })),
    };
  });

  const endpointOf = new Map<string, Endpoint>();
  for (const g of folding.groups) {
    const object = groupId(g.dir);
    const w = windows.get(g.dir);
    if (!w) {
      for (const f of g.files) endpointOf.set(f, { object, handle: null });
      continue;
    }
    w.ranked.forEach((f, i) => {
      const handle = i < w.offset ? ABOVE_HANDLE : i >= w.offset + w.shown.length ? BELOW_HANDLE : f;
      endpointOf.set(f, { object, handle });
    });
  }

  const merged = new Map<string, MapEdge>();
  for (const e of edges) {
    const from = endpointOf.get(e.source);
    const to = endpointOf.get(e.target);
    if (!from || !to) throw new Error(`Edge ${e.source} → ${e.target} has an endpoint outside the folding`);
    // An edge that starts and ends inside the same canvas object isn't drawn:
    // it would loop back into its own box. It still counts in the files' fan.
    if (from.object === to.object) continue;
    const id = `${from.object}|${from.handle ?? ""}>${to.object}|${to.handle ?? ""}`;
    const existing = merged.get(id);
    if (existing) existing.count++;
    else
      merged.set(id, {
        id,
        source: from.object,
        sourceHandle: from.handle,
        target: to.object,
        targetHandle: to.handle,
        count: 1,
      });
  }

  return { objects, edges: [...merged.values()].sort((a, b) => a.id.localeCompare(b.id)), endpointOf };
}

// Rows most depended on come first, so an unscrolled panel shows the files
// that matter most. Exported so anything scrolling a panel to a file finds it
// at the index the panel will put it.
export function rankGroupFiles(group: Group, byPath: ReadonlyMap<string, ParsedFile>): string[] {
  return [...group.files].sort(
    (a, b) => (byPath.get(b)?.fanIn ?? 0) - (byPath.get(a)?.fanIn ?? 0) || a.localeCompare(b),
  );
}

/** The first row a panel of `total` files actually shows for a requested offset. */
export function clampOffset(requested: number, total: number): number {
  return Math.max(0, Math.min(Math.round(requested), total - MAX_ROWS));
}

/**
 * Fan for a group counts distinct files on the other side of its boundary,
 * the same unit a file's own fan-in and fan-out use.
 */
export function groupFan(folding: Folding, edges: readonly Edge[]): Map<string, { fanIn: number; fanOut: number }> {
  const into = new Map<string, Set<string>>();
  const outOf = new Map<string, Set<string>>();
  for (const e of edges) {
    const s = folding.groupOf.get(e.source);
    const t = folding.groupOf.get(e.target);
    if (s === undefined || t === undefined || s === t) continue;
    addTo(into, t, e.source);
    addTo(outOf, s, e.target);
  }
  return new Map(
    folding.groups.map((g: Group) => [g.dir, { fanIn: into.get(g.dir)?.size ?? 0, fanOut: outOf.get(g.dir)?.size ?? 0 }]),
  );
}

function addTo(map: Map<string, Set<string>>, key: string, value: string): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}
