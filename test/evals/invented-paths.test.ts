import assert from "node:assert/strict";
import test from "node:test";
import { allowedFilePaths, allowedFolderPaths, scoreInventedPaths } from "../../lib/evals/invented-paths.ts";

test("flags a made-up filename spliced into an explanation", () => {
  const result = scoreInventedPaths("`src/real.ts` imports `src/invented.ts`.", new Set(["src/real.ts"]));
  assert.equal(result.score, 0);
  assert.deepEqual(result.invented, ["src/invented.ts"]);
});

test("checks a bare path, deduplicates failures and ignores inline code", () => {
  const result = scoreInventedPaths("Use `map()` and src/nope.ts; `src/nope.ts` repeats.", new Set());
  assert.deepEqual(result.invented, ["src/nope.ts"]);
  assert.deepEqual(result.mentioned, ["src/nope.ts"]);
});

test("a valid explanation scores one", () => {
  assert.equal(scoreInventedPaths("`README.md` describes src/main.ts.", new Set(["README.md", "src/main.ts"])).score, 1);
});

test("detects an invented bare root filename", () => {
  assert.deepEqual(scoreInventedPaths("The answer lives in fake.ts.", new Set()).invented, ["fake.ts"]);
});

test("ignores dotted identifiers and product names", () => {
  assert.deepEqual(scoreInventedPaths("`process.env`, `Object.keys`, and `Next.js` are not files.", new Set()).mentioned, []);
});

test("detects an extensionless path under a shown repository root", () => {
  assert.deepEqual(scoreInventedPaths("See src/ghost for details.", new Set(["src/real.ts"])).invented, ["src/ghost"]);
});

test("file context allows only its focal file and direct neighbours", () => {
  const paths = allowedFilePaths({ path: "src/a.ts", hash: "hash", role: null, reachedBy: null, exports: [], imports: [{ path: "src/b.ts", role: null, exports: [], kinds: ["import"], typeOnly: false }], importedBy: [{ path: "src/c.ts", role: null, exports: [], kinds: ["import"], typeOnly: false }] });
  assert.deepEqual([...paths].sort(), ["src/a.ts", "src/b.ts", "src/c.ts"]);
});

test("folder context allows member files and both ends of crossing edges", () => {
  const paths = allowedFolderPaths({ dir: "src", files: [{ path: "src/a.ts", hash: "hash", role: null, exports: [], fanIn: 1, fanOut: 1 }], incoming: [{ from: "outside/b.ts", to: "src/a.ts" }], outgoing: [{ from: "src/a.ts", to: "outside/c.ts" }] });
  assert.deepEqual([...paths].sort(), ["outside/b.ts", "outside/c.ts", "src/", "src/a.ts"]);
});
