// One hue per extension, a handful and no more. Anything past these is grey
// rather than a new colour nobody can tell apart.
const CATEGORY_COLOUR: Record<string, string> = {
  ts: "var(--kind-1)",
  tsx: "var(--kind-2)",
  js: "var(--kind-3)",
  jsx: "var(--kind-4)",
};

export function CategorySwatch({ category }: { category: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-[8px] shrink-0 rounded-[2px]"
      style={{ background: CATEGORY_COLOUR[category] ?? "var(--fg-muted)" }}
    />
  );
}
