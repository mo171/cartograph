import type { JudgeResult } from "./prompt-dataset.ts";

export function preferenceScores(winner: JudgeResult["winner"], firstIsCurrent: boolean): [number, number] {
  if (winner === "tie") return [0.5, 0.5];
  const firstWins = (winner === "current") === firstIsCurrent;
  return firstWins ? [1, 0] : [0, 1];
}

export function summarizeComparison(
  results: readonly { scores: Record<string, number | boolean | null> }[],
  currentRunIds: ReadonlySet<string>,
): { currentWins: number; retiredWins: number; ties: number; errors: number; judged: number; currentMarginPoints: number } {
  let currentWins = 0;
  let retiredWins = 0;
  let ties = 0;
  let errors = 0;
  for (const result of results) {
    const score = Object.entries(result.scores).find(([id]) => currentRunIds.has(id))?.[1];
    if (score === null || score === undefined) errors++;
    else if (score === 1) currentWins++;
    else if (score === 0) retiredWins++;
    else if (score === 0.5) ties++;
    else throw new Error(`Unexpected comparative score ${String(score)}`);
  }
  const judged = currentWins + retiredWins + ties;
  return { currentWins, retiredWins, ties, errors, judged, currentMarginPoints: judged ? (currentWins - retiredWins) * 100 / judged : 0 };
}
