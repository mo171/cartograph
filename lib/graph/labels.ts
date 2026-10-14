// The shortest trailing run of path segments that no other path on screen
// shares. "components" until there are two of them, then "ui/components".
export function shortestUniqueLabels(paths: readonly string[]): Map<string, string> {
  const split = new Map(paths.map((p) => [p, p.split("/")]));
  const labels = new Map<string, string>();
  for (const [path, segments] of split) {
    let k = 1;
    for (; k < segments.length; k++) {
      const suffix = segments.slice(-k).join("/");
      const clash = [...split].some(([other, s]) => other !== path && s.slice(-k).join("/") === suffix);
      if (!clash) break;
    }
    labels.set(path, segments.slice(-k).join("/"));
  }
  return labels;
}
