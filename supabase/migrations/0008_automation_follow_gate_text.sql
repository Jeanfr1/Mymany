-- 0008_automation_follow_gate_text.sql
-- Per-automation follow-gate copy, so accounts that speak English (or any other
-- language) don't send the built-in Portuguese gate. All columns are nullable:
-- NULL keeps the current Portuguese defaults, so existing automations are unchanged.
-- Messages may contain {handle}, replaced with the connected account's @username.

alter table public.automations
  add column if not exists follow_gate_message text,
  add column if not exists follow_gate_retry_message text,
  add column if not exists follow_gate_button text;

alter table public.automations
  add constraint automations_follow_gate_message_len
    check (follow_gate_message is null or char_length(follow_gate_message) <= 1000),
  add constraint automations_follow_gate_retry_message_len
    check (follow_gate_retry_message is null or char_length(follow_gate_retry_message) <= 1000),
  add constraint automations_follow_gate_button_len
    check (follow_gate_button is null or char_length(follow_gate_button) <= 20);
