-- Phase 2 Initial Schema Migration
-- Creates the core 8 tables plus organizations, all with ON DELETE CASCADE foreign keys.
-- Implements Row-Level Security on all tables, reading the organization claim off auth.jwt().

-- 0. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper to extract active organization claim from Clerk token
CREATE OR REPLACE FUNCTION public.requesting_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'org_id'),
    (auth.jwt() -> 'user_metadata' ->> 'org_id')
  );
$$;

-- 1. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Analyses
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  repository_url TEXT NOT NULL,
  commit_hash TEXT,
  branch TEXT NOT NULL DEFAULT 'main',
  file_count INTEGER NOT NULL DEFAULT 0,
  edge_count INTEGER NOT NULL DEFAULT 0,
  coverage_percentage NUMERIC(5, 2),
  summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Files
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  size_bytes INTEGER,
  fan_in INTEGER NOT NULL DEFAULT 0,
  fan_out INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Edges
CREATE TABLE IF NOT EXISTS public.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  source_file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  target_file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL DEFAULT 'import',
  specifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Routes
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  http_method TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Explanations
CREATE TABLE IF NOT EXISTS public.explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model TEXT NOT NULL,
  is_cached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. File Roles
CREATE TABLE IF NOT EXISTS public.file_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  inferred_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Insights
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes on foreign keys for query and cascade performance
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyses_org ON public.analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyses_proj ON public.analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_files_org ON public.files(organization_id);
CREATE INDEX IF NOT EXISTS idx_files_analysis ON public.files(analysis_id);
CREATE INDEX IF NOT EXISTS idx_edges_org ON public.edges(organization_id);
CREATE INDEX IF NOT EXISTS idx_edges_analysis ON public.edges(analysis_id);
CREATE INDEX IF NOT EXISTS idx_routes_org ON public.routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_analysis ON public.routes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_explanations_org ON public.explanations(organization_id);
CREATE INDEX IF NOT EXISTS idx_explanations_analysis ON public.explanations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_file_roles_org ON public.file_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_roles_analysis ON public.file_roles(analysis_id);
CREATE INDEX IF NOT EXISTS idx_insights_org ON public.insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_insights_analysis ON public.insights(analysis_id);

-- Enable Row Level Security on ALL 8 tables + organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- Security Policies: Organization claim predicate enforces data isolation
CREATE POLICY "org_select_policy" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.requesting_org_id());

CREATE POLICY "projects_org_policy" ON public.projects
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

CREATE POLICY "analyses_org_policy" ON public.analyses
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

CREATE POLICY "files_org_policy" ON public.files
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

CREATE POLICY "edges_org_policy" ON public.edges
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

CREATE POLICY "routes_org_policy" ON public.routes
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

CREATE POLICY "explanations_org_policy" ON public.explanations
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

CREATE POLICY "file_roles_org_policy" ON public.file_roles
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

CREATE POLICY "insights_org_policy" ON public.insights
  FOR ALL TO authenticated
  USING (organization_id = public.requesting_org_id())
  WITH CHECK (organization_id = public.requesting_org_id());

-- Grant access to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

