import assert from "node:assert/strict";
import test from "node:test";

import { loadCartographEnv } from "../scripts/env.ts";

test("loads the project environment once for standalone scripts", () => {
  assert.doesNotThrow(() => loadCartographEnv());
  assert.doesNotThrow(() => loadCartographEnv());
});
