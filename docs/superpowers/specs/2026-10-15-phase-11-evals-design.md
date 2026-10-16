# Phase 11 Evals Design

## Goal

Measure the quality of Cartograph's explanation and role-classification model
behaviour with reproducible, inspectable scores. Deterministic checks remain
deterministic; the one qualitative comparison openly uses a model judge.

## Scope and decisions

Cartograph already uses LangSmith tracing, so LangSmith's experiment dashboard
is the comparison surface. This avoids a second application dashboard and lets
the team inspect each experiment row, inputs, outputs, and evaluator result.

External scripts will load environment variables through `@next/env` before
importing application modules. This has the same `.env*` precedence as Next.js
and replaces scripts' ad-hoc `--env-file=.env.local` dependency.

The application will record a compact evaluation record for every fresh or
cached live explanation: task kind, answer, and the exact allowed repository
paths derived from the `FileInput` or `FolderInput` passed to the model. The
record is sent to an in-process deterministic evaluator immediately; it does
not ask a model to identify hallucinations. It must also be traceable as a
LangSmith run so recent real traffic can be measured from the dashboard.

`extractPathTokens` will only recognize backtick-delimited repository paths.
This matches the explanation prompt's required path representation and avoids
mistaking prose such as `e.g.` or URLs for paths. `scoreInventedPaths` compares
each distinct extracted path against the stored allowed-path set, returns a
binary score and a sorted list of invented paths. The set includes the focal
file/folder and every path named by the prompt's structured facts.

Role accuracy is a script-driven LangSmith experiment. It selects parsed files
with a convention role that is also present in `MODEL_ROLES`; structural or
otherwise forbidden labels are excluded. For each selected row it recreates
the existing `ClassifyInput`, fetches the source at the analysis commit, calls
the classifier without the ground-truth role, and compares its returned role to
the conventional role. For a self-import edge it also removes the focal file's
role from both neighbour lists, so the held-out answer cannot leak through its
own context. The script rejects a run with fewer than 30 examples
and reports correct, total, and percentage.

Prompt comparison is a separate script-driven experiment over a frozen,
versioned JSONL explanation dataset. `evals/prompts/explain-file.v1.ts` holds
the previously shipped v1 prompt from commit `5cb2ece`; the application ships
a more specific v2 prompt. The script runs both versions against exactly the same dataset,
publishes two named LangSmith experiments, and runs a clearly-labelled
model-as-judge evaluator that selects the more specific and useful answer for
each input. The reported win rate and margin are subjective measurements, not
ground truth.

Only the file explanation cache version advances to v2. Folder explanations
and role classification keep their v1 cache keys because their prompts did not
change.

## Boundaries

`lib/evals/invented-paths.ts` contains pure extraction and scoring logic and
has no database, OpenAI, or LangSmith imports. `lib/evals/live.ts` adapts a
live explanation input and answer to that pure contract. Scripts own dataset
construction, model invocation, experiment publishing, and terminal reporting.
The retired prompt is isolated under `evals/`; no app module imports it.

No user-facing database tables are necessary for this phase. LangSmith stores
experiment and evaluator records, while the existing Supabase analysis tables
remain the source of real explanation and held-out role data.

## Failure handling

Path evaluator failures must not turn a successful explanation into an error;
the answer remains visible and the tracing failure is recorded. Evaluation
scripts fail fast on missing required credentials, invalid dataset records,
fewer than 30 valid role examples, empty model answers, and unreachable source
files. A failed judge row is reported separately and excluded from the stated
comparison denominator.

## Tests

Unit tests cover: allowed paths passing; a made-up backticked filename being
reported; duplicate invented paths being reported once; non-path code tokens
being ignored; and correct role-dataset eligibility. Script-level tests cover
the minimum thirty-example guard and ensure the retired prompt is never
imported by `lib/ai` or `app`.

## Alternatives considered

1. A custom Supabase-backed eval dashboard. Rejected because it duplicates
   LangSmith's trace/experiment inspection and adds schema, RLS, and UI work
   unrelated to measuring quality.
2. A model grader for invented paths. Rejected because membership in a known
   set has an exact answer and the grader could itself hallucinate.
3. A dataset-only path check. Rejected because it cannot detect failures in
   current real traffic.

