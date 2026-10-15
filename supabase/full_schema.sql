-- ==============================================================================
-- Cartograph / Own It: Complete Unified Schema Migration
-- Run this script in your Supabase Dashboard SQL Editor to align your remote DB
-- with the current codebase.
-- ==============================================================================

-- 1. Drop existing conflicting tables from earlier schemas
drop trigger if exists publish_progress on public.analyses;
drop function if exists public.publish_analysis_progress();
drop function if exists public.insert_edges(uuid, jsonb);
drop function if exists public.insert_routes(uuid, jsonb);
drop function if exists public.insert_file_roles(uuid, jsonb);

drop table if exists public.insights cascade;
drop table if exists public.file_roles cascade;
drop table if exists public.explanations cascade;
drop table if exists public.ai_cache cascade;
drop table if exists public.routes cascade;
drop table if exists public.edges cascade;
drop table if exists public.files cascade;
drop table if exists public.analyses cascade;
drop table if exists public.projects cascade;
drop table if exists public.organizations cascade;
drop type if exists public.analysis_status cascade;
drop type if exists public.analysis_stage cascade;

-- 2. Event Trigger: Ensure RLS is enabled on all newly created public tables
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

-- 3. Core Tables
create table public.organizations (
  id text primary key, -- Clerk organization id from token
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
create index on public.projects (organization_id);

create type public.analysis_status as enum ('queued', 'running', 'complete', 'failed');
create type public.analysis_stage as enum ('fetch', 'select', 'parse', 'store');

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  project_id uuid not null unique,
  status public.analysis_status not null default 'queued',
  commit_sha text,
  error text,
  stage public.analysis_stage,
  stage_message text,
  started_at timestamptz,
  finished_at timestamptz,
  coverage jsonb,
  detected_projects jsonb,
  schema_version integer,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  check ((status = 'failed') = (error is not null)),
  check ((status in ('complete', 'failed')) = (finished_at is not null)),
  check ((status = 'queued') = (stage is null)),
  check ((status = 'queued') = (started_at is null)),
  check ((status = 'complete') = (coverage is not null and detected_projects is not null and commit_sha is not null)),
  check ((status = 'complete') = (schema_version is not null))
);
create index on public.analyses (organization_id, created_at desc);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  path text not null,
  skip_reason text,
  skip_detail text,
  module text,
  lines integer,
  bytes integer,
  hash text,
  fan_in integer,
  fan_out integer,
  reached_by text,
  exports text[],
  unique (analysis_id, path),
  unique (id, organization_id),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  check (
    case when skip_reason is null
      then skip_detail is null and module is not null and lines is not null and bytes is not null
        and hash is not null and fan_in is not null and fan_out is not null
      else skip_detail is not null and module is null and lines is null and bytes is null
        and hash is null and fan_in is null and fan_out is null and reached_by is null
    end
  ),
  check (skip_reason is null or exports is null)
);
create index on public.files (analysis_id, organization_id);
create index on public.files (organization_id);

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  source_file_id uuid not null,
  target_file_id uuid not null,
  kind text not null check (kind in ('import', 're-export', 'dynamic-import', 'require')),
  specifier text not null,
  type_only boolean not null,
  line integer not null,
  unique (analysis_id, source_file_id, target_file_id, kind),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (source_file_id, organization_id)
    references public.files (id, organization_id) on delete cascade,
  foreign key (target_file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);
create index on public.edges (analysis_id, organization_id);
create index on public.edges (source_file_id, organization_id);
create index on public.edges (target_file_id, organization_id);
create index on public.edges (organization_id);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid not null,
  method text not null,
  path text not null,
  line integer not null,
  unique (analysis_id, file_id, method, path),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);
create index on public.routes (analysis_id, organization_id);
create index on public.routes (file_id, organization_id);
create index on public.routes (organization_id);

create table public.file_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  file_id uuid not null unique,
  role text not null,
  source text not null check (source in ('convention', 'model')),
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade,
  check (
    source = 'convention'
    or role in ('service', 'repository', 'model', 'util', 'config', 'component', 'hook')
  )
);
create index on public.file_roles (file_id, organization_id);
create index on public.file_roles (organization_id);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade
);
create index on public.insights (analysis_id, organization_id);
create index on public.insights (organization_id);

