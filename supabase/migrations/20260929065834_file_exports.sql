-- The names each parsed file exports, ESM and CommonJS alike. A skipped file's
-- syntax is unknown, so it has none, not an empty list. Parsed rows stored by
-- an older parser stay null: their analysis is marked outdated by its schema
-- version and asks to be re-run, and the parser contract refuses a null list
-- on anything newer.
alter table public.files
  add column exports text[],
  add constraint files_skipped_have_no_exports_check check (skip_reason is null or exports is null);
