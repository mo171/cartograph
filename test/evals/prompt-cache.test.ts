import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { cacheKey } from "../../lib/ai/tasks.ts";

const input = { path: "src/example.ts", hash: "abc" };
const oldKey = (task: string) => createHash("sha256").update(JSON.stringify({ task, version: 1, model: "model-v1", input })).digest("hex");

test("unchanged folder and classification prompts retain v1 cache keys", () => {
  assert.equal(cacheKey("explain-folder", "model-v1", input), oldKey("explain-folder"));
  assert.equal(cacheKey("classify-file", "model-v1", input), oldKey("classify-file"));
});

test("changed file prompt does not reuse the v1 answer", () => {
  assert.notEqual(cacheKey("explain-file", "model-v1", input), oldKey("explain-file"));
});
