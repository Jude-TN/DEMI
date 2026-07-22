-- ================================================================
-- DEMI v2 — Complete migration
-- Matches demi_complete_handoff.html exactly
-- Run in Supabase SQL Editor
-- ================================================================

-- ── Extensions ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron"; -- for scheduled jobs

-- ── Enums ────────────────────────────────────────────────────────
do $$ begin
  create type user_role      as enum ('admin','agent','tc');
  create type deal_stage     as enum ('lead','listing','under_contract','clear_to_close','closed');
  create type deal_side      as enum ('buyer','seller','dual');
  create type doc_status     as enum ('missing','received','executed','cleared');
  create type contact_role   as enum ('buyer','seller','buyer_agent','seller_agent','title','lender','inspector','other');
  create type brokerage_plan as enum ('starter','pro','team');
  create type int_provider   as enum ('fub','dotloop','docusign','skyslope','zapier');
  create type int_status     as enum ('connected','error','disconnected');
exception when duplicate_object then null;
end $$;

-- ── Brokerages ────────────────────────────────────────────────────
create table if not exists brokerages (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  team_name       text,
  license_number  text,
  primary_market  text,
  timezone        text not null default 'America/New_York',
  plan            brokerage_plan not null default 'starter',
  created_at      timestamptz default now()
);

-- ── Users ─────────────────────────────────────────────────────────
-- Note: users.role is their global role.
-- brokerage_members.role is role within a specific brokerage.
-- A TC can be a member of multiple brokerages.
create table if not exists users (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null unique,
  full_name        text not null,
  role             user_role not null default 'agent',
  avatar_url       text,
  license_number   text,
  tc_company       text,              -- e.g. "TransactionNerd.com"
  tc_capacity_cap  integer not null default 33,
  markets          text[],
  created_at       timestamptz default now()
);

