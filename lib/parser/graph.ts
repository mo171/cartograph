import type { Edge } from "./types.ts";

// Pure functions over a file list and an edge list. No I/O, nothing to mock.

/** One edge per source→target→kind. It stays type-only only if every occurrence was. */
export function dedupeEdges(edges: readonly Edge[]): Edge[] {
  const byKey = new Map<string, Edge>();
  for (const edge of edges) {
    const key = `${edge.source}\0${edge.target}\0${edge.kind}`;
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, { ...edge });
    else existing.typeOnly = existing.typeOnly && edge.typeOnly;
  }
  return [...byKey.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target) || a.kind.localeCompare(b.kind),
  );
}

/**
 * Fan-in and fan-out count distinct files, so importing and re-exporting the
 * same file counts once.
 */
export function fanCounts(paths: readonly string[], edges: readonly Edge[]): Map<string, { fanIn: number; fanOut: number }> {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  for (const p of paths) {
    incoming.set(p, new Set());
    outgoing.set(p, new Set());
  }
  for (const edge of dedupeEdges(edges)) {
    const out = outgoing.get(edge.source);
    const into = incoming.get(edge.target);
    if (!out || !into) throw new Error(`Edge ${edge.source} → ${edge.target} names a file that isn't in the list`);
    out.add(edge.target);
    into.add(edge.source);
  }
  const counts = new Map<string, { fanIn: number; fanOut: number }>();
  for (const p of paths) {
    counts.set(p, { fanIn: incoming.get(p)?.size ?? 0, fanOut: outgoing.get(p)?.size ?? 0 });
  }
  return counts;
}
