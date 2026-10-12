-- Seed data for two organizations to test RLS isolation and dashboard rendering

-- Insert Organizations
INSERT INTO public.organizations (id, name, slug)
VALUES
  ('org_3KbmXZRT6jIFoxJCNUPB8vhHaVk', 'Movin''s Team', 'movin-s-team-1791834681254407924'),
  ('org_3KbnoY1OyfjOFMvpomNieaJxk2L', 'Catograph', 'catograph-1791835310049729349')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- Projects for Org 1 (Movin's Team)
INSERT INTO public.projects (id, organization_id, name, repository_url, default_branch)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'org_3KbmXZRT6jIFoxJCNUPB8vhHaVk', 'cartograph', 'https://github.com/mo171/cartograph', 'main')
ON CONFLICT (id) DO NOTHING;

-- Projects for Org 2 (Catograph)
INSERT INTO public.projects (id, organization_id, name, repository_url, default_branch)
VALUES
  ('b2222222-2222-2222-2222-222222222222', 'org_3KbnoY1OyfjOFMvpomNieaJxk2L', 'turborepo', 'https://github.com/vercel/turborepo', 'main')
ON CONFLICT (id) DO NOTHING;

-- Analyses for Org 1
INSERT INTO public.analyses (
  id, organization_id, project_id, status, repository_url, commit_hash, branch, file_count, edge_count, coverage_percentage, summary, started_at, completed_at
)
VALUES
  (
    'a1111111-aaaa-1111-aaaa-111111111111',
    'org_3KbmXZRT6jIFoxJCNUPB8vhHaVk',
    'a1111111-1111-1111-1111-111111111111',
    'completed',
    'https://github.com/mo171/cartograph',
    'd1b439ae0af1',
    'main',
    49,
    114,
    95.50,
    'Full repository parsing completed with Next.js route adapter and Clerk provider edges.',
    now() - interval '2 hours',
    now() - interval '2 hours' + interval '42 seconds'
  ),
  (
    'a2222222-aaaa-2222-aaaa-222222222222',
    'org_3KbmXZRT6jIFoxJCNUPB8vhHaVk',
    'a1111111-1111-1111-1111-111111111111',
    'completed',
    'https://github.com/mo171/cartograph',
    '3e7bbed01a9f',
    'main',
    12,
    28,
    88.00,
    'Initial Create Next App baseline scan.',
    now() - interval '1 day',
    now() - interval '1 day' + interval '12 seconds'
  )
ON CONFLICT (id) DO NOTHING;

-- Analyses for Org 2
INSERT INTO public.analyses (
  id, organization_id, project_id, status, repository_url, commit_hash, branch, file_count, edge_count, coverage_percentage, summary, started_at, completed_at
)
VALUES
  (
    'b1111111-bbbb-1111-bbbb-111111111111',
    'org_3KbnoY1OyfjOFMvpomNieaJxk2L',
    'b2222222-2222-2222-2222-222222222222',
    'completed',
    'https://github.com/vercel/turborepo',
    '9c4e1f72a81b',
    'main',
    184,
    526,
    97.80,
    'Monorepo root and package workspaces dependency graph.',
    now() - interval '5 hours',
    now() - interval '5 hours' + interval '2 minutes'
  ),
  (
    'b2222222-bbbb-2222-bbbb-222222222222',
    'org_3KbnoY1OyfjOFMvpomNieaJxk2L',
    'b2222222-2222-2222-2222-222222222222',
    'parsing',
    'https://github.com/vercel/turborepo',
    'e52f019c4b72',
    'main',
    0,
    0,
    NULL,
    'Live AST parse job in progress.',
    now() - interval '3 minutes',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

