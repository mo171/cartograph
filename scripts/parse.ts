// Runs the parser against a directory and prints what it found.
//
//   pnpm parse <dir>                   print the summary
//   pnpm parse <dir> --out result.json also write the full result, then read it back
//   pnpm parse --read result.json      validate a written result and print its summary
//   pnpm parse <dir> --compare old.json
//                                      check the edges old.json has kinds for are byte-identical
//   add --all to list every unresolved import instead of a few per reason

import { readFileSync, writeFileSync } from "node:fs";
import { deserializeParseResult, serializeParseResult } from "../lib/parser/contract.ts";
import { parseRepository } from "../lib/parser/index.ts";
import type { ParseResult, StatusCounts, UnresolvedImport } from "../lib/parser/types.ts";
import { railCategories, railLabel } from "../lib/roles.ts";

const EXAMPLES_PER_REASON = 5;

function main(argv: string[]): void {
  const all = argv.includes("--all");
  const out = valueOf(argv, "--out");
  const read = valueOf(argv, "--read");
  const compare = valueOf(argv, "--compare");
  const valueFlags = ["--out", "--read", "--compare"];
  const positional = argv.filter((arg, i) => !arg.startsWith("--") && !valueFlags.includes(argv[i - 1] ?? ""));

  if (read) {
    const result = deserializeParseResult(readFileSync(read, "utf8"));
    console.log(`Read ${read}: schema v${result.schemaVersion}, contract holds.\n`);
    printSummary(result, all);
    return;
  }

  const [directory] = positional;
  if (!directory) {
    console.error("usage: pnpm parse <dir> [--out file.json] [--all]  |  pnpm parse --read file.json");
    process.exit(1);
  }

  const started = performance.now();
  const result = parseRepository(directory);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  printSummary(result, all);
  console.log(`\nParsed in ${seconds}s.`);

  if (out) {
    const text = serializeParseResult(result);
    writeFileSync(out, text);
    // Round-trip through the validator so a written file is known to be readable.
    const back = deserializeParseResult(readFileSync(out, "utf8"));
    if (serializeParseResult(back) !== text) throw new Error(`${out} changed on the way back in`);
    console.log(`Wrote ${out} (${(text.length / 1024).toFixed(0)} KB), read it back, contract holds.`);
  }

  if (compare) compareEdges(result, compare);
}

// An older output may come from an earlier schema, so it isn't read through
// the contract: only its edge list is, as raw JSON. require() edges are set
// aside first, since no parser before them could find one, so "identical"
// means the edges it did find haven't changed by a byte.
function compareEdges(result: ParseResult, file: string): void {
  const old: unknown = JSON.parse(readFileSync(file, "utf8"));
  const oldEdges: unknown = typeof old === "object" && old !== null ? Reflect.get(old, "edges") : undefined;
  if (!Array.isArray(oldEdges)) throw new Error(`${file} has no edge list`);
  const kept = result.edges.filter((e) => e.kind !== "require");
  const setAside = result.edges.length - kept.length;
  const before = JSON.stringify(oldEdges, null, 2);
  const after = JSON.stringify(kept, null, 2);
  console.log(`\nCompare   ${file}`);
  console.log(`  ${oldEdges.length} edges before, ${kept.length} of those kinds now, plus ${setAside} require`);
  if (before === after) {
    console.log("  byte-identical");
    return;
  }
  const a = before.split("\n");
  const b = after.split("\n");
  const found = a.findIndex((line, i) => line !== b[i]);
  const at = found === -1 ? a.length : found;
  console.log(`  DIFFERENT, first at line ${at + 1} of the edge list:\n    before: ${a[at] ?? "(end)"}\n    now:    ${b[at] ?? "(end)"}`);
  process.exitCode = 1;
}

