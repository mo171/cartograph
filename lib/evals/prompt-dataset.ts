import { readFile } from "node:fs/promises";
import type { FileInput } from "../ai/prompts.ts";

export type ExplanationExample = { id: string; input: FileInput; source: string };
export type PromptVersion = "current" | "v1";
export type JudgeResult = { winner: PromptVersion | "tie"; reason: string; subjective: true };

export async function readExplanationDataset(path: string): Promise<ExplanationExample[]> {
  const lines = (await readFile(path, "utf8")).split(/\r?\n/).filter((line) => line.trim());
  const seen = new Set<string>();
  return lines.map((line, index) => {
    let value: unknown;
    try { value = JSON.parse(line); } catch { throw new Error(`Invalid JSON on dataset line ${index + 1}`); }
    if (!isExample(value) || seen.has(value.id)) throw new Error(`Invalid or duplicate explanation example on line ${index + 1}`);
    seen.add(value.id);
    return value;
  });
}

export function normalizeJudgeResult(value: unknown): JudgeResult {
  if (!isRecord(value) || !["current", "v1", "tie"].includes(value.winner as string) ||
      typeof value.reason !== "string" || !value.reason.trim()) throw new Error("Invalid judge result");
  return { winner: value.winner as JudgeResult["winner"], reason: value.reason, subjective: true };
}

function isExample(value: unknown): value is ExplanationExample {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.source !== "string" || !value.source || !isRecord(value.input)) return false;
  const input = value.input;
  const neighbour = (v: unknown) => isRecord(v) && typeof v.path === "string" && (v.role === null || typeof v.role === "string") &&
    Array.isArray(v.exports) && v.exports.every((x) => typeof x === "string") && Array.isArray(v.kinds) &&
    v.kinds.every((x) => typeof x === "string") && typeof v.typeOnly === "boolean";
  return typeof input.path === "string" && typeof input.hash === "string" &&
    (input.role === null || typeof input.role === "string") && (input.reachedBy === null || typeof input.reachedBy === "string") &&
    Array.isArray(input.exports) && input.exports.every((x) => typeof x === "string") &&
    Array.isArray(input.imports) && input.imports.every(neighbour) && Array.isArray(input.importedBy) && input.importedBy.every(neighbour);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
