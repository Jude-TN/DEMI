-- ================================================================
-- DEMI v2 — Seed data
-- Run AFTER migration.sql. Replace UUIDs as noted.
-- ================================================================

-- ── Step 1: Create brokerage ──────────────────────────────────────
insert into brokerages (name, team_name, primary_market, timezone, plan)
values ('TransactionNerd', 'Jude Paul Group', 'Southwest Florida', 'America/New_York', 'pro')
returning id;
-- ↑ Copy this UUID → BROKERAGE_ID

-- ── Step 2: Insert user profiles ──────────────────────────────────
-- First create each user via Supabase Auth (Dashboard → Auth → Users → Create user)
-- Then run:

-- insert into users (id, email, full_name, role, tc_company, tc_capacity_cap)
-- values
--   ('JUDE-AUTH-UUID',   'jude@transactionnerd.com',   'Jude Paul',      'admin', null, 33),
--   ('CARLOS-AUTH-UUID', 'carlos@transactionnerd.com', 'Carlos Rivera',  'tc',    'TransactionNerd.com', 33),
--   ('ANA-AUTH-UUID',    'ana@transactionnerd.com',    'Ana Martinez',   'tc',    'TransactionNerd.com', 33);

-- ── Step 3: Link users to brokerage ──────────────────────────────
-- insert into brokerage_members (brokerage_id, user_id, role)
-- values
--   ('BROKERAGE_ID', 'JUDE-AUTH-UUID',   'admin'),
--   ('BROKERAGE_ID', 'CARLOS-AUTH-UUID', 'tc'),
--   ('BROKERAGE_ID', 'ANA-AUTH-UUID',    'tc');

-- ── Step 4: TC routing rule (Jude → Carlos, fallback → Ana) ──────
-- insert into tc_routing_rules (brokerage_id, agent_id, default_tc_id, fallback_tc_id)
-- values ('BROKERAGE_ID', 'JUDE-AUTH-UUID', 'CARLOS-AUTH-UUID', 'ANA-AUTH-UUID');

-- ── Step 5: Buyer-side checklist template ─────────────────────────
-- with tmpl as (
--   insert into checklist_templates (brokerage_id, name, side, is_default)
--   values ('BROKERAGE_ID', 'Buyer Side — Standard', 'buyer', true) returning id
-- )
-- insert into checklist_template_steps (template_id, label, default_assignee_role, days_from_effective, is_required, sort_order)
-- select tmpl.id, s.label, s.role, s.days, s.req, s.ord from tmpl,
-- (values
--   ('Collect executed contract',       'tc',    0,   true,  1),
--   ('Send intro email to all parties', 'tc',    1,   true,  2),
--   ('Open title order',                'tc',    2,   true,  3),
--   ('Schedule home inspection',        'agent', 3,   true,  4),
--   ('Follow up on inspection report',  'tc',    12,  true,  5),
--   ('Submit repair request if needed', 'agent', 14,  false, 6),
--   ('Confirm loan commitment',         'tc',    21,  true,  7),
--   ('Confirm appraisal cleared',       'tc',    21,  true,  8),
--   ('Order HOA estoppel letter',       'tc',    -14, false, 9),
--   ('Confirm wire instructions',       'tc',    -5,  true,  10),
--   ('Schedule final walk-through',     'agent', -2,  true,  11),
--   ('Confirm closing attendance',      'tc',    -1,  true,  12)
-- ) as s(label, role, days, req, ord);

-- ── Step 6: Seller-side checklist template ────────────────────────
-- with tmpl as (
--   insert into checklist_templates (brokerage_id, name, side, is_default)
--   values ('BROKERAGE_ID', 'Seller Side — Standard', 'seller', true) returning id
-- )
-- insert into checklist_template_steps (template_id, label, default_assignee_role, days_from_effective, is_required, sort_order)
-- select tmpl.id, s.label, s.role, s.days, s.req, s.ord from tmpl,
-- (values
--   ('Collect listing agreement',           'tc',    0,   true,  1),
--   ('Send intro email to all parties',     'tc',    1,   true,  2),
--   ('Upload seller disclosure',            'tc',    3,   true,  3),
--   ('MLS input and photos',                'agent', 3,   true,  4),
--   ('Collect executed contract',           'tc',    0,   true,  5),
--   ('Open title order',                    'tc',    2,   true,  6),
--   ('Negotiate inspection repair items',   'agent', 14,  false, 7),
--   ('Confirm appraisal',                   'tc',    21,  true,  8),
--   ('Provide wire instructions to title',  'tc',    -5,  true,  9),
--   ('Confirm final walk-through',          'tc',    -2,  true,  10),
--   ('Prepare closing documents',           'tc',    -1,  true,  11),
--   ('Confirm closing date and time',       'tc',    -1,  true,  12)
-- ) as s(label, role, days, req, ord);
