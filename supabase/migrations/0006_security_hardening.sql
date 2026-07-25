-- 0006_security_hardening.sql
-- Address security-advisor WARNs.
--  - Drop `unaccent`: accent normalization is done in TypeScript (src/lib/matching), not SQL.
--  - Pin search_path on our functions to prevent search_path hijacking.
-- Note: `pg_net` cannot be relocated out of `public` (it does not support SET SCHEMA);
--       Supabase installs it there by design, so that advisor WARN is accepted.

drop extension if exists unaccent;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.claim_queue_jobs(
  p_batch_size          integer default 10,
  p_worker_id           text    default 'worker',
  p_stuck_after_seconds integer default 300
)
returns setof public.queue
language plpgsql
set search_path = ''
as $$
begin
  update public.queue
     set status     = 'pending',
         claimed_at = null,
         claimed_by = null,
         last_error = left(coalesce(last_error, '') || ' [recovered stuck job]', 2000)
   where status = 'sending'
     and claimed_at is not null
     and claimed_at < now() - make_interval(secs => p_stuck_after_seconds);

  return query
  with due as (
    select id
      from public.queue
     where status = 'pending'
       and scheduled_at <= now()
       and (next_attempt_at is null or next_attempt_at <= now())
     order by scheduled_at
       for update skip locked
     limit greatest(p_batch_size, 1)
  )
  update public.queue q
     set status     = 'sending',
         claimed_at = now(),
         claimed_by = p_worker_id,
         attempts   = q.attempts + 1
    from due
   where q.id = due.id
  returning q.*;
end;
$$;

create or replace function public.cleanup_oauth_states()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  deleted integer;
begin
  delete from public.oauth_states
   where expires_at < now() - interval '1 hour';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;
