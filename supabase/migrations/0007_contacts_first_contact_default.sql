-- 0007_contacts_first_contact_default.sql
-- Set first_contact_at once at insert via a DB default, so upserts that record
-- later inbound interactions never overwrite the original first-contact time.

alter table public.contacts alter column first_contact_at set default now();
