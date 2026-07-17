# DEMI v2 — TC Platform

**Live:** https://demi-ten.vercel.app  
**Spec:** `demi_complete_handoff.html`

---

## Architecture decisions (from spec)

### TC accounts are independent
A TC like TransactionNerd is a first-class account — not a child of any brokerage. They appear in `brokerage_members` once per team they work with. Their capacity counter is global across all teams.

### Cross-brokerage privacy
`GET /api/tc/:id/capacity` returns `breakdown_by_brokerage: null` to everyone except the TC themselves. Admins from different brokerages see the total capacity but never per-team breakdowns.

### TC routing suggest
When a deal is created, `GET /api/routing-rules/suggest/:agent_id` runs the fallback logic:
- Default TC available → suggest default
- Default TC at cap → suggest fallback TC
- No fallback → agent picks manually

### Capacity bar color thresholds
- 0–74%: Green (Available)
- 75–99%: Amber (Near capacity)
- 100%+: Red (At capacity) → fallback auto-selected

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://demi-ten.vercel.app
CRON_SECRET=your-random-secret-for-cron-protection
```

### 3. Run migration
In Supabase SQL Editor → paste and run `supabase/migration.sql`

Creates: all tables, enums, indexes, RLS policies, helper functions, storage bucket.

### 4. Create brokerage and seed users
Follow commented SQL in `supabase/seed.sql`:
1. Create brokerage row → get UUID
2. Create user accounts in Supabase Auth
3. Insert user profiles with roles
4. Link users to brokerage via `brokerage_members`
5. Set TC routing rule (Jude → Carlos, fallback → Ana)
6. Seed checklist templates

### 5. Deploy to Vercel
```bash
git init && git add . && git commit -m "DEMI v2"
git remote add origin https://github.com/YOUR-ORG/demi.git
git push -u origin main
```
Add env vars to Vercel → auto-deploys.

### 6. Set CRON_SECRET in Vercel
Cron jobs run daily at 7/8/9 AM UTC (via `vercel.json`).  
They're protected by the `x-cron-secret` header — Vercel sends this automatically.

---

## Role routing

| Role | After login |
|---|---|
| admin | /dashboard |
| tc | /dashboard |
| agent | /portal |

---

## Key API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/deals | List deals (role-scoped by RLS) |
| POST | /api/deals | Create deal + auto-generate tasks |
| PATCH | /api/deals/:id | Update stage, TC, dates — fires notifications |
| POST | /api/deals/:id/close | Close deal, archive, fire FUB post-close |
| GET | /api/tc/available | TCs for this brokerage with capacity |
| GET | /api/tc/:id/capacity | TC capacity (breakdown only for TC themselves) |
| GET | /api/routing-rules/suggest/:agent_id | Pre-select TC for new deal |
| POST | /api/invites | Send invite email (admin only) |
| GET | /api/cron?job=... | Cron jobs (protected by CRON_SECRET header) |
