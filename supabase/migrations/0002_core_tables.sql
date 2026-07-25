-- 0002_core_tables.sql
-- Core schema for Manyjean (single-admin, single-tenant, multiple OWNED IG accounts).
-- All timestamps are timestamptz (UTC). Dashboard renders in America/Sao_Paulo.

-- =========================================================================
-- instagram_accounts  (replaces the brief's single `config` row; see DECISIONS §13)
-- One row per connected Instagram account the owner controls.
-- =========================================================================
create table if not exists public.instagram_accounts (
  id                    uuid primary key default gen_random_uuid(),
  instagram_user_id     text not null unique,           -- the IG account id (IG_ID) used in Graph calls
  instagram_username    text,
  instagram_name        text,
  profile_picture_url   text,
  -- Access token stored ENCRYPTED (AES-256-GCM), self-describing string:
  --   v1:<base64 iv>.<base64 authTag>.<base64 ciphertext>   (see src/lib/crypto/token.ts)
  access_token_enc      text,
  token_expires_at      timestamptz,
  scopes                text[] not null default '{}',
  connection_status     text not null default 'disconnected'
                          check (connection_status in ('connected','disconnected','expired','error')),
  last_token_refresh_at timestamptz,
  last_webhook_at       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_instagram_accounts_updated
  before update on public.instagram_accounts
  for each row execute function public.set_updated_at();

-- =========================================================================
-- automations
-- =========================================================================
create table if not exists public.automations (
  id                          uuid primary key default gen_random_uuid(),
  instagram_account_id        uuid not null references public.instagram_accounts(id) on delete cascade,
  name                        text not null,
  active                      boolean not null default false,

  -- triggers
  trigger_comment             boolean not null default false,
  trigger_story_reply         boolean not null default false,
  trigger_direct_message      boolean not null default false,

  -- matching
  keywords                    text[] not null default '{}',
  match_type                  text not null default 'contains'
                                check (match_type in ('contains','exact','any')),
  remove_accents              boolean not null default false,  -- normalization option (DECISIONS §7.2)
  specific_media_id           text,                            -- null = applies to all media

  -- public reply
  public_reply_enabled        boolean not null default false,
  public_reply_variations     text[] not null default '{}',

  -- initial private reply / welcome (invites an inbound action)
  welcome_message             text,
  quick_reply_text            text,                            -- label of quick-reply that generates inbound

  -- link message
  link_message                text,
  link_button_label           text,
  link_url                    text,
  click_tracking_enabled      boolean not null default true,

  -- reminder
  reminder_enabled            boolean not null default false,
  reminder_text               text,
  reminder_delay_seconds      integer not null default 3600,
  cancel_reminder_after_click boolean not null default true,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger trg_automations_updated
  before update on public.automations
  for each row execute function public.set_updated_at();

-- =========================================================================
-- followups  (ordered extra steps beyond link + reminder; future-proof)
-- =========================================================================
create table if not exists public.followups (
  id             uuid primary key default gen_random_uuid(),
  automation_id  uuid not null references public.automations(id) on delete cascade,
  position       integer not null default 0,
  message_type   text not null default 'text'
                   check (message_type in ('text','link','reminder')),
  text           text,
  button_label   text,
  button_url     text,
  delay_seconds  integer not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_followups_updated
  before update on public.followups
  for each row execute function public.set_updated_at();

-- =========================================================================
-- contacts  (per account; IGSID is account-scoped -> unique per account, DECISIONS §7.4)
-- =========================================================================
create table if not exists public.contacts (
  id                            uuid primary key default gen_random_uuid(),
  instagram_account_id          uuid not null references public.instagram_accounts(id) on delete cascade,
  instagram_scoped_id           text not null,               -- IGSID
  username                      text,
  first_name                    text,
  first_contact_at              timestamptz,
  last_inbound_message_at       timestamptz,
  messaging_window_expires_at   timestamptz,
  last_automation_id            uuid references public.automations(id) on delete set null,
  follows_business              boolean,                     -- experimental / API-dependent (DECISIONS §18)
  profile_consent_at            timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint contacts_account_scoped_id_unique unique (instagram_account_id, instagram_scoped_id)
);

create trigger trg_contacts_updated
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- =========================================================================
-- events  (raw inbound webhook events; deduplicated)
-- =========================================================================
create table if not exists public.events (
  id                    uuid primary key default gen_random_uuid(),
  provider              text not null default 'instagram',
  event_type            text not null default 'unsupported',  -- comment|message|story_reply|quick_reply|postback|unsupported
  provider_event_id     text,
  deduplication_hash    text not null unique,
  instagram_account_id  uuid references public.instagram_accounts(id) on delete set null,
  contact_id            uuid references public.contacts(id) on delete set null,
  comment_id            text,
  media_id              text,
  payload               jsonb,                                 -- sanitized raw payload for diagnostics
  processing_status     text not null default 'received'
                          check (processing_status in ('received','processed','error','unsupported')),
  processing_error      text,
  received_at           timestamptz not null default now(),
  processed_at          timestamptz
);

-- =========================================================================
-- queue  (durable outbound jobs; atomic claim via RPC in 0005)
-- =========================================================================
create table if not exists public.queue (
  id                    uuid primary key default gen_random_uuid(),
  automation_id         uuid references public.automations(id) on delete set null,
  contact_id            uuid references public.contacts(id) on delete set null,
  event_id              uuid references public.events(id) on delete set null,
  instagram_account_id  uuid references public.instagram_accounts(id) on delete cascade,
  job_type              text not null,   -- private_reply|public_reply|welcome_message|link_message|reminder|followup
  payload               jsonb not null default '{}'::jsonb,
  deduplication_key     text not null unique,
  status                text not null default 'pending'
                          check (status in ('pending','sending','sent','failed','skipped','cancelled')),
  scheduled_at          timestamptz not null default now(),
  claimed_at            timestamptz,
  claimed_by            text,
  sent_at               timestamptz,
  attempts              integer not null default 0,
  max_attempts          integer not null default 5,
  next_attempt_at       timestamptz,
  last_error            text,
  skip_reason           text,
  provider_message_id   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_queue_updated
  before update on public.queue
  for each row execute function public.set_updated_at();

-- =========================================================================
-- tracking_links  (resolves /r/[code] -> destination; addition beyond brief, DECISIONS §7)
-- Codes are unpredictable random tokens; the row ties a click to its context.
-- =========================================================================
create table if not exists public.tracking_links (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  automation_id   uuid references public.automations(id) on delete set null,
  contact_id      uuid references public.contacts(id) on delete set null,
  queue_id        uuid references public.queue(id) on delete set null,
  destination_url text not null,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- =========================================================================
-- click_events
-- =========================================================================
create table if not exists public.click_events (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid references public.contacts(id) on delete set null,
  automation_id  uuid references public.automations(id) on delete set null,
  queue_id       uuid references public.queue(id) on delete set null,
  tracking_code  text,
  destination_url text,
  clicked_at     timestamptz not null default now(),
  user_agent     text,
  ip_hash        text,                                        -- hashed, never raw IP (DECISIONS §7.7)
  created_at     timestamptz not null default now()
);

-- =========================================================================
-- oauth_states  (single-use CSRF state for the Instagram OAuth flow)
-- =========================================================================
create table if not exists public.oauth_states (
  state       text primary key,
  context     jsonb not null default '{}'::jsonb,   -- e.g. { "reconnect_account_id": "..." }
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
