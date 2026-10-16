import { traceable } from "langsmith/traceable";
import type { Explanation } from "../ai/tasks.ts";
import { traceConfig } from "../ai/client.ts";
import type { FileInput, FolderInput } from "../ai/prompts.ts";
import { allowedFilePaths, allowedFolderPaths, scoreInventedPaths } from "./invented-paths.ts";

export type LiveEvaluation = {
  task: "explain-file" | "explain-folder";
  body: string;
  model: string;
  cached: boolean;
  allowedPaths: string[];
  score: 0 | 1;
  mentioned: string[];
  invented: string[];
};

export function liveFileEvaluation(input: FileInput, answer: Explanation): LiveEvaluation {
  return build("explain-file", answer, allowedFilePaths(input));
}

export function liveFolderEvaluation(input: FolderInput, answer: Explanation): LiveEvaluation {
  return build("explain-folder", answer, allowedFolderPaths(input));
}

function build(task: LiveEvaluation["task"], answer: Explanation, allowed: ReadonlySet<string>): LiveEvaluation {
  return { task, ...answer, allowedPaths: [...allowed].sort(), ...scoreInventedPaths(answer.body, allowed) };
}

const recordLive = traceable(async (evaluation: LiveEvaluation) => ({
  score: evaluation.score,
  invented: evaluation.invented,
  mentioned: evaluation.mentioned,
}), traceConfig("eval-invented-paths-live"));

export async function evaluateLiveFileExplanation(input: FileInput, answer: Explanation): Promise<void> {
  await recordLive(liveFileEvaluation(input, answer));
}

export async function evaluateLiveFolderExplanation(input: FolderInput, answer: Explanation): Promise<void> {
  await recordLive(liveFolderEvaluation(input, answer));
}
