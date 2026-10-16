import { EXPLAIN_FILE_SYSTEM, explainFileMessage } from "../lib/ai/prompts.ts";
import type { ExplanationExample, PromptVersion } from "../lib/evals/prompt-dataset.ts";
import { EXPLAIN_FILE_SYSTEM_V1, explainFileMessageV1 } from "./prompts/explain-file.v1.ts";

export function buildPromptMessages(version: PromptVersion, example: ExplanationExample): [{ role: "system"; content: string }, { role: "user"; content: string }] {
  return [
    { role: "system", content: version === "current" ? EXPLAIN_FILE_SYSTEM : EXPLAIN_FILE_SYSTEM_V1 },
    { role: "user", content: version === "current" ? explainFileMessage(example.input, example.source) : explainFileMessageV1(example.input, example.source) },
  ];
}
