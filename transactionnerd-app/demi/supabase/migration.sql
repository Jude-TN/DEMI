-- ================================================================
-- DEMI — Complete database migration
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ================================================================

-- ── Extensions ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────────
do $$ begin
  create type user_role     as enum ('admin','agent','tc');
  create type deal_stage    as enum ('lead','listing','under_contract','clear_to_close','closed','cancelled');
  create type deal_side     as enum ('buyer','seller','dual');
  create type task_status   as enum ('open','completed','waived');
  create type task_priority as enum ('high','medium','low');
  create type doc_status    as enum ('missing','received','executed','waived');
  create type doc_type      as enum ('purchase_agreement','listing_agreement','seller_disclosure','hoa_estoppel','hoa_docs','title_commitment','commitment_letter','appraisal','inspection_report','closing_disclosure','survey','addendum','other');
  create type contact_role  as enum ('buyer','seller','buyer_agent','seller_agent','title','lender','inspector','appraiser','hoa','attorney','other');
  create type notif_channel as enum ('in_app','email','both');
exception when duplicate_object then null;
end $$;

-- ── Brokerages ────────────────────────────────────────────────────
create table if not exists brokerages (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  team_name        text,
  license_number   text,
  primary_market   text,
  logo_url         text,
  timezone         text not null default 'America/New_York',
  default_tc_id    uuid,
  created_at       timestamptz default now()
);

-- ── Users ─────────────────────────────────────────────────────────
create table if not exists users (
  id             uuid primary key references auth.users(id) on delete cascade,
  brokerage_id   uuid references brokerages(id) on delete set null,
  email          text not null unique,
  full_name      text not null,
  role           user_role not null default 'agent',
  license_number text,
  phone          text,
  avatar_url     text,
  created_at     timestamptz default now()
);

-- ── Deals ─────────────────────────────────────────────────────────
create table if not exists deals (
  id             uuid primary key default uuid_generate_v4(),
  brokerage_id   uuid not null references brokerages(id) on delete cascade,
  address        text not null,
  unit           text,
  city           text not null default '',
  state          text not null default 'FL',
  zip            text not null default '',
  sale_price     numeric(12,2),
  close_date     date,
  effective_date date,
  side           deal_side not null default 'buyer',
  stage          deal_stage not null default 'under_contract',
  agent_id       uuid references users(id) on delete set null,
  tc_id          uuid references users(id) on delete set null,
  mls_number     text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  closed_at      timestamptz
);

create index if not exists deals_brokerage_idx on deals(brokerage_id);
create index if not exists deals_stage_idx     on deals(stage);
create index if not exists deals_agent_idx     on deals(agent_id);
create index if not exists deals_tc_idx        on deals(tc_id);
create index if not exists deals_close_date_idx on deals(close_date);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists deals_updated_at on deals;
create trigger deals_updated_at
  before update on deals
  for each row execute function set_updated_at();

-- ── Tasks ─────────────────────────────────────────────────────────
create table if not exists tasks (
  id                 uuid primary key default uuid_generate_v4(),
  deal_id            uuid not null references deals(id) on delete cascade,
  brokerage_id       uuid not null references brokerages(id) on delete cascade,
  label              text not null,
  assignee_id        uuid references users(id) on delete set null,
  due_date           date,
  status             task_status not null default 'open',
  priority           task_priority not null default 'medium',
  completed_at       timestamptz,
  template_step_id   uuid,
  sort_order         integer not null default 0,
  notes              text,
  created_at         timestamptz default now()
);

create index if not exists tasks_deal_idx      on tasks(deal_id);
create index if not exists tasks_assignee_idx  on tasks(assignee_id);
create index if not exists tasks_status_idx    on tasks(status);
create index if not exists tasks_due_date_idx  on tasks(due_date);

-- ── Documents ─────────────────────────────────────────────────────
create table if not exists documents (
  id               uuid primary key default uuid_generate_v4(),
  deal_id          uuid not null references deals(id) on delete cascade,
  brokerage_id     uuid not null references brokerages(id) on delete cascade,
  name             text not null,
  file_url         text,
  file_size_bytes  bigint,
  doc_type         doc_type not null default 'other',
  status           doc_status not null default 'missing',
  uploaded_by      uuid references users(id) on delete set null,
  uploaded_at      timestamptz,
  notes            text,
  created_at       timestamptz default now()
);

create index if not exists documents_deal_idx   on documents(deal_id);
create index if not exists documents_status_idx on documents(status);

-- ── Contacts ──────────────────────────────────────────────────────
create table if not exists contacts (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references deals(id) on delete cascade,
  brokerage_id    uuid not null references brokerages(id) on delete cascade,
  role            contact_role not null,
  full_name       text not null,
  email           text,
  phone           text,
  company         text,
  fub_contact_id  text,
  created_at      timestamptz default now()
);

create index if not exists contacts_deal_idx on contacts(deal_id);
create index if not exists contacts_brokerage_idx on contacts(brokerage_id);

