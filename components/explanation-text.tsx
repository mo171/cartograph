import type { ReactNode } from "react";

// The prompt permits three pieces of formatting: inline code, bullets and
// bold. This renders exactly those. Anything else a model slips in anyway is
// reduced to its text rather than printed as markup: a heading becomes a bold
// line, a numbered item a bullet, italics plain words, and a stray backtick or
// asterisk is dropped. Every repository path in the prose is a link that
// moves the map to it.

type Block = { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };

const BULLET = /^\s*(?:[-*•+]|\d+[.)])\s+/;
const HEADING = /^\s*#{1,6}\s+/;
const FENCE = /^\s*```/;

export function ExplanationText({ text, isPath, onPath }: { text: string; isPath: (path: string) => boolean; onPath: (path: string) => ReactNode }) {
  const inline = (s: string) => renderInline(s, isPath, onPath);
  return (
    <div className="space-y-2 text-[12px] leading-[18px]">
      {blocks(text).map((b, i) =>
        b.kind === "paragraph" ? (
          <p key={i}>{inline(b.text)}</p>
        ) : (
          <ul key={i} className="space-y-0.5 pl-3">
            {b.items.map((item, j) => (
              <li key={j} className="relative before:absolute before:-left-2.5 before:text-fg-muted before:content-['–']">
                {inline(item)}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function blocks(text: string): Block[] {
  const out: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (paragraph.length) out.push({ kind: "paragraph", text: paragraph.join(" ") });
    if (list) out.push({ kind: "list", items: list });
    paragraph = [];
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (FENCE.test(line)) continue;
    if (!line.trim()) {
      flush();
    } else if (HEADING.test(line)) {
      flush();
      const heading = line.replace(HEADING, "").replace(/\*\*/g, "").trim();
      out.push({ kind: "paragraph", text: `**${heading}**` });
    } else if (BULLET.test(line)) {
      if (paragraph.length) flush();
      (list ??= []).push(line.replace(BULLET, ""));
    } else if (list && /^\s{2,}/.test(raw)) {
      // A bullet's continuation line.
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      if (list) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  return out;
}

// Code spans first, so nothing inside backticks is read as bold, then bold.
const TOKEN = /`([^`]+)`|\*\*(.+?)\*\*|__(.+?)__/g;

function renderInline(text: string, isPath: (path: string) => boolean, onPath: (path: string) => ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index;
    if (at > last) out.push(...plain(text.slice(last, at), isPath, onPath, n++));
    const [, code, bold, boldAlt] = m;
    if (code !== undefined) {
      const inner = code.trim();
      out.push(
        isPath(inner) ? (
          <span key={`c${at}`}>{onPath(inner)}</span>
        ) : (
          <code key={`c${at}`} className="rounded-[2px] bg-raised px-1 font-mono text-[11px]">
            {inner}
          </code>
        ),
      );
    } else {
      out.push(
        <strong key={`b${at}`} className="font-semibold">
          {renderInline(bold ?? boldAlt ?? "", isPath, onPath)}
        </strong>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(...plain(text.slice(last), isPath, onPath, n++));
  return out;
}

// Prose between the permitted markup: italics lose their markers, leftover
// backticks and asterisks go, and a bare path is linked like a quoted one.
function plain(text: string, isPath: (path: string) => boolean, onPath: (path: string) => ReactNode, n: number): ReactNode[] {
  const cleaned = text
    .replace(/(^|[^\w*])\*(?=\S)([^*]+?)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w])_(?=\S)([^_]+?)_(?!\w)/g, "$1$2")
    .replace(/[`*]/g, "");
  return cleaned.split(/(\s+)/).map((word, i) => {
    const match = word.match(/^([("'[]*)(.*?)([)"'\].,;:!?]*)$/);
    const core = match?.[2] ?? word;
    if (core && core.length > 2 && isPath(core)) {
      return (
        <span key={`p${n}-${i}`}>
          {match?.[1]}
          {onPath(core)}
          {match?.[3]}
        </span>
      );
    }
    return word;
  });
}
