import type { ReactNode } from "react";

// The one layout every analysis renders into. Column positions and widths are
// fixed here and nowhere else: later phases fill the columns, they don't move
// them. The detail pane is a real column, not an overlay, so opening it never
// covers the map.
export function Shell({ rail, map, detail }: { rail?: ReactNode; map?: ReactNode; detail?: ReactNode }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[11rem_minmax(0,1fr)_20rem]">
      <nav aria-label="Categories" className="min-h-0 overflow-y-auto border-r border-line bg-surface">
        {rail}
      </nav>
      <section aria-label="Map" className="relative min-h-0 min-w-0 bg-canvas">
        {map}
      </section>
      <aside aria-label="Details" className="min-h-0 overflow-y-auto border-l border-line bg-surface">
        {detail}
      </aside>
    </div>
  );
}
