-- PREPARED, NOT RUN. Apply only after migration 0008 is live and the owner approves the copy.
-- Sets English follow-gate copy on the English-speaking @mfcatarino.pt [FOLLOW] automations.
-- Review the preview first:
select au.id, au.name, au.active
from public.automations au
join public.instagram_accounts ia on ia.id = au.instagram_account_id
where ia.instagram_username = 'mfcatarino.pt'
  and au.name like '[FOLLOW]%';

-- Then:
-- update public.automations au
-- set follow_gate_message = 'To unlock your free PDF, follow {handle}, then tap the button below. I''ll check automatically.',
--     follow_gate_retry_message = 'I can''t see the follow yet. Follow {handle} and tap the button again to unlock the PDF.',
--     follow_gate_button = 'I''m following'
-- from public.instagram_accounts ia
-- where ia.id = au.instagram_account_id
--   and ia.instagram_username = 'mfcatarino.pt'
--   and au.name like '[FOLLOW]%';