-- ── Messages ──────────────────────────────────────────────────────
create table if not exists messages (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references deals(id) on delete cascade,
  brokerage_id    uuid not null references brokerages(id) on delete cascade,
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
  brokerage_id uuid not null references brokerages(id) on delete cascade,
  event_type   text not null,
  description  text not null,
  user_id      uuid references users(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists timeline_deal_idx on timeline_events(deal_id);

-- ── Checklist templates ───────────────────────────────────────────
create table if not exists checklist_templates (
  id           uuid primary key default uuid_generate_v4(),
  brokerage_id uuid not null references brokerages(id) on delete cascade,
  name         text not null,
  side         text not null default 'all',
  is_default   boolean not null default false,
  created_at   timestamptz default now()
);

create table if not exists checklist_template_steps (
  id                   uuid primary key default uuid_generate_v4(),
  template_id          uuid not null references checklist_templates(id) on delete cascade,
  label                text not null,
  assignee_role        text not null default 'tc',
  days_from_effective  integer,
  required             boolean not null default true,
  auto_notify          boolean not null default false,
  linked_doc_type      doc_type,
  sort_order           integer not null default 0
);

create index if not exists template_steps_template_idx on checklist_template_steps(template_id);

-- ── Notifications ─────────────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references users(id) on delete cascade,
  brokerage_id uuid not null references brokerages(id) on delete cascade,
  deal_id      uuid references deals(id) on delete cascade,
  title        text not null,
  body         text not null,
  channel      notif_channel not null default 'in_app',
  read         boolean not null default false,
  created_at   timestamptz default now()
);

create index if not exists notifications_user_idx  on notifications(user_id, read);
create index if not exists notifications_deal_idx  on notifications(deal_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table brokerages         enable row level security;
alter table users              enable row level security;
alter table deals              enable row level security;
alter table tasks              enable row level security;
alter table documents          enable row level security;
alter table contacts           enable row level security;
alter table messages           enable row level security;
alter table timeline_events    enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_template_steps enable row level security;
alter table notifications      enable row level security;

-- Helper: get caller's brokerage_id
create or replace function my_brokerage_id()
returns uuid language sql stable as $$
  select brokerage_id from users where id = auth.uid()
$$;

-- Helper: get caller's role
create or replace function my_role()
returns user_role language sql stable as $$
  select role from users where id = auth.uid()
$$;

-- Brokerages: members can read their own
create policy "brokerage: own" on brokerages for select
  using (id = my_brokerage_id());
create policy "brokerage: admin update" on brokerages for update
  using (id = my_brokerage_id() and my_role() = 'admin');

-- Users: read own brokerage members
create policy "users: read own brokerage" on users for select
  using (brokerage_id = my_brokerage_id() or id = auth.uid());
create policy "users: update own" on users for update
  using (id = auth.uid());
create policy "users: admin insert" on users for insert
  with check (brokerage_id = my_brokerage_id() and my_role() = 'admin');

-- Deals: brokerage-scoped
create policy "deals: brokerage read" on deals for select
  using (brokerage_id = my_brokerage_id());
create policy "deals: agent/tc/admin insert" on deals for insert
  with check (brokerage_id = my_brokerage_id());
create policy "deals: agent/tc/admin update" on deals for update
  using (brokerage_id = my_brokerage_id());
create policy "deals: admin delete" on deals for delete
  using (brokerage_id = my_brokerage_id() and my_role() = 'admin');

-- Tasks, documents, contacts, messages, timeline: brokerage-scoped
create policy "tasks: brokerage rw" on tasks for all
  using (brokerage_id = my_brokerage_id());
create policy "documents: brokerage rw" on documents for all
  using (brokerage_id = my_brokerage_id());
create policy "contacts: brokerage rw" on contacts for all
  using (brokerage_id = my_brokerage_id());
create policy "messages: brokerage rw" on messages for all
  using (brokerage_id = my_brokerage_id());
create policy "timeline: brokerage rw" on timeline_events for all
  using (brokerage_id = my_brokerage_id());
create policy "templates: brokerage rw" on checklist_templates for all
  using (brokerage_id = my_brokerage_id());
create policy "template_steps: via template" on checklist_template_steps for all
  using (template_id in (
    select id from checklist_templates where brokerage_id = my_brokerage_id()
  ));

-- Notifications: own only
create policy "notifications: own" on notifications for all
  using (user_id = auth.uid());

-- ================================================================
-- STORAGE BUCKET
-- ================================================================

insert into storage.buckets (id, name, public)
values ('deal-documents', 'deal-documents', false)
on conflict (id) do nothing;

create policy "documents: authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'deal-documents' and auth.role() = 'authenticated');

create policy "documents: authenticated read"
  on storage.objects for select
  using (bucket_id = 'deal-documents' and auth.role() = 'authenticated');

create policy "documents: authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'deal-documents' and auth.role() = 'authenticated');

-- ================================================================
-- SEED: Default brokerage and checklist templates
-- ================================================================
-- After running this migration, run the seed below to create
-- the default TransactionNerd brokerage and checklist templates.
-- Replace values as needed.

-- Step 1: Create brokerage (run after migration)
-- insert into brokerages (name, team_name, primary_market, timezone)
-- values ('TransactionNerd', 'Transaction Nerd Team', 'Southwest Florida', 'America/New_York')
-- returning id;
-- Copy the returned id for the next steps.

-- Step 2: Set your auth user's profile (replace UUIDs)
-- insert into users (id, brokerage_id, email, full_name, role)
-- values ('YOUR-AUTH-UID', 'YOUR-BROKERAGE-ID', 'jude@transactionnerd.com', 'Jude Paul', 'admin');

-- Step 3: Invite Carlos and Ana via Supabase Auth, then:
-- insert into users (id, brokerage_id, email, full_name, role)
-- values
--   ('CARLOS-UID', 'YOUR-BROKERAGE-ID', 'carlos@transactionnerd.com', 'Carlos Rivera', 'tc'),
--   ('ANA-UID',    'YOUR-BROKERAGE-ID', 'ana@transactionnerd.com',    'Ana Martinez',  'tc');
