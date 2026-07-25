-- 0004_rls.sql
-- Security: enable RLS on every table with NO policies.
-- With RLS enabled and no policy, the `anon` and `authenticated` roles are denied all access.
-- ALL operational access happens server-side via the `service_role` key, which bypasses RLS.
-- The service_role key is never exposed to the browser (DECISIONS §7.9 / §14).

alter table public.instagram_accounts enable row level security;
alter table public.automations        enable row level security;
alter table public.followups          enable row level security;
alter table public.contacts           enable row level security;
alter table public.events             enable row level security;
alter table public.queue              enable row level security;
alter table public.tracking_links     enable row level security;
alter table public.click_events       enable row level security;
alter table public.oauth_states       enable row level security;

-- Belt-and-suspenders: revoke direct table/function grants from the public API roles.
-- (The dashboard reads/writes through the server using service_role, not these roles.)
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