-- ── Brokerage members (junction) ──────────────────────────────────
-- TCs appear here for every brokerage they work with.
create table if not exists brokerage_members (
  id            uuid primary key default uuid_generate_v4(),
  brokerage_id  uuid not null references brokerages(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  role          user_role not null,
  is_active     boolean not null default true,
  joined_at     timestamptz default now(),
  unique (brokerage_id, user_id)
);

create index if not exists bm_brokerage_idx on brokerage_members(brokerage_id);
create index if not exists bm_user_idx      on brokerage_members(user_id);

-- ── TC routing rules ──────────────────────────────────────────────
create table if not exists tc_routing_rules (
  id            uuid primary key default uuid_generate_v4(),
  brokerage_id  uuid not null references brokerages(id) on delete cascade,
  agent_id      uuid not null references users(id) on delete cascade,
  default_tc_id uuid not null references users(id) on delete cascade,
  fallback_tc_id uuid references users(id) on delete set null,
  updated_at    timestamptz default now(),
  unique (brokerage_id, agent_id)
);

-- ── Checklist templates ───────────────────────────────────────────
create table if not exists checklist_templates (
  id            uuid primary key default uuid_generate_v4(),
  brokerage_id  uuid not null references brokerages(id) on delete cascade,
  name          text not null,
  side          text,  -- 'buyer' | 'seller' | 'dual' | null (any)
  is_default    boolean not null default false,
  created_at    timestamptz default now()
);

create table if not exists checklist_template_steps (
  id                      uuid primary key default uuid_generate_v4(),
  template_id             uuid not null references checklist_templates(id) on delete cascade,
  label                   text not null,
  default_assignee_role   text,   -- 'tc' | 'agent' | null
  days_from_effective     integer,
  is_required             boolean not null default true,
  notify_on_complete      boolean not null default false,
  sort_order              integer not null default 0,
  created_at              timestamptz default now()
);

create index if not exists tmpl_steps_idx on checklist_template_steps(template_id);

-- ── Deals ─────────────────────────────────────────────────────────
create table if not exists deals (
  id                    uuid primary key default uuid_generate_v4(),
  brokerage_id          uuid not null references brokerages(id) on delete cascade,
  agent_id              uuid not null references users(id) on delete restrict,
  tc_id                 uuid references users(id) on delete set null,
  address               text not null,
  city                  text not null default '',
  mls_number            text,
  sale_price            numeric(12,2),
  side                  deal_side not null default 'buyer',
  stage                 deal_stage not null default 'under_contract',
  effective_date        date,
  close_date            date,
  closed_at             timestamptz,
  close_price           numeric(12,2),
  checklist_template_id uuid references checklist_templates(id) on delete set null,
  notes                 text,
  created_at            timestamptz default now(),
  archived_at           timestamptz
);

create index if not exists deals_brokerage_idx  on deals(brokerage_id);
create index if not exists deals_agent_idx      on deals(agent_id);
create index if not exists deals_tc_idx         on deals(tc_id);
create index if not exists deals_stage_idx      on deals(stage);
create index if not exists deals_close_date_idx on deals(close_date);
create index if not exists deals_closed_at_idx  on deals(closed_at);
create index if not exists deals_active_idx     on deals(tc_id) where closed_at is null and archived_at is null;

-- ── Tasks ─────────────────────────────────────────────────────────
create table if not exists tasks (
  id                 uuid primary key default uuid_generate_v4(),
  deal_id            uuid not null references deals(id) on delete cascade,
  template_step_id   uuid references checklist_template_steps(id) on delete set null,
  label              text not null,
  assignee_id        uuid references users(id) on delete set null,
  due_date           date,
  completed_at       timestamptz,
  is_required        boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz default now()
);

create index if not exists tasks_deal_idx     on tasks(deal_id);
create index if not exists tasks_assignee_idx on tasks(assignee_id);
create index if not exists tasks_due_date_idx on tasks(due_date) where completed_at is null;

-- ── Documents ─────────────────────────────────────────────────────
create table if not exists documents (
  id               uuid primary key default uuid_generate_v4(),
  deal_id          uuid not null references deals(id) on delete cascade,
  uploaded_by      uuid references users(id) on delete set null,
  name             text not null,
  file_url         text,
  file_size_bytes  bigint,
  doc_type         text not null default 'other',
  status           doc_status not null default 'missing',
  external_ref_url text,   -- DocuSign envelope_id / Dotloop loop URL
  uploaded_at      timestamptz,
  created_at       timestamptz default now()
);

create index if not exists docs_deal_idx   on documents(deal_id);
create index if not exists docs_status_idx on documents(status);

-- ── Contacts ──────────────────────────────────────────────────────
create table if not exists contacts (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references deals(id) on delete cascade,
  role            contact_role not null,
  full_name       text not null,
  email           text,
  phone           text,
  company         text,
  fub_contact_id  text,
  created_at      timestamptz default now()
);

create index if not exists contacts_deal_idx on contacts(deal_id);

-- ── Messages ──────────────────────────────────────────────────────
create table if not exists messages (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references deals(id) on delete cascade,
  sender_id       uuid not null references users(id) on delete cascade,
  body            text not null,
  attachment_url  text,
  created_at      timestamptz default now()
);

create index if not exists messages_deal_idx on messages(deal_id);

-- ── Timeline events ───────────────────────────────────────────────
create table if not exists timeline_events (
  id           uuid primary key default uuid_generate_v4(),
  deal_id      uuid not null references deals(id) on delete cascade,
  actor_id     uuid references users(id) on delete set null,
  event_type   text not null,
  description  text not null,
  metadata     jsonb,
  created_at   timestamptz default now()
);

create index if not exists timeline_deal_idx on timeline_events(deal_id);

-- ── Notifications ─────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  deal_id     uuid references deals(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text not null,
  deep_link   text,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists notifs_user_idx  on notifications(user_id, read_at) where read_at is null;
create index if not exists notifs_deal_idx  on notifications(deal_id);

-- ── Integration connections ───────────────────────────────────────
create table if not exists integration_connections (
  id               uuid primary key default uuid_generate_v4(),
  brokerage_id     uuid not null references brokerages(id) on delete cascade,
  provider         int_provider not null,
  access_token     text not null,
  refresh_token    text,
  token_expires_at timestamptz,
  status           int_status not null default 'connected',
  last_synced_at   timestamptz,
  created_at       timestamptz default now(),
  unique (brokerage_id, provider)
);

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Get the calling user's primary brokerage_id
create or replace function my_brokerage_id()
returns uuid language sql stable as $$
  select brokerage_id from brokerage_members
  where user_id = auth.uid() and is_active = true
  limit 1
$$;

-- Get the calling user's role in their primary brokerage
create or replace function my_role()
returns user_role language sql stable as $$
  select role from users where id = auth.uid()
$$;

-- Check if current user is a member of a given brokerage
create or replace function is_member_of(bid uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from brokerage_members
    where user_id = auth.uid() and brokerage_id = bid and is_active = true
  )
$$;

-- Get TC's global active file count (no brokerage filter — cross-team)
create or replace function tc_active_files(tc uuid)
returns bigint language sql stable as $$
  select count(*) from deals
  where tc_id = tc and closed_at is null and archived_at is null
$$;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table brokerages           enable row level security;
alter table users                enable row level security;
alter table brokerage_members    enable row level security;
alter table tc_routing_rules     enable row level security;
alter table checklist_templates  enable row level security;
alter table checklist_template_steps enable row level security;
alter table deals                enable row level security;
alter table tasks                enable row level security;
alter table documents            enable row level security;
alter table contacts             enable row level security;
alter table messages             enable row level security;
alter table timeline_events      enable row level security;
alter table notifications        enable row level security;
alter table integration_connections enable row level security;

-- Brokerages
create policy "brokerage: members read"  on brokerages for select using (is_member_of(id));
create policy "brokerage: admin update"  on brokerages for update using (is_member_of(id) and my_role() = 'admin');

-- Users
create policy "users: read own brokerage members" on users for select
  using (
    id = auth.uid()
    or exists(
      select 1 from brokerage_members bm1
      join brokerage_members bm2 on bm1.brokerage_id = bm2.brokerage_id
      where bm1.user_id = auth.uid() and bm2.user_id = users.id and bm1.is_active = true
    )
  );
create policy "users: update own" on users for update using (id = auth.uid());

-- Brokerage members
create policy "bm: read own brokerage" on brokerage_members for select
  using (brokerage_id = my_brokerage_id() or user_id = auth.uid());
create policy "bm: admin manage"       on brokerage_members for all
  using (brokerage_id = my_brokerage_id() and my_role() = 'admin');

-- TC routing rules
create policy "routing: admin rw"  on tc_routing_rules for all
  using (brokerage_id = my_brokerage_id() and my_role() = 'admin');
create policy "routing: agent read own" on tc_routing_rules for select
  using (agent_id = auth.uid());

-- Checklist templates
create policy "templates: brokerage rw" on checklist_templates for all
  using (brokerage_id = my_brokerage_id());
create policy "template_steps: via template" on checklist_template_steps for all
  using (template_id in (select id from checklist_templates where brokerage_id = my_brokerage_id()));

-- Deals — core RLS from spec:
-- admin: all in brokerage | agent: own deals | TC: assigned deals
create policy "deals: admin all"   on deals for all using (brokerage_id = my_brokerage_id() and my_role() = 'admin');
create policy "deals: agent own"   on deals for all using (agent_id = auth.uid());
create policy "deals: tc assigned" on deals for select using (tc_id = auth.uid());
create policy "deals: tc update assigned" on deals for update using (tc_id = auth.uid());

-- Tasks, documents, contacts, messages, timeline: via deal access
create policy "tasks: via deal"     on tasks for all using (deal_id in (select id from deals));
create policy "docs: via deal"      on documents for all using (deal_id in (select id from deals));
create policy "contacts: via deal"  on contacts for all using (deal_id in (select id from deals));
create policy "messages: via deal"  on messages for all using (deal_id in (select id from deals));
create policy "timeline: via deal read" on timeline_events for select using (deal_id in (select id from deals));

-- Notifications: own only
create policy "notifs: own" on notifications for all using (user_id = auth.uid());

-- Integration connections: admin only
create policy "integrations: admin" on integration_connections for all
  using (brokerage_id = my_brokerage_id() and my_role() = 'admin');

-- ================================================================
-- STORAGE BUCKET
-- ================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-documents', 'deal-documents', false, 52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) on conflict (id) do nothing;

create policy "storage: auth upload"  on storage.objects for insert  with check (bucket_id = 'deal-documents' and auth.role() = 'authenticated');
create policy "storage: auth read"    on storage.objects for select  using  (bucket_id = 'deal-documents' and auth.role() = 'authenticated');
create policy "storage: auth delete"  on storage.objects for delete  using  (bucket_id = 'deal-documents' and auth.role() = 'authenticated');

-- ================================================================
-- COMMENTS (setup instructions)
-- ================================================================
comment on table brokerages is 'One row per real estate team. A TC can be a member of multiple brokerages.';
comment on column users.tc_capacity_cap is 'TC sets this themselves. Default 33. Used for routing suggest logic.';
comment on table brokerage_members is 'Junction table. TCs appear here once per brokerage they work with.';
comment on table tc_routing_rules is 'Admin-set per-agent TC defaults + fallback when default is at cap.';

-- ============================================================
-- Schema reconciliation: sync repo migration with production
-- Added 2026-07-22. Additive & idempotent (safe to re-run).
-- ============================================================

-- deals: address detail, audit ts, key-date offsets, parties, txn email
alter table public.deals add column if not exists unit text;
alter table public.deals add column if not exists state text not null default 'FL';
alter table public.deals add column if not exists zip text not null default '';
alter table public.deals add column if not exists updated_at timestamptz default now();
alter table public.deals add column if not exists emd_due_date date;
alter table public.deals add column if not exists mortgage_application_due date;
alter table public.deals add column if not exists inspection_period_end date;
alter table public.deals add column if not exists financing_approval_due date;
alter table public.deals add column if not exists survey_due_date date;
alter table public.deals add column if not exists flood_insurance_contingency date;
alter table public.deals add column if not exists walk_through_date date;
alter table public.deals add column if not exists buyer_name text;
alter table public.deals add column if not exists seller_name text;
alter table public.deals add column if not exists listing_agent text;
alter table public.deals add column if not exists buyers_agent text;
alter table public.deals add column if not exists title_company text;
alter table public.deals add column if not exists escrow_agent text;
alter table public.deals add column if not exists lender text;
alter table public.deals add column if not exists transaction_email text;

-- documents: brokerage scoping, notes, created_at
alter table public.documents add column if not exists brokerage_id uuid references public.brokerages(id);
alter table public.documents add column if not exists notes text;
alter table public.documents add column if not exists created_at timestamptz default now();

-- invitations: pending team-member invites
create table if not exists public.invitations (
  id uuid primary key default uuid_generate_v4(),
  brokerage_id uuid not null default my_brokerage_id() references public.brokerages(id) on delete cascade,
  email text not null,
  role user_role not null,
  status text not null default 'pending',
  invited_by uuid references public.users(id),
  created_at timestamptz default now()
);
alter table public.invitations enable row level security;

drop policy if exists "invitations brokerage select" on public.invitations;
create policy "invitations brokerage select" on public.invitations
  for select using (brokerage_id = my_brokerage_id());
drop policy if exists "invitations brokerage insert" on public.invitations;
create policy "invitations brokerage insert" on public.invitations
  for insert with check (brokerage_id = my_brokerage_id());
drop policy if exists "invitations brokerage delete" on public.invitations;
create policy "invitations brokerage delete" on public.invitations
  for delete using (brokerage_id = my_brokerage_id());
-- ================================================================
-- DEMI v2 — Complete migration
-- Matches demi_complete_handoff.html exactly
-- Run in Supabase SQL Editor
-- ================================================================

-- ── Extensions ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron"; -- for scheduled jobs

-- ── Enums ────────────────────────────────────────────────────────
do $$ begin
  create type user_role      as enum ('admin','agent','tc');
  create type deal_stage     as enum ('lead','listing','under_contract','clear_to_close','closed');
  create type deal_side      as enum ('buyer','seller','dual');
  create type doc_status     as enum ('missing','received','executed','cleared');
  create type contact_role   as enum ('buyer','seller','buyer_agent','seller_agent','title','lender','inspector','other');
  create type brokerage_plan as enum ('starter','pro','team');
  create type int_provider   as enum ('fub','dotloop','docusign','skyslope','zapier');
  create type int_status     as enum ('connected','error','disconnected');
exception when duplicate_object then null;
end $$;

-- ── Brokerages ────────────────────────────────────────────────────
create table if not exists brokerages (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  team_name       text,
  license_number  text,
  primary_market  text,
  timezone        text not null default 'America/New_York',
  plan            brokerage_plan not null default 'starter',
  created_at      timestamptz default now()
);

-- ── Users ─────────────────────────────────────────────────────────
-- Note: users.role is their global role.
-- brokerage_members.role is role within a specific brokerage.
-- A TC can be a member of multiple brokerages.
create table if not exists users (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null unique,
  full_name        text not null,
  role             user_role not null default 'agent',
  avatar_url       text,
  license_number   text,
  tc_company       text,              -- e.g. "TransactionNerd.com"
  tc_capacity_cap  integer not null default 33,
  markets          text[],
  created_at       timestamptz default now()
);

-- ── Brokerage members (junction) ──────────────────────────────────
-- TCs appear here for every brokerage they work with.
create table if not exists brokerage_members (
  id            uuid primary key default uuid_generate_v4(),
  brokerage_id  uuid not null references brokerages(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  role          user_role not null,
  is_active     boolean not null default true,
  joined_at     timestamptz default now(),
  unique (brokerage_id, user_id)
);

create index if not exists bm_brokerage_idx on brokerage_members(brokerage_id);
create index if not exists bm_user_idx      on brokerage_members(user_id);

-- ── TC routing rules ──────────────────────────────────────────────
create table if not exists tc_routing_rules (
  id            uuid primary key default uuid_generate_v4(),
  brokerage_id  uuid not null references brokerages(id) on delete cascade,
  agent_id      uuid not null references users(id) on delete cascade,
  default_tc_id uuid not null references users(id) on delete cascade,
  fallback_tc_id uuid references users(id) on delete set null,
  updated_at    timestamptz default now(),
  unique (brokerage_id, agent_id)
);

-- ── Checklist templates ───────────────────────────────────────────
create table if not exists checklist_templates (
  id            uuid primary key default uuid_generate_v4(),
  brokerage_id  uuid not null references brokerages(id) on delete cascade,
  name          text not null,
  side          text,  -- 'buyer' | 'seller' | 'dual' | null (any)
  is_default    boolean not null default false,
  created_at    timestamptz default now()
);

create table if not exists checklist_template_steps (
  id                      uuid primary key default uuid_generate_v4(),
  template_id             uuid not null references checklist_templates(id) on delete cascade,
  label                   text not null,
  default_assignee_role   text,   -- 'tc' | 'agent' | null
  days_from_effective     integer,
  is_required             boolean not null default true,
  notify_on_complete      boolean not null default false,
  sort_order              integer not null default 0,
  created_at              timestamptz default now()
);

create index if not exists tmpl_steps_idx on checklist_template_steps(template_id);

-- ── Deals ─────────────────────────────────────────────────────────
create table if not exists deals (
  id                    uuid primary key default uuid_generate_v4(),
  brokerage_id          uuid not null references brokerages(id) on delete cascade,
  agent_id              uuid not null references users(id) on delete restrict,
  tc_id                 uuid references users(id) on delete set null,
  address               text not null,
  city                  text not null default '',
  mls_number            text,
  sale_price            numeric(12,2),
  side                  deal_side not null default 'buyer',
  stage                 deal_stage not null default 'under_contract',
  effective_date        date,
  close_date            date,
  closed_at             timestamptz,
  close_price           numeric(12,2),
  checklist_template_id uuid references checklist_templates(id) on delete set null,
  notes                 text,
  created_at            timestamptz default now(),
  archived_at           timestamptz
);

create index if not exists deals_brokerage_idx  on deals(brokerage_id);
create index if not exists deals_agent_idx      on deals(agent_id);
create index if not exists deals_tc_idx         on deals(tc_id);
create index if not exists deals_stage_idx      on deals(stage);
create index if not exists deals_close_date_idx on deals(close_date);
create index if not exists deals_closed_at_idx  on deals(closed_at);
create index if not exists deals_active_idx     on deals(tc_id) where closed_at is null and archived_at is null;

-- ── Tasks ─────────────────────────────────────────────────────────
create table if not exists tasks (
  id                 uuid primary key default uuid_generate_v4(),
  deal_id            uuid not null references deals(id) on delete cascade,
  template_step_id   uuid references checklist_template_steps(id) on delete set null,
  label              text not null,
  assignee_id        uuid references users(id) on delete set null,
  due_date           date,
  completed_at       timestamptz,
  is_required        boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz default now()
);

create index if not exists tasks_deal_idx     on tasks(deal_id);
create index if not exists tasks_assignee_idx on tasks(assignee_id);
create index if not exists tasks_due_date_idx on tasks(due_date) where completed_at is null;

-- ── Documents ─────────────────────────────────────────────────────
create table if not exists documents (
  id               uuid primary key default uuid_generate_v4(),
  deal_id          uuid not null references deals(id) on delete cascade,
  uploaded_by      uuid references users(id) on delete set null,
  name             text not null,
  file_url         text,
  file_size_bytes  bigint,
  doc_type         text not null default 'other',
  status           doc_status not null default 'missing',
  external_ref_url text,   -- DocuSign envelope_id / Dotloop loop URL
  uploaded_at      timestamptz,
  created_at       timestamptz default now()
);

create index if not exists docs_deal_idx   on documents(deal_id);
create index if not exists docs_status_idx on documents(status);

-- ── Contacts ──────────────────────────────────────────────────────
create table if not exists contacts (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references deals(id) on delete cascade,
  role            contact_role not null,
  full_name       text not null,
  email           text,
  phone           text,
  company         text,
  fub_contact_id  text,
  created_at      timestamptz default now()
);

create index if not exists contacts_deal_idx on contacts(deal_id);

-- ── Messages ──────────────────────────────────────────────────────
create table if not exists messages (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references deals(id) on delete cascade,
  sender_id       uuid not null references users(id) on delete cascade,
  body            text not null,
  attachment_url  text,
  created_at      timestamptz default now()
);

create index if not exists messages_deal_idx on messages(deal_id);

-- ── Timeline events ───────────────────────────────────────────────
create table if not exists timeline_events (
  id           uuid primary key default uuid_generate_v4(),
  deal_id      uuid not null references deals(id) on delete cascade,
  actor_id     uuid references users(id) on delete set null,
  event_type   text not null,
  description  text not null,
  metadata     jsonb,
  created_at   timestamptz default now()
);

create index if not exists timeline_deal_idx on timeline_events(deal_id);

-- ── Notifications ─────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  deal_id     uuid references deals(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text not null,
  deep_link   text,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists notifs_user_idx  on notifications(user_id, read_at) where read_at is null;
create index if not exists notifs_deal_idx  on notifications(deal_id);

-- ── Integration connections ───────────────────────────────────────
create table if not exists integration_connections (
  id               uuid primary key default uuid_generate_v4(),
  brokerage_id     uuid not null references brokerages(id) on delete cascade,
  provider         int_provider not null,
  access_token     text not null,
  refresh_token    text,
  token_expires_at timestamptz,
  status           int_status not null default 'connected',
  last_synced_at   timestamptz,
  created_at       timestamptz default now(),
  unique (brokerage_id, provider)
);

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Get the calling user's primary brokerage_id
create or replace function my_brokerage_id()
returns uuid language sql stable as $$
  select brokerage_id from brokerage_members
  where user_id = auth.uid() and is_active = true
  limit 1
$$;

-- Get the calling user's role in their primary brokerage
create or replace function my_role()
returns user_role language sql stable as $$
  select role from users where id = auth.uid()
$$;

-- Check if current user is a member of a given brokerage
create or replace function is_member_of(bid uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from brokerage_members
    where user_id = auth.uid() and brokerage_id = bid and is_active = true
  )
$$;

-- Get TC's global active file count (no brokerage filter — cross-team)
create or replace function tc_active_files(tc uuid)
returns bigint language sql stable as $$
  select count(*) from deals
  where tc_id = tc and closed_at is null and archived_at is null
$$;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table brokerages           enable row level security;
alter table users                enable row level security;
alter table brokerage_members    enable row level security;
alter table tc_routing_rules     enable row level security;
alter table checklist_templates  enable row level security;
alter table checklist_template_steps enable row level security;
alter table deals                enable row level security;
alter table tasks                enable row level security;
alter table documents            enable row level security;
alter table contacts             enable row level security;
alter table messages             enable row level security;
alter table timeline_events      enable row level security;
alter table notifications        enable row level security;
alter table integration_connections enable row level security;

-- Brokerages
create policy "brokerage: members read"  on brokerages for select using (is_member_of(id));
create policy "brokerage: admin update"  on brokerages for update using (is_member_of(id) and my_role() = 'admin');

-- Users
create policy "users: read own brokerage members" on users for select
  using (
    id = auth.uid()
    or exists(
      select 1 from brokerage_members bm1
      join brokerage_members bm2 on bm1.brokerage_id = bm2.brokerage_id
      where bm1.user_id = auth.uid() and bm2.user_id = users.id and bm1.is_active = true
    )
  );
create policy "users: update own" on users for update using (id = auth.uid());

-- Brokerage members
create policy "bm: read own brokerage" on brokerage_members for select
  using (brokerage_id = my_brokerage_id() or user_id = auth.uid());
create policy "bm: admin manage"       on brokerage_members for all
  using (brokerage_id = my_brokerage_id() and my_role() = 'admin');

-- TC routing rules
create policy "routing: admin rw"  on tc_routing_rules for all
  using (brokerage_id = my_brokerage_id() and my_role() = 'admin');
create policy "routing: agent read own" on tc_routing_rules for select
  using (agent_id = auth.uid());

-- Checklist templates
create policy "templates: brokerage rw" on checklist_templates for all
  using (brokerage_id = my_brokerage_id());
create policy "template_steps: via template" on checklist_template_steps for all
  using (template_id in (select id from checklist_templates where brokerage_id = my_brokerage_id()));

-- Deals — core RLS from spec:
-- admin: all in brokerage | agent: own deals | TC: assigned deals
create policy "deals: admin all"   on deals for all using (brokerage_id = my_brokerage_id() and my_role() = 'admin');
create policy "deals: agent own"   on deals for all using (agent_id = auth.uid());
create policy "deals: tc assigned" on deals for select using (tc_id = auth.uid());
create policy "deals: tc update assigned" on deals for update using (tc_id = auth.uid());

-- Tasks, documents, contacts, messages, timeline: via deal access
create policy "tasks: via deal"     on tasks for all using (deal_id in (select id from deals));
create policy "docs: via deal"      on documents for all using (deal_id in (select id from deals));
create policy "contacts: via deal"  on contacts for all using (deal_id in (select id from deals));
create policy "messages: via deal"  on messages for all using (deal_id in (select id from deals));
create policy "timeline: via deal read" on timeline_events for select using (deal_id in (select id from deals));

-- Notifications: own only
create policy "notifs: own" on notifications for all using (user_id = auth.uid());

-- Integration connections: admin only
create policy "integrations: admin" on integration_connections for all
  using (brokerage_id = my_brokerage_id() and my_role() = 'admin');

-- ================================================================
-- STORAGE BUCKET
-- ================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-documents', 'deal-documents', false, 52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) on conflict (id) do nothing;

create policy "storage: auth upload"  on storage.objects for insert  with check (bucket_id = 'deal-documents' and auth.role() = 'authenticated');
create policy "storage: auth read"    on storage.objects for select  using  (bucket_id = 'deal-documents' and auth.role() = 'authenticated');
create policy "storage: auth delete"  on storage.objects for delete  using  (bucket_id = 'deal-documents' and auth.role() = 'authenticated');

-- ================================================================
-- COMMENTS (setup instructions)
-- ================================================================
comment on table brokerages is 'One row per real estate team. A TC can be a member of multiple brokerages.';
comment on column users.tc_capacity_cap is 'TC sets this themselves. Default 33. Used for routing suggest logic.';
comment on table brokerage_members is 'Junction table. TCs appear here once per brokerage they work with.';
comment on table tc_routing_rules is 'Admin-set per-agent TC defaults + fallback when default is at cap.';
