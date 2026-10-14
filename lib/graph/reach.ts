import type { Edge } from "../parser/types.ts";

// Blast radius and dependency chain are the same walk over the edge list, one
// following edges backwards and the other forwards. Pure and synchronous: the
// browser already holds every edge, so the answer is arithmetic.

/** "dependents" walks to what imports the file: its blast radius. "dependencies" walks to what it imports: its chain. */
export type Direction = "dependents" | "dependencies";

/**
 * Two steps by default. Past that, a well-connected file reaches most of the
 * repository and the list stops being an answer.
 */
export const DEFAULT_DEPTH = 2;

export type Adjacency = {
  /** File → distinct files it imports. */
  imports: ReadonlyMap<string, readonly string[]>;
  /** File → distinct files importing it. */
  importedBy: ReadonlyMap<string, readonly string[]>;
};

// Type-only edges count here, unlike in loop detection: changing a type still
// breaks whatever imports it, at compile time.
export function adjacency(edges: readonly Edge[]): Adjacency {
  const imports = new Map<string, Set<string>>();
  const importedBy = new Map<string, Set<string>>();
  for (const e of edges) {
    add(imports, e.source, e.target);
    add(importedBy, e.target, e.source);
  }
  return { imports: sortedLists(imports), importedBy: sortedLists(importedBy) };
}

export type Reach = {
  /** steps[0] is one import away, steps[1] two, and so on up to the depth. Each sorted. */
  steps: string[][];
  /** Files reachable only further out than the depth, so the list never reads as complete when it isn't. */
  beyond: number;
};

// Breadth-first, so each file sits at the fewest steps it can be reached in.
// The walk runs to the end to count what lies past the depth; it's a queue,
// not recursion, so a deep chain can't overflow anything.
export function reach(graph: Adjacency, start: string, direction: Direction, depth = DEFAULT_DEPTH): Reach {
  const next = direction === "dependents" ? graph.importedBy : graph.imports;
  const distance = new Map<string, number>([[start, 0]]);
  const steps: string[][] = Array.from({ length: depth }, () => []);
  let beyond = 0;
  let frontier = [start];
  for (let d = 1; frontier.length > 0; d++) {
    const found: string[] = [];
    for (const file of frontier) {
      for (const other of next.get(file) ?? []) {
        if (distance.has(other)) continue;
        distance.set(other, d);
        found.push(other);
      }
    }
    if (d <= depth) steps[d - 1] = found.sort();
    else beyond += found.length;
    frontier = found;
  }
  return { steps, beyond };
}

function add(map: Map<string, Set<string>>, key: string, value: string): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

function sortedLists(map: Map<string, Set<string>>): Map<string, string[]> {
  return new Map([...map].map(([k, v]) => [k, [...v].sort()]));
}
