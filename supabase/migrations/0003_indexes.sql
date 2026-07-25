-- 0003_indexes.sql
-- Indexes for the hot paths: queue claiming, dedup, event lookup, contacts, automations.

-- queue: the worker claims due pending jobs ordered by scheduled_at
create index if not exists idx_queue_claim
  on public.queue (status, scheduled_at)
  where status = 'pending';
create index if not exists idx_queue_next_attempt on public.queue (next_attempt_at);
create index if not exists idx_queue_account on public.queue (instagram_account_id);
create index if not exists idx_queue_contact on public.queue (contact_id);
create index if not exists idx_queue_status on public.queue (status);

-- events
create index if not exists idx_events_received_at on public.events (received_at desc);
create index if not exists idx_events_account on public.events (instagram_account_id);
create index if not exists idx_events_contact on public.events (contact_id);
create index if not exists idx_events_status on public.events (processing_status);

-- contacts
create index if not exists idx_contacts_window on public.contacts (messaging_window_expires_at);

-- automations
create index if not exists idx_automations_account on public.automations (instagram_account_id);
create index if not exists idx_automations_active on public.automations (active) where active = true;
create index if not exists idx_automations_media on public.automations (specific_media_id);

-- followups
create index if not exists idx_followups_automation on public.followups (automation_id, position);

-- click_events
create index if not exists idx_click_events_automation on public.click_events (automation_id);
create index if not exists idx_click_events_contact on public.click_events (contact_id);

-- oauth_states cleanup
create index if not exists idx_oauth_states_expires on public.oauth_states (expires_at);
