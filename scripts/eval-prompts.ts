// pnpm eval:prompts
import { loadCartographEnv } from "./env.ts";
loadCartographEnv();

import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import type { Run } from "langsmith/schemas";
import { ai, MODELS } from "../lib/ai/client.ts";
import { normalizeJudgeResult, readExplanationDataset, type PromptVersion } from "../lib/evals/prompt-dataset.ts";
import { preferenceScores, summarizeComparison } from "../lib/evals/comparison.ts";
import { buildPromptMessages } from "../evals/prompt-pair.ts";

if (!process.env.LANGSMITH_API_KEY?.trim()) throw new Error("LANGSMITH_API_KEY is required for prompt experiments");
if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY is required for prompt experiments");
const examples = await readExplanationDataset("evals/datasets/explain-file.v1.jsonl");
if (examples.length < 3) throw new Error("Prompt comparison requires at least three frozen examples");
const client = new Client();
const datasetName = `phase11-explain-file-v1-${new Date().toISOString()}`;
const dataset = await client.createDataset(datasetName, { description: "Frozen explanation questions for current v2 vs shipped v1" });
await client.createExamples(examples.map((example) => ({ dataset_id: dataset.id, inputs: { id: example.id, input: example.input, source: example.source } })));

async function runPromptVersion(version: PromptVersion, record: Record<string, unknown>): Promise<{ body: string }> {
  const example = { id: String(record.id), input: record.input as typeof examples[number]["input"], source: String(record.source) };
  const response = await ai().chat.completions.create({
    model: MODELS.explain,
    messages: buildPromptMessages(version, example),
    reasoning_effort: "low",
    verbosity: "low",
  });
  const body = response.choices[0]?.message.content?.trim();
  if (!body) throw new Error(`${version} returned an empty explanation`);
  return { body };
}

const current = await evaluate((record) => runPromptVersion("current", record), {
  data: datasetName, client, experimentPrefix: "phase11-explain-current-v2", maxConcurrency: 2,
  description: "Current application explanation prompt",
});
const currentRunIds = new Set<string>();
for await (const row of current) {
  if (row.run.error) throw new Error(`Current prompt failed for ${row.example.id}: ${row.run.error}`);
  currentRunIds.add(row.run.id);
}
const retired = await evaluate((record) => runPromptVersion("v1", record), {
  data: datasetName, client, experimentPrefix: "phase11-explain-retired-v1", maxConcurrency: 2,
  description: "Previously shipped v1 prompt, kept only under evals/",
});
for await (const row of retired) if (row.run.error) throw new Error(`v1 prompt failed for ${row.example.id}: ${row.run.error}`);

const comparison = await evaluate([current, retired], {
  client,
  experimentPrefix: "phase11-specificity-subjective",
  description: "Subjective model-judge comparison of usefulness and specificity, with randomised answer order",
  randomizeOrder: true,
  maxConcurrency: 2,
  evaluators: [async ({ runs, inputs }: { runs: Run[]; example: unknown; inputs: Record<string, unknown>; outputs: Record<string, unknown>[]; referenceOutputs?: Record<string, unknown> }) => {
    const [first, second] = runs;
    try {
      const answer = await ai().chat.completions.create({
        model: MODELS.classify,
        messages: [
          { role: "system", content: "Judge which explanation is more specific and useful for the supplied repository file. Prefer correct, concrete use of the supplied source and neighbours. Penalize invented claims. If neither is clearly better, choose tie. This is a subjective quality judgment, not ground truth. Return JSON only." },
          { role: "user", content: `File input: ${JSON.stringify(inputs)}\n\nAnswer A: ${String(first.outputs?.body ?? "")}\n\nAnswer B: ${String(second.outputs?.body ?? "")}` },
        ],
        reasoning_effort: "low",
        response_format: { type: "json_schema", json_schema: { name: "explanation_preference", strict: true, schema: { type: "object", properties: { winner: { type: "string", enum: ["A", "B", "tie"] }, reason: { type: "string" } }, required: ["winner", "reason"], additionalProperties: false } } },
      });
      const raw = JSON.parse(answer.choices[0]?.message.content ?? "null") as { winner: string; reason: string };
      const winner = raw.winner === "A" ? (currentRunIds.has(first.id) ? "current" : "v1") :
        raw.winner === "B" ? (currentRunIds.has(second.id) ? "current" : "v1") : raw.winner;
      const judgement = normalizeJudgeResult({ winner, reason: raw.reason });
      console.log(`Judge ${first.reference_example_id}: ${judgement.winner} (${judgement.reason}) [subjective]`);
      const [firstScore, secondScore] = preferenceScores(judgement.winner, currentRunIds.has(first.id));
      return { key: "specificity_subjective", scores: {
        [first.id]: firstScore,
        [second.id]: secondScore,
      } };
    } catch (error) {
      console.warn(`Judge failed for ${first.reference_example_id}: ${error instanceof Error ? error.message : String(error)}`);
      return { key: "specificity_subjective", scores: { [first.id]: null, [second.id]: null } };
    }
  }],
});

const { currentWins, retiredWins, ties, errors, judged, currentMarginPoints } = summarizeComparison(comparison.results, currentRunIds);
if (judged === 0) throw new Error(`All ${errors} model-judge rows failed; no comparison score is available`);
console.log(`Subjective model-judge score: current v2 ${currentWins}, retired v1 ${retiredWins}, ties ${ties}, judge errors ${errors}; current margin ${currentMarginPoints.toFixed(1)} percentage points over ${judged} judged examples`);
console.log(`Current experiment: ${current.experimentName}`);
console.log(`v1 experiment: ${retired.experimentName}`);
console.log(`Comparison dashboard: ${comparison.url ?? comparison.experimentName}`);
