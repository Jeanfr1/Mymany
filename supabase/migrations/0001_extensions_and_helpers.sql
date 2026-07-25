-- 0001_extensions_and_helpers.sql
-- Enable required extensions (verified available on Supabase Free) and shared helpers.
-- pgcrypto / uuid-ossp are preinstalled by Supabase in the `extensions` schema.

create extension if not exists unaccent;   -- accent-insensitive keyword matching (optional per automation)
create extension if not exists pg_net;     -- async HTTP: Supabase Cron -> app internal endpoints
create extension if not exists pg_cron;    -- durable job scheduler (drain queue, refresh tokens)

-- Touch updated_at on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
