import assert from "node:assert/strict";
import test from "node:test";
import { hideExpectedRole, isEligibleRoleExample, requireMinimumExamples, roleAccuracy } from "../../lib/evals/role-dataset.ts";

test("includes only parsed convention labels the classifier can answer", () => {
  assert.equal(isEligibleRoleExample({ source: "convention", role: "service", skipReason: null }), true);
  assert.equal(isEligibleRoleExample({ source: "convention", role: "page-route", skipReason: null }), false);
  assert.equal(isEligibleRoleExample({ source: "model", role: "service", skipReason: null }), false);
  assert.equal(isEligibleRoleExample({ source: "convention", role: "service", skipReason: "unreadable" }), false);
});

test("requires at least thirty examples", () => {
  assert.throws(() => requireMinimumExamples(Array.from({ length: 29 }, (_, i) => i)), /at least 30/);
  assert.equal(requireMinimumExamples(Array.from({ length: 30 }, (_, i) => i)).length, 30);
});

test("reports exact accuracy percentage", () => {
  assert.deepEqual(roleAccuracy([{ expected: "service", actual: "service" }, { expected: "util", actual: null }]), { correct: 1, total: 2, percentage: 50 });
});

test("hides a convention role carried by a self-import edge", () => {
  const input = { path: "src/service.ts", hash: "hash", exports: [], imports: [{ path: "src/service.ts", role: "service" }], importedBy: [{ path: "src/service.ts", role: "service" }, { path: "src/caller.ts", role: "component" }] };
  assert.deepEqual(hideExpectedRole(input), { ...input, imports: [{ path: "src/service.ts", role: null }], importedBy: [{ path: "src/service.ts", role: null }, { path: "src/caller.ts", role: "component" }] });
});
