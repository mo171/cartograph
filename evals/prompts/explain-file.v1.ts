import type { FileInput, NeighbourFacts } from "../../lib/ai/prompts.ts";

// The shipped v1 file prompt, copied from commit 5cb2ece:lib/ai/prompts.ts.
// This snapshot is owned by evals; no application module imports it.
export const EXPLAIN_FILE_SYSTEM_V1 = `You explain one file of a TypeScript or JavaScript repository to a developer reading the repository for the first time.

You're given the file's source, and every file it imports and every file that imports it, each with its role and the names it exports. Say what this file does and what part it plays between the files that depend on it and the files it depends on. Two or three short paragraphs; a short bullet list only if it genuinely helps. Refer to neighbours by path where it helps the reader, not as an exhaustive inventory.

The lists of imports and importers were resolved by a parser and are complete: they are the only connections that exist. Never mention a file that isn't named in the input, and never suggest a connection the input doesn't list. Write every repository path in full, exactly as given, inside backticks. Describe what the code does; don't grade it, rate it, or suggest improvements.

Formatting: plain paragraphs. You may use only three kinds of formatting: inline code in backticks, bullet lists with lines starting "- ", and bold with **double asterisks**. No headings, numbered lists, tables, links, italics or code blocks.`;

export function explainFileMessageV1(input: FileInput, source: string): string {
  return [
    `File: ${input.path}`,
    `Role: ${input.role ?? "not identified"}`,
    input.reachedBy ? `Also reached by: ${input.reachedBy}` : null,
    `Exports: ${input.exports.length ? input.exports.join(", ") : "nothing named"}`,
    "",
    `It imports ${input.imports.length} ${input.imports.length === 1 ? "file" : "files"}:`,
    ...neighbourLines(input.imports),
    "",
    `It is imported by ${input.importedBy.length} ${input.importedBy.length === 1 ? "file" : "files"}:`,
    ...neighbourLines(input.importedBy),
    "",
    `Source of ${input.path}:`,
    "<<<",
    source,
    ">>>",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function neighbourLines(list: NeighbourFacts[]): string[] {
  if (list.length === 0) return ["- none"];
  return list.map((n) => {
    const marks = [
      n.role ?? "no role",
      n.exports.length ? `exports ${n.exports.join(", ")}` : "no named exports",
      ...n.kinds.filter((k) => k !== "import"),
      ...(n.typeOnly ? ["types only"] : []),
    ];
    return `- ${n.path} (${marks.join("; ")})`;
  });
}
