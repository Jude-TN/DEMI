# TransactionNerd — TC board and agent portal

A working app: your internal transaction/task board, and a read-only agent
dashboard with an AI-summarized activity stream fed by CC'd emails.

This build has been verified to compile and produce a clean production build
(`npm run build`). It is not yet deployed anywhere — that requires the
accounts below.

## What's in here

- `app/tc/board` — Kanban board of all deals, grouped by stage
- `app/tc/deals/new` — Form to create a new transaction (address, service type, closing date, optional standard checklist)
- `app/tc/deals/[id]` — Deal detail: transaction email address, checklists, agent manager, stream
- `app/portal/dashboard` — Agent's list of all their deals with progress
- `app/portal/deals/[id]` — Agent's single-deal view: AI weekly summary + stream
- `app/api/inbound-email` — Webhook that receives CC'd emails, summarizes with Claude, posts to the stream
- `app/api/transactions` — Creates a new transaction with an auto-generated unique email slug
- `app/api/checklists` — Attaches a checklist to a transaction, from a saved template or built custom
- `app/api/checklist-templates` — Saves a checklist's structure as a reusable team template
- `app/api/agents` — Lists all agent profiles, for the add-agent picker
- `app/api/transaction-agents` — Links or unlinks an agent from a transaction
- `app/register` — Self-serve registration for both realtors and TCs, gated by a TC access code for the TC role
- `app/api/register` — Creates the Supabase auth account and sets the correct role server-side
- `components/Checklists.tsx` — A transaction can carry multiple independent checklists at once
- `components/AgentManager.tsx` — Add or remove which agents can see a given transaction
- `supabase/schema.sql` — Full database schema with row-level security (TC = full access, agents = read-only, own deals only)
- `lib/ai.ts` — The two Claude prompts: per-email summarization, and the weekly rollup

Note: this build supersedes the original flat `tasks` table with the `checklists` /
`checklist_items` / `checklist_templates` system. The `tasks` table still exists in
the schema for backward compatibility but nothing in the UI reads from it anymore.

The full loop now works end to end without touching the Supabase table editor by
hand: create a transaction, it gets a unique email address automatically, attach
a checklist, add the agent who should see it, and the agent's dashboard, progress
bar, and AI summary all populate from there.

## Setup, in order

### 1. Supabase (database + auth) — free to start

1. Create an account at supabase.com, create a new project
2. In the SQL Editor, paste and run the contents of `supabase/schema.sql`
3. Go to Settings → API. Copy the Project URL, `anon` public key, and `service_role` key
4. Go to Authentication → Providers, make sure Email is enabled
5. Create your first user: Authentication → Users → Add user (this becomes your TC login)
6. In the SQL Editor: `update profiles set role = 'tc' where email = 'you@transactionnerd.com';`
7. Create a second user for testing as an agent (leave its role as `agent`, the default)

### 2. Anthropic API key

1. Go to console.anthropic.com → API Keys → Create key
2. Copy it

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in everything from steps 1–2.
Generate any random string for `INBOUND_EMAIL_SECRET` (e.g. run `openssl rand -hex 16`).
Same for `TC_SIGNUP_CODE` — just make one up, this is the code you'll hand to your
actual TC team so they can register with TC access (see step 7).

### 4. Run it locally to confirm everything connects

```
npm install
npm run dev
```

Visit `localhost:3000`, log in as your TC user, confirm the board loads.

### 5. Deploy (Vercel — free to start)

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import that repo
3. Add all the same environment variables from `.env.local` in Vercel's project settings
4. Deploy. You'll get a URL like `transactionnerd-app.vercel.app`
5. Optional: in Vercel, add `portal.transactionnerd.com` as a custom domain, and update your DNS with the CNAME record Vercel gives you

### 6. Inbound email (the CC address feature)

This is the piece that needs a dedicated provider, since receiving email
programmatically is different from sending it.

1. Create an account at postmarkapp.com (or Mailgun/SendGrid — the webhook shape differs slightly, see the comment in `app/api/inbound-email/route.ts`)
2. Set up inbound email for a subdomain, e.g. `deals.transactionnerd.com`
3. Add the MX record Postmark gives you to your DNS for that subdomain
4. In Postmark, set the inbound webhook URL to:
   `https://your-deployed-url.vercel.app/api/inbound-email?secret=YOUR_INBOUND_EMAIL_SECRET`
5. Send a test email to `88bimini-ave@deals.transactionnerd.com` (matching a real transaction's `email_slug`) and confirm it shows up in that deal's stream

### 7. Registration is now self-serve

Both realtors and TCs create their own accounts at `/register` — no more creating
every login by hand in Supabase's dashboard.

- **Realtors** pick "I'm a Realtor" and register freely.
- **TCs** pick "I'm a TC" and must enter the `TC_SIGNUP_CODE` you set in your
  environment variables. Give that code only to your actual TC team — anyone
  who has it gets full read/write access to every transaction. Anyone who gets
  the role wrong, or doesn't have the code, registers as a realtor instead and
  can be promoted manually later if needed:
  `update profiles set role = 'tc' where email = '...';`

A logged-in user can never grant themselves the TC role by editing their own
profile — that's blocked at the database level (see the
`no_self_role_escalation` trigger in `schema.sql`), not just hidden in the UI.

Once someone registers as a realtor, a TC still needs to explicitly link them
to a transaction via "+ Add agent" before that transaction shows up on their
dashboard — registering alone doesn't grant visibility into any deals.

Your original TC login from step 4 above still works exactly as before; you
don't need to re-register yourself.

## What's deliberately not built yet

- The public marketing site (hero, pricing, about, intake) — that's a separate,
  simpler piece we already designed; it doesn't need any of the above accounts
- Password reset flow
- Email verification on signup (accounts are auto-confirmed for simplicity — fine
  for an internal tool, worth revisiting if registration opens up more broadly)
- Rate limiting on `/api/register` — nothing currently stops someone from
  submitting the form repeatedly; low risk for an internal tool, worth adding
  before this is linked from a public marketing site
- Mobile-responsive polish beyond the basics already in place
- A way to delete/reorder checklists once attached (can remove via Supabase table editor for now)
- Editing a saved checklist template after creation (delete and recreate for now)

## Open product decisions (see DEMI_Business_Requirements.docx)

- Whether AI summarization failures should show agents a visible "pending" state
  instead of silently skipping (currently: silent skip on failure)
- Whether a transaction can have more than one TC assigned/responsible
