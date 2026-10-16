import { isModelRole, type ModelRole } from "../roles.ts";
import type { ClassifyInput } from "../ai/prompts.ts";

/** A self-edge must not reveal the convention label being held out. */
export function hideExpectedRole(input: ClassifyInput): ClassifyInput {
  const hide = (item: { path: string; role: string | null }) => item.path === input.path ? { ...item, role: null } : item;
  return { ...input, imports: input.imports.map(hide), importedBy: input.importedBy.map(hide) };
}

export function isEligibleRoleExample(row: { source: string; role: string; skipReason: string | null }): row is typeof row & { role: ModelRole } {
  return row.source === "convention" && row.skipReason === null && isModelRole(row.role);
}

export function requireMinimumExamples<T>(examples: T[], minimum = 30): T[] {
  if (examples.length < minimum) throw new Error(`Role accuracy needs at least ${minimum} eligible files; found ${examples.length}`);
  return examples;
}

export function roleAccuracy(rows: readonly { expected: ModelRole; actual: ModelRole | null }[]): { correct: number; total: number; percentage: number } {
  const correct = rows.filter(({ expected, actual }) => expected === actual).length;
  return { correct, total: rows.length, percentage: rows.length === 0 ? 0 : 100 * correct / rows.length };
}
