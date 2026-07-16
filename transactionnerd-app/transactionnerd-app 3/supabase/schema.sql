-- TransactionNerd backend schema
-- Run this in the Supabase SQL editor once, after creating your project.

create extension if not exists "pgcrypto";

-- ── Profiles ─────────────────────────────────────────────────────
-- One row per auth.users row. Role determines TC (full access) vs agent (read-only, own deals).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('tc', 'agent')),
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- ── Transactions ─────────────────────────────────────────────────
create table transactions (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  service_type text not null check (service_type in ('listing_coordination', 'contract_to_close', 'write_an_offer')),
  status text not null default 'new' check (status in ('new', 'under_contract', 'pending_close', 'closed')),
  email_slug text not null unique,
  closing_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Which agents can see which transactions (an agent may be on a team; supports multiple agents per deal)
create table transaction_agents (
  transaction_id uuid references transactions(id) on delete cascade,
  agent_id uuid references profiles(id) on delete cascade,
  primary key (transaction_id, agent_id)
);

-- ── Tasks ────────────────────────────────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Stream entries ───────────────────────────────────────────────
create table stream_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  source text not null check (source in ('manual', 'email')),
  author_id uuid references profiles(id),
  content text not null,
  raw_email text,
  created_at timestamptz not null default now()
);

-- ── Checklists ───────────────────────────────────────────────────
-- A transaction can carry multiple independent checklists at once
-- (e.g. the standard Contract-to-Close list plus a custom HOA list).
create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  title text not null,
  position int not null default 0
);

create table checklists (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  template_id uuid references checklist_templates(id),
  title text not null,
  is_custom boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position int not null default 0
);

create index on transaction_agents (agent_id);
create index on tasks (transaction_id);
create index on stream_entries (transaction_id, created_at);
create index on checklists (transaction_id);
create index on checklist_items (checklist_id);
create index on checklist_template_items (template_id);

-- ── Row Level Security ───────────────────────────────────────────
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table transaction_agents enable row level security;
alter table tasks enable row level security;
alter table stream_entries enable row level security;

-- Helper: is the current user a TC team member?
create or replace function is_tc()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'tc'
  );
$$;

-- Helper: does the current user (agent) have access to a given transaction?
create or replace function has_deal_access(deal_id uuid)
returns boolean
language sql security definer stable
as $$
  select is_tc() or exists (
    select 1 from transaction_agents
    where transaction_id = deal_id and agent_id = auth.uid()
  );
$$;

-- Profiles: everyone can read their own profile; TC can read all.
create policy "read own profile" on profiles for select using (id = auth.uid() or is_tc());
create policy "update own profile" on profiles for update using (id = auth.uid());

-- Transactions: TC full access. Agents read-only, only their assigned deals.
create policy "tc manage transactions" on transactions for all using (is_tc()) with check (is_tc());
create policy "agents read own transactions" on transactions for select
  using (exists (select 1 from transaction_agents where transaction_id = id and agent_id = auth.uid()));

create policy "tc manage transaction_agents" on transaction_agents for all using (is_tc()) with check (is_tc());
create policy "agents read own links" on transaction_agents for select using (agent_id = auth.uid());

-- Tasks: TC full access. Agents read-only, only for deals they're on.
create policy "tc manage tasks" on tasks for all using (is_tc()) with check (is_tc());
create policy "agents read tasks" on tasks for select using (has_deal_access(transaction_id));

-- Stream entries: TC full access (manual posts). Agents read-only.
-- Inserts from the inbound email webhook use the service-role key and bypass RLS entirely.
create policy "tc manage stream" on stream_entries for all using (is_tc()) with check (is_tc());
create policy "agents read stream" on stream_entries for select using (has_deal_access(transaction_id));

-- Checklists and checklist items: TC full access. Agents read-only, same deal-access rule.
alter table checklists enable row level security;
alter table checklist_items enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_template_items enable row level security;

create policy "tc manage checklists" on checklists for all using (is_tc()) with check (is_tc());
create policy "agents read checklists" on checklists for select using (has_deal_access(transaction_id));

create policy "tc manage checklist_items" on checklist_items for all using (is_tc()) with check (is_tc());
create policy "agents read checklist_items" on checklist_items for select using (
  has_deal_access((select transaction_id from checklists where id = checklist_id))
);

-- Templates are shared across the whole TC team (any TC can read/use any template).
create policy "tc manage templates" on checklist_templates for all using (is_tc()) with check (is_tc());
create policy "tc manage template_items" on checklist_template_items for all using (is_tc()) with check (is_tc());

-- Auto-create a profile row whenever a new auth user signs up.
-- Role defaults to 'agent'; promote TC team members to 'tc' manually in the table editor,
-- or via the registration flow's TC access code (see app/api/register/route.ts).
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (new.id, 'agent', coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Prevent a logged-in user from granting themselves the 'tc' role by calling
-- supabase.from('profiles').update({ role: 'tc' }) directly. auth.uid() is null
-- when a request comes from the service-role key (e.g. the registration API
-- after validating a TC access code), so that path is unaffected.
create or replace function prevent_role_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Role changes must go through the registration flow or an admin.';
  end if;
  return new;
end;
$$;

create trigger no_self_role_escalation
  before update on profiles
  for each row execute procedure prevent_role_self_escalation();
