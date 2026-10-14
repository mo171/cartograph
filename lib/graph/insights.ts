import type { Edge, ParsedFile } from "../parser/types.ts";

// Four facts about the file and edge lists. Pure, and nothing here is worded
// by a model: each kind says one fixed sentence, and the files under it are
// the evidence.

/** Past this many lines a file is listed as long. Fixed, so the list means the same in every repository. */
export const LONG_FILE_LINES = 1000;

export const INSIGHT_SENTENCES = {
  unimported: "Nothing imports these files, and no framework or tool convention reaches them.",
  heavilyImported: "Far more files import these than import a typical file here.",
  cycles: "Each file in a loop imports the next, and the last imports the first.",
  long: `These files are over ${LONG_FILE_LINES.toLocaleString("en")} lines long.`,
} as const;

export type Cycle = {
  /** One shortest loop, in import order; the last file imports the first. */
  files: string[];
  /** How many files are mutually reachable with it, the loop included. */
  members: number;
};

export type Insights = {
  unimported: ParsedFile[];
  heavilyImported: { files: ParsedFile[]; threshold: number };
  cycles: Cycle[];
  long: ParsedFile[];
};

export function findInsights(files: readonly ParsedFile[], edges: readonly Edge[]): Insights {
  // A file the framework, a tool or the test runner reaches isn't unused just
  // because no import leads to it: that would be the parser reporting the
  // edge of its own view as a finding about the code.
  const unimported = files.filter((f) => f.fanIn === 0 && f.reachedBy === null).sort(byPath);

  const threshold = farOutFence(files.filter((f) => f.fanIn > 0).map((f) => f.fanIn));
  const heavilyImported = files.filter((f) => f.fanIn > threshold).sort((a, b) => b.fanIn - a.fanIn || byPath(a, b));

  const long = files.filter((f) => f.lines > LONG_FILE_LINES).sort((a, b) => b.lines - a.lines || byPath(a, b));

  return { unimported, heavilyImported: { files: heavilyImported, threshold }, cycles: findCycles(files, edges), long };
}

// Tukey's far-out fence: the third quartile plus three interquartile ranges.
// Relative to this repository, so "unusual" means unusual here.
function farOutFence(values: number[]): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))] ?? 0;
  const q1 = q(0.25);
  const q3 = q(0.75);
  return q3 + 3 * (q3 - q1);
}

/**
 * Every strongly connected component with a loop in it, each shown as one
 * shortest loop through its first file, largest component first.
 *
 * Type-only imports are left out: they're erased before the code runs, so a
 * loop made of them never happens.
 */
export function findCycles(files: readonly ParsedFile[], edges: readonly Edge[]): Cycle[] {
  const next = new Map<string, string[]>();
  for (const f of files) next.set(f.path, []);
  for (const e of edges) if (!e.typeOnly) next.get(e.source)?.push(e.target);
  for (const list of next.values()) list.sort();

  const cycles: Cycle[] = [];
  for (const component of stronglyConnected(next)) {
    const [first] = component;
    if (first === undefined) continue;
    const selfLoop = next.get(first)?.includes(first) ?? false;
    if (component.length === 1 && !selfLoop) continue;
    const loop = shortestLoop(next, first, new Set(component));
    if (loop) cycles.push({ files: loop, members: component.length });
  }
  return cycles.sort((a, b) => b.members - a.members || a.files[0].localeCompare(b.files[0]));
}

// Tarjan's algorithm with an explicit stack of frames instead of recursion: a
// real repository has import chains deep enough to overflow the call stack.
// Each component comes back sorted.
function stronglyConnected(next: ReadonlyMap<string, readonly string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let counter = 0;

  const enter = (v: string) => {
    index.set(v, counter);
    low.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);
  };

  for (const root of [...next.keys()].sort()) {
    if (index.has(root)) continue;
    enter(root);
    const frames: { v: string; i: number }[] = [{ v: root, i: 0 }];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      const successors = next.get(frame.v) ?? [];
      if (frame.i < successors.length) {
        const w = successors[frame.i++];
        if (!index.has(w)) {
          enter(w);
          frames.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v) ?? 0, index.get(w) ?? 0));
        }
        continue;
      }
      frames.pop();
      const parent = frames[frames.length - 1];
      if (parent) low.set(parent.v, Math.min(low.get(parent.v) ?? 0, low.get(frame.v) ?? 0));
      if (low.get(frame.v) === index.get(frame.v)) {
        const component: string[] = [];
        for (;;) {
          const w = stack.pop();
          if (w === undefined) break;
          onStack.delete(w);
          component.push(w);
          if (w === frame.v) break;
        }
        components.push(component.sort());
      }
    }
  }
  return components;
}

// Breadth-first from `start` inside its component until an edge leads back to
// it, so the loop shown is one of the shortest, and every step in it is an
// edge that exists.
function shortestLoop(next: ReadonlyMap<string, readonly string[]>, start: string, within: ReadonlySet<string>): string[] | null {
  const parent = new Map<string, string>();
  const seen = new Set([start]);
  let frontier = [start];
  while (frontier.length > 0) {
    const found: string[] = [];
    for (const v of frontier) {
      for (const w of next.get(v) ?? []) {
        if (w === start) {
          const loop = [v];
          for (let at = v; at !== start; ) {
            const p = parent.get(at);
            if (p === undefined) break;
            loop.push(p);
            at = p;
          }
          return loop.reverse();
        }
        if (!within.has(w) || seen.has(w)) continue;
        seen.add(w);
        parent.set(w, v);
        found.push(w);
      }
    }
    frontier = found;
  }
  return null;
}

function byPath(a: ParsedFile, b: ParsedFile): number {
  return a.path.localeCompare(b.path);
}
