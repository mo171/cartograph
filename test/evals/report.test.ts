import assert from "node:assert/strict";
import test from "node:test";
import { formatInventedPathReport, summarizeInventedPathRuns } from "../../lib/evals/report.ts";

test("reports a score and an inspectable invented path", () => {
  const report = formatInventedPathReport([
    { id: "run-1", inputs: { task: "explain-file", body: "`src/invented.ts`", allowedPaths: ["src/real.ts"] }, outputs: { score: 0, invented: ["src/invented.ts"] } },
    { id: "run-2", inputs: { task: "explain-file", body: "`src/real.ts`", allowedPaths: ["src/real.ts"] }, outputs: { score: 1, invented: [] } },
  ]);
  assert.match(report, /invented-path score: 1\/2 \(50\.0%\)/);
  assert.match(report, /src\/invented\.ts/);
  assert.match(report, /allowed: src\/real\.ts/);
  assert.match(report, /run-1/);
});

test("rejects empty or malformed live evaluations", () => {
  assert.throws(() => summarizeInventedPathRuns([]), /No live explanation evaluations/);
  assert.throws(() => summarizeInventedPathRuns([{ id: "x", inputs: {}, outputs: {} }]), /Malformed/);
});
