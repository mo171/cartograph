// pnpm eval:roles [--analysis <completed-analysis-uuid>]
import { createHash } from "node:crypto";
import { loadCartographEnv } from "./env.ts";
loadCartographEnv();

import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import { classifyFile, type Cache } from "../lib/ai/tasks.ts";
import { loadFileInput } from "../lib/analysis/context.ts";
import { readAll } from "../lib/analysis/load.ts";
import { hideExpectedRole, isEligibleRoleExample, requireMinimumExamples, roleAccuracy } from "../lib/evals/role-dataset.ts";
import { fetchFileAt } from "../lib/pipeline/github.ts";
import { createAdminSupabase } from "../lib/supabase/admin.ts";
import type { ClassifyInput } from "../lib/ai/prompts.ts";
import type { ModelRole } from "../lib/roles.ts";

if (!process.env.LANGSMITH_API_KEY?.trim()) throw new Error("LANGSMITH_API_KEY is required for role experiments");
if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY is required for role experiments");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
if (args.length !== 0 && (args.length !== 2 || args[0] !== "--analysis" || !/^[0-9a-f-]{36}$/i.test(args[1]))) {
  throw new Error("Usage: pnpm eval:roles [--analysis <completed-analysis-uuid>]");
}

const db = createAdminSupabase();
const client = new Client();
const analysisId = args[1];
const query = db.from("analyses").select("id, commit_sha, status, projects!inner(repo_owner, repo_name)").eq("status", "complete").not("commit_sha", "is", null).order("finished_at", { ascending: false }).limit(25);
const { data: analyses, error: analysisError } = await (analysisId ? query.eq("id", analysisId) : query);
if (analysisError) throw new Error(`Reading analyses failed: ${analysisError.message}`);
if (!analyses?.length) throw new Error("No completed analysis with a commit is available");

type Row = { id: string; path: string; hash: string | null; skip_reason: string | null; file_roles: { role: string; source: string }[] };
let chosen: typeof analyses[number] | null = null;
let heldOut: { path: string; hash: string; role: ModelRole }[] = [];
for (const analysis of analyses) {
  const data = await readAll((from, to) => db.from("files").select("id, path, hash, skip_reason, file_roles(role, source)").eq("analysis_id", analysis.id).order("id").range(from, to));
  const eligible = (data as Row[]).flatMap((row) => {
    const role = row.file_roles[0];
    if (!role || !row.hash || !isEligibleRoleExample({ source: role.source, role: role.role, skipReason: row.skip_reason })) return [];
    return [{ path: row.path, hash: row.hash, role: role.role as ModelRole }];
  });
  if (eligible.length >= 30) { chosen = analysis; heldOut = eligible; break; }
  console.warn(`Analysis ${analysis.id}: ${eligible.length} eligible files; at least 30 needed`);
}
if (!chosen) throw new Error("No completed analysis has at least 30 convention-labelled files the classifier may return");
const sha = chosen.commit_sha;
if (!sha) throw new Error("Selected analysis has no commit SHA");
const repository = { owner: chosen.projects.repo_owner, name: chosen.projects.repo_name };
const examples: { path: string; input: ClassifyInput; source: string; expected: ModelRole }[] = [];
for (const candidate of heldOut) {
  if (examples.length >= 50) break;
  const loaded = await loadFileInput(db, chosen.id, candidate.path);
  if (!loaded) { console.warn(`Excluded ${candidate.path}: stored input is missing`); continue; }
  let bytes: Buffer | null;
  try {
    bytes = await fetchFileAt(repository, sha, candidate.path);
  } catch (error) {
    console.warn(`Excluded ${candidate.path}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  if (!bytes || createHash("sha256").update(bytes).digest("hex") !== candidate.hash) {
    console.warn(`Excluded ${candidate.path}: historical source unavailable or differs from the parsed hash`);
    continue;
  }
  examples.push({ path: candidate.path, input: hideExpectedRole(loaded.classify), source: bytes.toString("utf8").split("\n").slice(0, 60).join("\n"), expected: candidate.role });
}
requireMinimumExamples(examples);

const datasetName = `phase11-role-${chosen.id}-${new Date().toISOString()}`;
const dataset = await client.createDataset(datasetName, { description: `Held-out convention roles from ${repository.owner}/${repository.name}@${sha}` });
await client.createExamples(examples.map((example) => ({ dataset_id: dataset.id, inputs: { input: example.input, source: example.source }, outputs: { role: example.expected }, metadata: { path: example.path, analysis_id: chosen.id } })));

const noCache: Cache = { read: async () => null, write: async () => {} };
const results = await evaluate(async (record) => {
  const input = record.input as ClassifyInput;
  const source = record.source as string;
  const { role } = await classifyFile(input, { cache: noCache, source: async () => source });
  return { role };
}, {
  data: datasetName,
  client,
  experimentPrefix: `phase11-role-accuracy-${chosen.id.slice(0, 8)}`,
  maxConcurrency: 3,
  evaluators: [({ outputs, referenceOutputs }: { run: unknown; example: unknown; inputs: Record<string, unknown>; outputs: Record<string, unknown>; referenceOutputs?: Record<string, unknown> }) => ({ key: "role_accuracy", score: outputs.role === referenceOutputs?.role ? 1 : 0 })],
});
const scored: { expected: ModelRole; actual: ModelRole | null }[] = [];
for await (const row of results) {
  if (row.run.error) throw new Error(`Role prediction failed for example ${row.example.id}: ${row.run.error}`);
  scored.push({ expected: row.example.outputs?.role as ModelRole, actual: row.run.outputs?.role as ModelRole | null });
}
requireMinimumExamples(scored);
const summary = roleAccuracy(scored);
console.log(`Role accuracy: ${summary.correct}/${summary.total} (${summary.percentage.toFixed(1)}%)`);
console.log(`LangSmith experiment: ${results.experimentName}`);
