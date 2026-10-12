import { createServerDatabaseClient } from '@/lib/supabase/server';

export interface AnalysisItem {
  id: string;
  status: 'pending' | 'parsing' | 'completed' | 'failed' | string;
  repository_url: string;
  branch: string;
  commit_hash: string | null;
  file_count: number;
  edge_count: number;
  coverage_percentage: number | null;
  summary: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  projects?: {
    name: string;
  } | null;
}

/**
 * Reads all analyses visible to the active session.
 * 
 * STRICT ARCHITECTURAL RULE:
 * Application code NEVER filters by organization_id in queries (no .eq('organization_id', ...)).
 * The query is completely unconstrained by tenant in application code; Postgres Row-Level Security
 * reads the organization claim directly off the request's JWT token.
 */
export async function getVisibleAnalyses(): Promise<{
  analyses: AnalysisItem[];
  error: string | null;
}> {
  const supabase = await createServerDatabaseClient();

  const { data, error } = await supabase
    .from('analyses')
    .select(`
      id,
      status,
      repository_url,
      branch,
      commit_hash,
      file_count,
      edge_count,
      coverage_percentage,
      summary,
      started_at,
      completed_at,
      created_at,
      projects (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return { analyses: [], error: error.message };
  }

  return { analyses: (data as unknown as AnalysisItem[]) || [], error: null };
}

