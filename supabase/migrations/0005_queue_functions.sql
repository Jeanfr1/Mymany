-- 0005_queue_functions.sql
-- Atomic queue claiming (FOR UPDATE SKIP LOCKED) + stuck-job recovery, in one RPC.
-- Called only by the server worker via service_role.

create or replace function public.claim_queue_jobs(
  p_batch_size          integer default 10,
  p_worker_id           text    default 'worker',
  p_stuck_after_seconds integer default 300
)
returns setof public.queue
language plpgsql
as $$
begin
  -- 1) Recover abandoned jobs stuck in 'sending' past the safety timeout, back to 'pending'.
  update public.queue
     set status     = 'pending',
         claimed_at = null,
         claimed_by = null,
         last_error = left(coalesce(last_error, '') || ' [recovered stuck job]', 2000)
   where status = 'sending'
     and claimed_at is not null
     and claimed_at < now() - make_interval(secs => p_stuck_after_seconds);

  -- 2) Atomically claim a batch of due jobs. SKIP LOCKED lets concurrent workers coexist safely.
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

-- Purge expired, unused OAuth states (called opportunistically / by cron).
create or replace function public.cleanup_oauth_states()
returns integer
language plpgsql
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
