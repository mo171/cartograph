-- Row-level security is on by default, not per table. A table that forgot to
-- enable it returns every organization's rows silently; this trigger makes
-- that impossible for anything created in public. It replaces the version the
-- Supabase dashboard installs, which logs and carries on if enabling fails.
-- Here a failure aborts the CREATE TABLE.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
      and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', cmd.object_identity);
  end loop;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls on ddl_command_end
      execute function public.rls_auto_enable();
  end if;
end;
$$;

-- Organizations live in Clerk. This row exists so everything else has a real
-- foreign key to cascade from: deleting it deletes the organization's data.
create table public.organizations (
  id text primary key, -- Clerk organization id, as it appears on the token
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  repo_owner text not null,
  repo_name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, repo_owner, repo_name),
  unique (id, organization_id)
);

create type public.analysis_status as enum ('queued', 'parsing', 'complete', 'failed');

-- Children reference their parent by (id, organization_id), so a row can
-- never belong to a different organization than the thing it hangs off.
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  status public.analysis_status not null default 'queued',
  commit_sha text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  check ((status = 'failed') = (error is not null)),
  check ((status in ('complete', 'failed')) = (finished_at is not null))
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  path text not null,
  -- Null means parsed. Anything skipped says why, so coverage can count it.
  skip_reason text,
  unique (analysis_id, path),
  unique (id, organization_id),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade
);

-- Only resolved imports are edges; both ends are real files.
create table public.edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  source_file_id uuid not null,
  target_file_id uuid not null,
  kind text not null check (kind in ('import', 're-export', 'dynamic-import', 'require')),
  specifier text not null,
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (source_file_id, organization_id)
    references public.files (id, organization_id) on delete cascade,
  foreign key (target_file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid not null,
  method text not null,
  path text not null,
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  file_id uuid not null,
  model text not null,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

create table public.file_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  file_id uuid not null unique,
  role text not null,
  -- A role from convention is fact; one from the model is labelled as such.
  source text not null check (source in ('convention', 'model')),
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade
);

-- Foreign keys aren't indexed automatically; cascades and joins need these.
-- Leading with organization_id also serves the policy predicate.
create index on public.analyses (organization_id, created_at desc);
create index on public.analyses (project_id, organization_id);
create index on public.files (analysis_id, organization_id);
create index on public.files (organization_id);
create index on public.edges (analysis_id, organization_id);
create index on public.edges (source_file_id, organization_id);
create index on public.edges (target_file_id, organization_id);
create index on public.edges (organization_id);
create index on public.routes (analysis_id, organization_id);
create index on public.routes (file_id, organization_id);
create index on public.routes (organization_id);
create index on public.explanations (file_id, organization_id);
create index on public.explanations (organization_id);
create index on public.file_roles (file_id, organization_id);
create index on public.file_roles (organization_id);
create index on public.insights (analysis_id, organization_id);
create index on public.insights (organization_id);
create index on public.projects (organization_id);

-- The whole authorization layer: a row is visible when its organization is
-- the one on the Clerk session token. Clerk's v2 token carries it as o.id,
-- v1 as org_id. Read-only for now; nothing in the app writes yet, so there
-- are no write grants or write policies.
revoke all on
  public.organizations, public.projects, public.analyses, public.files, public.edges,
  public.routes, public.explanations, public.file_roles, public.insights
from anon, authenticated;

grant select on
  public.organizations, public.projects, public.analyses, public.files, public.edges,
  public.routes, public.explanations, public.file_roles, public.insights
to authenticated;

create policy "members read their organization" on public.organizations
  for select to authenticated
  using (id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.projects
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.analyses
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.files
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.edges
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.routes
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.explanations
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.file_roles
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.insights
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

-- Fail the migration, loudly, if any table in public ended up without RLS.
do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ') into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if missing is not null then
    raise exception 'Row-level security is not enabled on: %', missing;
  end if;
end;
$$;
