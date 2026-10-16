import assert from "node:assert/strict";
import test from "node:test";
import { preferenceScores, summarizeComparison } from "../../lib/evals/comparison.ts";

test("assigns the winning prompt a one regardless of answer order", () => {
  assert.deepEqual(preferenceScores("current", true), [1, 0]);
  assert.deepEqual(preferenceScores("current", false), [0, 1]);
  assert.deepEqual(preferenceScores("tie", false), [0.5, 0.5]);
});

test("excludes failed judge rows and reports the signed margin", () => {
  const summary = summarizeComparison([
    { scores: { current1: 1, v01: 0 } },
    { scores: { current2: 0, v02: 1 } },
    { scores: { current3: 1, v03: 0 } },
    { scores: { current4: null, v04: null } },
  ], new Set(["current1", "current2", "current3", "current4"]));
  assert.deepEqual(summary, { currentWins: 2, retiredWins: 1, ties: 0, errors: 1, judged: 3, currentMarginPoints: 100 / 3 });
});
