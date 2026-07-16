-- Optional sample data. Run AFTER you've created at least one TC user and one
-- agent user through the app's login flow (or Supabase Auth > Users > Invite).
--
-- 1. Find your user IDs: select id, email from auth.users;
-- 2. Set one profile to role = 'tc':
--    update profiles set role = 'tc' where email = 'you@transactionnerd.com';
-- 3. Replace the placeholder UUIDs below with real ones, then run this file.

-- Example transaction
insert into transactions (address, service_type, status, email_slug, closing_date)
values ('88 Bimini Ave, Cape Coral', 'contract_to_close', 'under_contract', '88bimini-ave', '2026-07-15')
returning id;

-- Copy the returned id and use it below in place of TRANSACTION_ID

-- insert into transaction_agents (transaction_id, agent_id)
-- values ('TRANSACTION_ID', 'AGENT_USER_ID');

-- Example: a saved team template, then a checklist on the transaction built from it.
-- insert into checklist_templates (title, created_by) values ('Contract to Close · standard', 'YOUR_TC_USER_ID') returning id;
-- insert into checklist_template_items (template_id, title, position) values
--   ('TEMPLATE_ID', 'Order title commitment', 0),
--   ('TEMPLATE_ID', 'Send inspection report to lender', 1),
--   ('TEMPLATE_ID', 'Confirm appraisal scheduled', 2),
--   ('TEMPLATE_ID', 'Order HOA estoppel', 3),
--   ('TEMPLATE_ID', 'Schedule final walkthrough', 4);

-- insert into checklists (transaction_id, template_id, title, is_custom, position)
--   values ('TRANSACTION_ID', 'TEMPLATE_ID', 'Contract to Close · standard', false, 0) returning id;
-- insert into checklist_items (checklist_id, title, position) values
--   ('CHECKLIST_ID', 'Order title commitment', 0),
--   ('CHECKLIST_ID', 'Send inspection report to lender', 1);

-- Example: a one-off custom checklist, not saved as a template.
-- insert into checklists (transaction_id, title, is_custom, position)
--   values ('TRANSACTION_ID', 'HOA Requirements', true, 1) returning id;
-- insert into checklist_items (checklist_id, title, position) values
--   ('CHECKLIST_ID', 'Request estoppel letter', 0),
--   ('CHECKLIST_ID', 'Submit buyer application to HOA', 1),
--   ('CHECKLIST_ID', 'Confirm approval before closing', 2);