create table public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  key text not null,
  task text not null check (task in ('explain-file', 'explain-folder', 'classify-file')),
  model text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);
create index on public.ai_cache (organization_id);

-- 4. Stored Procedures
create or replace function public.insert_edges(p_analysis_id uuid, p_edges jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  expected integer := jsonb_array_length(p_edges);
  inserted integer;
begin
  insert into public.edges
    (organization_id, analysis_id, source_file_id, target_file_id, kind, specifier, type_only, line)
  select s.organization_id, p_analysis_id, s.id, t.id, e.kind, e.specifier, e.type_only, e.line
  from jsonb_to_recordset(p_edges)
    as e (source text, target text, kind text, specifier text, type_only boolean, line integer)
  join public.files s on s.analysis_id = p_analysis_id and s.path = e.source and s.skip_reason is null
  join public.files t on t.analysis_id = p_analysis_id and t.path = e.target and t.skip_reason is null;
  get diagnostics inserted = row_count;
  if inserted <> expected then
    raise exception 'insert_edges: % of % edges matched stored files for analysis %', inserted, expected, p_analysis_id;
  end if;
  return inserted;
end;
$$;

create or replace function public.insert_routes(p_analysis_id uuid, p_routes jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  expected integer := jsonb_array_length(p_routes);
  inserted integer;
begin
  insert into public.routes (organization_id, analysis_id, file_id, method, path, line)
  select f.organization_id, p_analysis_id, f.id, r.method, r.pattern, r.line
  from jsonb_to_recordset(p_routes) as r (file text, method text, pattern text, line integer)
  join public.files f on f.analysis_id = p_analysis_id and f.path = r.file and f.skip_reason is null;
  get diagnostics inserted = row_count;
  if inserted <> expected then
    raise exception 'insert_routes: % of % routes matched stored files for analysis %', inserted, expected, p_analysis_id;
  end if;
  return inserted;
end;
$$;

create or replace function public.insert_file_roles(p_analysis_id uuid, p_roles jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  expected integer := jsonb_array_length(p_roles);
  inserted integer;
begin
  insert into public.file_roles (organization_id, file_id, role, source)
  select f.organization_id, f.id, r.role, 'convention'
  from jsonb_to_recordset(p_roles) as r (path text, role text)
  join public.files f on f.analysis_id = p_analysis_id and f.path = r.path and f.skip_reason is null;
  get diagnostics inserted = row_count;
  if inserted <> expected then
    raise exception 'insert_file_roles: % of % roles matched stored files for analysis %', inserted, expected, p_analysis_id;
  end if;
  return inserted;
end;
$$;

create or replace function public.publish_analysis_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'status', new.status,
      'stage', new.stage,
      'message', case when new.status = 'failed' then new.error else new.stage_message end
    ),
    'progress',
    'analysis:' || new.id::text,
    true
  );
  return null;
end;
$$;

create trigger publish_progress
  after update of status, stage, stage_message, error on public.analyses
  for each row
  when (
    old.status is distinct from new.status
    or old.stage is distinct from new.stage
    or old.stage_message is distinct from new.stage_message
  )
  execute function public.publish_analysis_progress();

-- 5. Permissions & Grants
revoke all on function public.insert_edges(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.insert_edges(uuid, jsonb) to service_role;

revoke all on function public.insert_routes(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.insert_routes(uuid, jsonb) to service_role;

revoke all on function public.insert_file_roles(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.insert_file_roles(uuid, jsonb) to service_role;

revoke execute on function public.publish_analysis_progress() from public, anon, authenticated;

revoke all on
  public.organizations, public.projects, public.analyses, public.files, public.edges,
  public.routes, public.file_roles, public.insights, public.ai_cache
from anon, authenticated;

grant select on
  public.organizations, public.projects, public.analyses, public.files, public.edges,
  public.routes, public.file_roles, public.insights, public.ai_cache
to authenticated;

-- 6. Row-Level Security Policies
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

create policy "members read their organization's rows" on public.file_roles
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.insights
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.ai_cache
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

-- Realtime private broadcast permissions
create policy "members receive their organization's analysis progress" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from public.analyses a
      where 'analysis:' || a.id::text = (select realtime.topic())
    )
  );

