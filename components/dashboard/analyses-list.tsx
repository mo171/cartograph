import { AnalysisItem } from '@/lib/data/analyses';

interface AnalysesListProps {
  analyses: AnalysisItem[];
  orgName: string;
}

export function AnalysesList({ analyses, orgName }: AnalysesListProps) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface/50 p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/[0.04] border border-surface-border text-foreground/40 mb-3.5">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="8" r="3" />
            <circle cx="12" cy="18" r="3" />
            <path d="m8.5 7.5 7 1" />
            <path d="m7.5 8.5 3 7" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          No repository analyses yet
        </h3>
        <p className="text-xs text-foreground/60 mt-1 max-w-sm mx-auto leading-relaxed">
          When repositories are connected and parsed for <span className="font-medium text-foreground">{orgName}</span>, their dependency maps and architecture metrics will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            Analyses
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-foreground/60 bg-foreground/[0.04] border border-surface-border">
            {analyses.length} {analyses.length === 1 ? 'repository' : 'repositories'}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-border bg-surface/80 text-xs font-medium text-foreground/50">
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Repository</th>
                <th className="py-3 px-4 font-medium">Branch / Commit</th>
                <th className="py-3 px-4 font-medium text-right">Files</th>
                <th className="py-3 px-4 font-medium text-right">Edges</th>
                <th className="py-3 px-4 font-medium text-right">Coverage</th>
                <th className="py-3 px-4 font-medium text-right">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {analyses.map((analysis) => {
                const isCompleted = analysis.status === 'completed';
                const isParsing = analysis.status === 'parsing';
                const isFailed = analysis.status === 'failed';

                return (
                  <tr
                    key={analysis.id}
                    className="hover:bg-foreground/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : isParsing
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              : isFailed
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-foreground/5 text-foreground/60 border border-surface-border'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : isParsing
                                ? 'bg-amber-500 animate-pulse'
                                : isFailed
                                  ? 'bg-rose-500'
                                  : 'bg-foreground/40'
                          }`}
                        />
                        <span className="capitalize">{analysis.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {analysis.projects?.name || analysis.repository_url.split('/').pop() || 'Repository'}
                        </span>
                        <span className="font-mono text-[11px] text-foreground/50 truncate max-w-xs mt-0.5">
                          {analysis.repository_url}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-background border border-surface-border text-foreground/80">
                          <svg
                            className="h-3 w-3 text-foreground/40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="6" x2="6" y1="3" y2="15" />
                            <circle cx="18" cy="6" r="3" />
                            <circle cx="6" cy="18" r="3" />
                            <path d="M18 9a9 9 0 0 1-9 9" />
                          </svg>
                          {analysis.branch}
                        </span>
                        {analysis.commit_hash && (
                          <span className="font-mono text-[11px] text-foreground/40">
                            {analysis.commit_hash.slice(0, 7)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-foreground/80">
                      {analysis.file_count > 0 ? analysis.file_count.toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-foreground/80">
                      {analysis.edge_count > 0 ? analysis.edge_count.toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs tabular-nums">
                      {analysis.coverage_percentage !== null ? (
                        <span className="font-medium text-foreground">
                          {analysis.coverage_percentage}%
                        </span>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap text-xs text-foreground/50">
                      {analysis.completed_at
                        ? new Date(analysis.completed_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : analysis.started_at
                          ? new Date(analysis.started_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

