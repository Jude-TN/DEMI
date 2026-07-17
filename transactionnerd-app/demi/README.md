# DEMI — TC Platform

Deal & Engagement Management Intelligence  
**Live:** https://demi-ten.vercel.app

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| Auth | Supabase Auth |
| Hosting | Vercel |

---

## Project structure

```
demi/
├── app/
│   ├── auth/           login, register, forgot-password
│   ├── dashboard/      TC + admin workspace (all screens)
│   ├── portal/         Agent-facing portal
│   └── api/            Server routes (invite, auth callback)
├── components/
│   ├── ui/             Shared UI components
│   └── layout/         Sidebar, Topbar
├── lib/
│   ├── supabase/       Browser + server clients
│   └── utils/          Date helpers
├── types/              TypeScript types for all entities
└── supabase/
    ├── migration.sql   Full schema + RLS
    └── seed.sql        Default checklist templates
```

---

## Setup in 6 steps

### 1. Install dependencies
```bash
npm install
```

### 2. Set environment variables

Create `.env.local` (copy from `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://demi-ten.vercel.app
```

Get these from: **Supabase → Project Settings → API**

Add the same 4 vars to **Vercel → Project → Environment Variables**.

### 3. Run the database migration

In **Supabase → SQL Editor → New query**, paste and run `supabase/migration.sql`.

This creates all tables, enums, indexes, RLS policies, and the storage bucket.

### 4. Create your brokerage and admin account

In Supabase → Authentication → Users, create a user for yourself.  
Then in SQL Editor:

```sql
-- First create the brokerage
INSERT INTO brokerages (name, team_name, primary_market, timezone)
VALUES ('TransactionNerd', 'Transaction Nerd Team', 'Southwest Florida', 'America/New_York')
RETURNING id;

-- Copy the returned UUID, then:
INSERT INTO users (id, brokerage_id, email, full_name, role)
VALUES (
  'YOUR-AUTH-USER-UUID',
  'YOUR-BROKERAGE-UUID',
  'jude@transactionnerd.com',
  'Jude Paul',
  'admin'
);
```

### 5. Run the seed (checklist templates)

In SQL Editor, open `supabase/seed.sql`, replace `YOUR-BROKERAGE-ID` with your brokerage UUID, and run it.

This creates:
- Buyer Side — Standard (12 steps)
- Seller Side — Standard (12 steps)  
- Luxury / High-Value Add-ons (9 steps)

### 6. Invite Carlos and Ana as TCs

In Supabase → Authentication → Users → Invite user, send invites to:
- carlos@transactionnerd.com
- ana@transactionnerd.com

After they accept and set passwords, run:
```sql
UPDATE users SET role = 'tc', brokerage_id = 'YOUR-BROKERAGE-UUID'
WHERE email IN ('carlos@transactionnerd.com', 'ana@transactionnerd.com');
```

---

## How role routing works

| Role | After login lands on |
|---|---|
| admin | /dashboard |
| tc | /dashboard |
| agent | /portal |

The middleware enforces this on every request. An agent who navigates directly to `/dashboard` is redirected to `/portal` and vice versa.

---

## Agent self-registration

Agents visit `/auth/register`, fill in their details, and confirm their email. They land on `/portal` automatically. Their `brokerage_id` will be null until an admin links them to a brokerage (or the invite flow is used instead).

---

## Screens built

### TC / Admin workspace (/dashboard)
- Dashboard (KPI cards, overdue tasks, closing this week)
- Pipeline (Kanban — drag-and-drop between 5 stages)
- All deals (filterable table with stage pills)
- New deal (full intake form with checklist auto-generation)
- Deal detail (6 tabs: Checklist, Documents, Messages, Contacts, Timeline, Key dates)
- Agents (directory with volume stats)
- Contacts (all parties across all deals)
- Reports (bar chart + TC performance)
- Notifications (real-time, mark read, deep links)
- Settings (Brokerage profile, Team members, Integrations, Billing)

### Agent portal (/portal)
- My deals (all their transactions with progress bars)
- Notifications

---

## Push to Vercel

```bash
git init
git add .
git commit -m "DEMI platform v1"
git remote add origin https://github.com/YOUR-ORG/demi.git
git push -u origin main
```

Vercel auto-deploys on push. Done.
