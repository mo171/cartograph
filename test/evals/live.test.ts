import assert from "node:assert/strict";
import test from "node:test";
import { explainFile, type Cache } from "../../lib/ai/tasks.ts";
import { liveFileEvaluation } from "../../lib/evals/live.ts";
import type { FileInput } from "../../lib/ai/prompts.ts";

const input: FileInput = { path: "src/a.ts", hash: "hash", role: "util", reachedBy: null, exports: [], imports: [], importedBy: [] };
const cache: Cache = { read: async () => "`src/a.ts` does work.", write: async () => {} };

test("live evaluator records the invented path and exact allowed set", () => {
  const result = liveFileEvaluation(input, { body: "`src/invented.ts`", model: "test", cached: false });
  assert.deepEqual(result.allowedPaths, ["src/a.ts"]);
  assert.deepEqual(result.invented, ["src/invented.ts"]);
  assert.equal(result.score, 0);
});

test("cache hits are evaluated without fetching source", async () => {
  let recorded = 0;
  const answer = await explainFile(input, { cache, source: async () => { throw new Error("unexpected source fetch"); }, evaluate: async () => { recorded++; } });
  assert.equal(answer.cached, true);
  assert.equal(recorded, 1);
});

test("evaluation reporting failure leaves a usable explanation", async () => {
  const original = console.error;
  const errors: string[] = [];
  console.error = (...parts) => { errors.push(parts.map(String).join(" ")); };
  try {
    const answer = await explainFile(input, { cache, source: async () => "", evaluate: async () => { throw new Error("tracing unavailable"); } });
    assert.equal(answer.body, "`src/a.ts` does work.");
    assert.match(errors.join("\n"), /tracing unavailable/);
  } finally {
    console.error = original;
  }
});
