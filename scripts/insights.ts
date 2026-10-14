// Prints what the insights panel and the reach buttons will show for a written
// parse result, and checks every step of every loop is a real runtime edge.
//
//   pnpm insights app/preview/analysis.json [file-to-walk-from]

import { readFileSync } from "node:fs";
import { findInsights } from "../lib/graph/insights.ts";
import { adjacency, DEFAULT_DEPTH, reach } from "../lib/graph/reach.ts";
import { deserializeParseResult } from "../lib/parser/contract.ts";

const [file, from] = process.argv.slice(2);
if (!file) {
  console.error("usage: pnpm insights <parse-output.json> [file]");
  process.exit(1);
}

const { files, edges } = deserializeParseResult(readFileSync(file, "utf8"));
const started = performance.now();
const insights = findInsights(files, edges);
const ms = (performance.now() - started).toFixed(1);

const reached = files.filter((f) => f.fanIn === 0 && f.reachedBy !== null);
console.log(`Imported by nothing ${insights.unimported.length}  (another ${reached.length} have no importer but are reached by convention)`);
for (const f of insights.unimported) console.log(`  ${f.path}`);

console.log(`\nHeavily imported ${insights.heavilyImported.files.length}  (fan-in over ${insights.heavilyImported.threshold})`);
for (const f of insights.heavilyImported.files.slice(0, 10)) console.log(`  ←${String(f.fanIn).padEnd(4)} ${f.path}`);

const runtime = new Set(edges.filter((e) => !e.typeOnly).map((e) => `${e.source}\0${e.target}`));
let broken = 0;
console.log(`\nLoops ${insights.cycles.length}`);
for (const c of insights.cycles) {
  const steps = c.files.map((f, i) => [f, c.files[(i + 1) % c.files.length]] as const);
  broken += steps.filter(([a, b]) => !runtime.has(`${a}\0${b}`)).length;
  console.log(`  ${c.members} files mutually reachable, shortest loop ${c.files.length}:`);
  for (const [a, b] of steps) console.log(`    ${a}  →  ${b}`);
}
console.log(`Loop steps that aren't a runtime edge: ${broken}`);

console.log(`\nLong ${insights.long.length}`);
for (const f of insights.long.slice(0, 5)) console.log(`  ${String(f.lines).padStart(6)}  ${f.path}`);
console.log(`\nAll four in ${ms}ms`);

if (from) {
  const graph = adjacency(edges);
  for (const direction of ["dependents", "dependencies"] as const) {
    const r = reach(graph, from, direction, DEFAULT_DEPTH);
    console.log(`\n${direction} of ${from}: ${r.steps.map((s, i) => `${s.length} at step ${i + 1}`).join(", ")}, ${r.beyond} further`);
    r.steps.forEach((s, i) => s.slice(0, 5).forEach((p) => console.log(`  ${i + 1}  ${p}`)));
  }
}
if (broken > 0) process.exit(1);
