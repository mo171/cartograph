// Prints the numbers the canvas acceptance check asks for, from a written
// parse result: how many nodes folding produces, whether any holds a single
// file, and whether every edge lands on a node that exists.
//
//   pnpm map-counts app/preview/analysis.json

import { readFileSync } from "node:fs";
import { foldDirectories } from "../lib/graph/fold.ts";
import { ABOVE_HANDLE, BELOW_HANDLE, buildView, groupId } from "../lib/graph/view.ts";
import { deserializeParseResult } from "../lib/parser/contract.ts";

const [file] = process.argv.slice(2);
if (!file) {
  console.error("usage: pnpm map-counts <parse-output.json>");
  process.exit(1);
}

const { files, edges } = deserializeParseResult(readFileSync(file, "utf8"));
const folding = foldDirectories(files);
const folded = buildView(files, edges, folding, new Map());
const ids = new Set(folded.objects.map((o) => o.id));

const single = folding.groups.filter((g) => g.files.length < 2);
const dangling = folded.edges.filter((e) => !ids.has(e.source) || !ids.has(e.target));

console.log(`Files ${files.length}, edges ${edges.length}, folded at threshold ${folding.threshold}`);
console.log(`1. Nodes ${folding.groups.length}  (one per ${(files.length / folding.groups.length).toFixed(1)} files)`);
console.log(`2. Nodes holding one file: ${single.length}${single.map((g) => `\n     ${g.dir}`).join("")}`);
console.log(`3. Edges ${folded.edges.length}, ending on a missing node: ${dangling.length}`);

// Same checks with every group open, scrolled to the top and to the bottom, so
// the rows and the above/below handles are exercised too.
for (const [where, offset] of [["top", 0], ["bottom", Number.MAX_SAFE_INTEGER]] as const) {
  const all = buildView(files, edges, folding, new Map(folding.groups.map((g) => [groupId(g.dir), offset])));
  const handles = new Set<string>();
  for (const o of all.objects) {
    if (o.kind !== "panel") continue;
    for (const r of o.rows) handles.add(`${o.id}|${r.path}`);
    if (o.scrolls) handles.add(`${o.id}|${ABOVE_HANDLE}`).add(`${o.id}|${BELOW_HANDLE}`);
  }
  const badRow = all.edges.filter(
    (e) => !handles.has(`${e.source}|${e.sourceHandle ?? ""}`) || !handles.has(`${e.target}|${e.targetHandle ?? ""}`),
  );
  console.log(`   All open, scrolled to ${where}: ${all.edges.length} row edges, ending on a missing row: ${badRow.length}`);
}

console.log("\nGroups");
for (const o of folded.objects) {
  console.log(`  ${String(o.fileCount).padStart(4)}  ←${String(o.fanIn).padEnd(4)} ${String(o.fanOut).padStart(4)}→  ${o.label.padEnd(28)} ${o.dir}`);
}
