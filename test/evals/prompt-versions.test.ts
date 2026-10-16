import assert from "node:assert/strict";
import test from "node:test";
import { readExplanationDataset, normalizeJudgeResult } from "../../lib/evals/prompt-dataset.ts";
import { buildPromptMessages } from "../../evals/prompt-pair.ts";

const datasetPath = "evals/datasets/explain-file.v1.jsonl";

test("both prompt versions receive the same frozen file facts and source", async () => {
  const examples = await readExplanationDataset(datasetPath);
  assert.ok(examples.length >= 3);
  assert.equal(new Set(examples.map((e) => e.id)).size, examples.length);
  for (const example of examples) {
    const current = buildPromptMessages("current", example);
    const previous = buildPromptMessages("v1", example);
    assert.ok(current[1].content.includes(example.input.path));
    assert.ok(previous[1].content.includes(example.input.path));
    assert.ok(current[1].content.includes(example.source));
    assert.ok(previous[1].content.includes(example.source));
    assert.notEqual(current[0].content, previous[0].content);
  }
});

test("judge results are explicitly subjective and reject unknown winners", () => {
  assert.deepEqual(normalizeJudgeResult({ winner: "current", reason: "Names exact dependencies" }), { winner: "current", reason: "Names exact dependencies", subjective: true });
  assert.throws(() => normalizeJudgeResult({ winner: "other", reason: "x" }), /Invalid judge result/);
});
