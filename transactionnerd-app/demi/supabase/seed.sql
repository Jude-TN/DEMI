-- ================================================================
-- DEMI — Seed: Default checklist templates
-- Run AFTER migration.sql and after creating your brokerage row.
-- Replace 'YOUR-BROKERAGE-ID' with the actual UUID.
-- ================================================================

-- ── Buyer-side template ───────────────────────────────────────────
with tmpl as (
  insert into checklist_templates (brokerage_id, name, side, is_default)
  values ('YOUR-BROKERAGE-ID', 'Buyer Side — Standard', 'buyer', true)
  returning id
)
insert into checklist_template_steps
  (template_id, label, assignee_role, days_from_effective, required, sort_order)
select tmpl.id, step.label, step.role, step.days, step.req, step.ord
from tmpl, (values
  ('Collect executed contract',         'tc',    0,  true,  1),
  ('Send intro email to all parties',   'tc',    1,  true,  2),
  ('Open title order',                  'tc',    2,  true,  3),
  ('Schedule inspection',               'tc',    3,  true,  4),
  ('Follow up — inspection report',     'tc',    12, true,  5),
  ('Submit repair request (if needed)', 'agent', 14, false, 6),
  ('Confirm loan commitment letter',    'tc',    21, true,  7),
  ('Confirm appraisal',                 'tc',    21, true,  8),
  ('Order HOA estoppel (if applicable)','tc',    21, false, 9),
  ('Request wire instructions',         'tc',    -5, true,  10),
  ('Schedule final walk-through',       'tc',    -2, true,  11),
  ('Confirm closing date and time',     'tc',    -1, true,  12)
) as step(label, role, days, req, ord);

-- ── Seller-side template ──────────────────────────────────────────
with tmpl as (
  insert into checklist_templates (brokerage_id, name, side, is_default)
  values ('YOUR-BROKERAGE-ID', 'Seller Side — Standard', 'seller', true)
  returning id
)
insert into checklist_template_steps
  (template_id, label, assignee_role, days_from_effective, required, sort_order)
select tmpl.id, step.label, step.role, step.days, step.req, step.ord
from tmpl, (values
  ('Collect listing agreement',          'tc',    0,  true,  1),
  ('Send intro email to all parties',    'tc',    1,  true,  2),
  ('Upload seller disclosure',           'tc',    3,  true,  3),
  ('MLS input and photos',               'agent', 3,  true,  4),
  ('Collect executed contract',          'tc',    0,  true,  5),
  ('Open title order',                   'tc',    2,  true,  6),
  ('Negotiate inspection repair items',  'agent', 14, false, 7),
  ('Confirm appraisal',                  'tc',    21, true,  8),
  ('Provide wire instructions to title', 'tc',    -5, true,  9),
  ('Confirm final walk-through',         'tc',    -2, true,  10),
  ('Prepare closing documents',          'tc',    -1, true,  11),
  ('Confirm closing date and time',      'tc',    -1, true,  12)
) as step(label, role, days, req, ord);

-- ── Luxury add-ons template ───────────────────────────────────────
with tmpl as (
  insert into checklist_templates (brokerage_id, name, side, is_default)
  values ('YOUR-BROKERAGE-ID', 'Luxury / High-Value Add-ons', 'all', false)
  returning id
)
insert into checklist_template_steps
  (template_id, label, assignee_role, required, sort_order)
select tmpl.id, step.label, step.role, step.req, step.ord
from tmpl, (values
  ('Pool and dock inspection',      'tc',    false, 1),
  ('HOA approval process',          'tc',    false, 2),
  ('Condo association documents',   'tc',    false, 3),
  ('Elevator / mechanical inspect', 'tc',    false, 4),
  ('Wind mitigation report',        'agent', false, 5),
  ('4-point inspection',            'tc',    false, 6),
  ('Survey ordered',                'tc',    false, 7),
  ('Flood zone certificate',        'tc',    false, 8),
  ('Jumbo loan conditions review',  'tc',    false, 9)
) as step(label, role, req, ord);
