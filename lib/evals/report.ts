import { scoreInventedPaths } from "./invented-paths.ts";

export type LiveRun = { id: string; inputs: unknown; outputs: unknown };
export type CheckedRun = { id: string; body: string; allowedPaths: string[]; score: 0 | 1; invented: string[] };

export function summarizeInventedPathRuns(runs: readonly LiveRun[]): { passing: number; total: number; failures: CheckedRun[] } {
  if (runs.length === 0) throw new Error("No live explanation evaluations found in the selected project");
  const checked = runs.map((run): CheckedRun => {
    const inputs = record(run.inputs);
    const outputs = record(run.outputs);
    const paths = inputs?.allowedPaths;
    if (!inputs || !outputs || typeof inputs.body !== "string" || !Array.isArray(paths) ||
        !paths.every((p) => typeof p === "string") || ![0, 1].includes(outputs.score as number)) {
      throw new Error(`Malformed live evaluation ${run.id}`);
    }
    const actual = scoreInventedPaths(inputs.body, new Set(paths as string[]));
    if (actual.score !== outputs.score || JSON.stringify(actual.invented) !== JSON.stringify(outputs.invented)) {
      throw new Error(`Malformed live evaluation ${run.id}: stored score differs from deterministic check`);
    }
    return { id: run.id, body: inputs.body, allowedPaths: paths as string[], score: actual.score, invented: actual.invented };
  });
  return { passing: checked.filter((run) => run.score === 1).length, total: checked.length, failures: checked.filter((run) => run.score === 0) };
}

export function formatInventedPathReport(runs: readonly LiveRun[]): string {
  const { passing, total, failures } = summarizeInventedPathRuns(runs);
  return [
    `invented-path score: ${passing}/${total} (${(100 * passing / total).toFixed(1)}%)`,
    ...failures.map(({ id, body, invented, allowedPaths }) => `run ${id}: invented ${invented.join(", ")}\n  allowed: ${allowedPaths.join(", ")}\n  answer: ${body.replace(/\s+/g, " ")}`),
  ].join("\n");
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
