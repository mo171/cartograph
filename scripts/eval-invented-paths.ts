// pnpm eval:invented-paths --limit 100
import { loadCartographEnv } from "./env.ts";
loadCartographEnv();

import { Client } from "langsmith";
import { formatInventedPathReport, type LiveRun } from "../lib/evals/report.ts";

const key = process.env.LANGSMITH_API_KEY?.trim();
if (!key) throw new Error("LANGSMITH_API_KEY is required to inspect recent real explanations");
const project = process.env.LANGSMITH_PROJECT?.trim() || "default";
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const flag = args.indexOf("--limit");
const limit = flag < 0 ? 100 : Number(args[flag + 1]);
if (!Number.isSafeInteger(limit) || limit < 1 || (flag >= 0 && args.length !== 2)) throw new Error("Usage: pnpm eval:invented-paths --limit <positive integer>");

const client = new Client({ apiKey: key });
const runs: LiveRun[] = [];
for await (const run of client.listRuns({ projectName: project, runType: "chain", filter: 'eq(name, "eval-invented-paths-live")', order: "desc", limit })) {
  runs.push({ id: run.id, inputs: run.inputs, outputs: run.outputs });
}
console.log(formatInventedPathReport(runs));
