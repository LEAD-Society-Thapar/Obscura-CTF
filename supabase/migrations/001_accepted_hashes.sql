-- 001: alternative accepted answers per checkpoint.
-- A submission is correct if its hash equals checkpoints.flag_hash OR any value in accepted_hashes.
-- Safe to re-run. Apply in the Supabase SQL editor BEFORE running `npm run db:seed:flags`.
alter table checkpoints
  add column if not exists accepted_hashes text[] not null default '{}';