function printSummary(result: ParseResult, all: boolean): void {
  const { files, imports } = result.coverage;
  const modules = new Set(result.files.map((f) => f.module));

  console.log(`${result.root}\n`);
  console.log(`Projects  ${result.projects.map((p) => `${p.path} (${p.adapter})`).join(", ")}`);
  console.log(`Files     found ${files.found}  parsed ${files.parsed}  skipped ${files.skipped}`);
  for (const file of files.skippedFiles) console.log(`  skipped ${file.path} — ${file.reason}: ${file.detail}`);
  console.log(`Folders   ${modules.size} distinct modules`);
  const reached = result.files.filter((f) => f.reachedBy !== null);
  const byReason = new Map<string, number>();
  for (const f of reached) if (f.reachedBy) byReason.set(f.reachedBy, (byReason.get(f.reachedBy) ?? 0) + 1);
  console.log(`Reached without an import  ${reached.length}${[...byReason].map(([r, n]) => `\n  ${n}  ${r}`).join("")}`);
  const rail = railCategories(result.projects.map((p) => p.adapter), result.files.map((f) => f.role));
  console.log(`Rail      ${rail.map((c) => `${railLabel(c.key)} ${c.count}`).join(" · ")}`);
  if (files.excludedDirectories.length) {
    console.log(`Not walked  ${files.excludedDirectories.map((d) => `${d.path} (${d.reason})`).join(", ")}`);
  }

  console.log(`\nImports   ${"seen".padStart(6)}${"internal".padStart(10)}${"external".padStart(10)}${"excluded".padStart(10)}${"unresolved".padStart(12)}`);
  console.log(row("all", imports.total));
  for (const [kind, counts] of Object.entries(imports.byKind)) console.log(row(kind, counts));

  console.log(`\nExternal  package ${imports.external.package}  builtin ${imports.external.builtin}  outside-root ${imports.external["outside-root"]}`);
  const excluded = Object.entries(imports.excluded);
  if (excluded.length) console.log(`Excluded  ${excluded.map(([reason, n]) => `${reason} ${n}`).join("  ")}`);

  console.log(`Edges     ${result.edges.length} after removing duplicates (${result.edges.filter((e) => e.typeOnly).length} type-only)`);

  const { routes } = result.coverage;
  console.log(`\nRoutes    ${result.routes.length}`);
  for (const r of all ? result.routes : result.routes.slice(0, 40)) console.log(`  ${r.method.padEnd(7)} ${r.pattern.padEnd(40)} ${r.file}:${r.line}`);
  if (!all && result.routes.length > 40) console.log(`  … ${result.routes.length - 40} more (--all)`);
  for (const w of routes.withheld) console.log(`  withheld in ${w.project}: ${w.reason}`);
  for (const o of routes.omitted) console.log(`  omitted ${o.file}:${o.line} — ${o.reason}`);

  if (imports.unresolved.length) {
    console.log(`\nUnresolved (${imports.unresolved.length})`);
    const byReason = new Map<string, UnresolvedImport[]>();
    for (const u of imports.unresolved) byReason.set(u.reason, [...(byReason.get(u.reason) ?? []), u]);
    for (const [reason, list] of byReason) {
      console.log(`  ${reason} — ${list.length}`);
      const shown = all ? list : list.slice(0, EXAMPLES_PER_REASON);
      for (const u of shown) console.log(`    ${u.from}:${u.line}  ${u.kind} "${u.specifier}"  ${u.detail}`);
      if (shown.length < list.length) console.log(`    … ${list.length - shown.length} more (--all)`);
    }
  }

  const configErrors = result.configs.filter((c) => c.errors.length);
  if (configErrors.length) {
    console.log(`\nConfig problems (resolution used what it could read)`);
    for (const c of configErrors) for (const e of c.errors) console.log(`  ${c.path}: ${e}`);
  }
}

function row(label: string, c: StatusCounts): string {
  return `  ${label.padEnd(14)}${String(c.seen).padStart(6)}${String(c.internal).padStart(10)}${String(c.external).padStart(10)}${String(c.excluded).padStart(10)}${String(c.unresolved).padStart(12)}`;
}

function valueOf(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

main(process.argv.slice(2));
