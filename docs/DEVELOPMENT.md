# Development setup

For cloning and running Curbside locally.

## Prerequisites

- Node.js 20+
- A Supabase project
- A Mapbox access token
- Google OAuth configured in Supabase (for sign-in)

## Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` — see [SECRETS.md](SECRETS.md) for where each value comes from.

## Database

In Supabase SQL Editor:

| File | When to run |
|------|-------------|
| `supabase/setup.sql` | Fresh database — full schema |
| `supabase/migrations/*.sql` | Existing DB — incremental updates |
| `supabase/seed-example-spots.sql` | Optional sample listings |

## Auth (local)

**Supabase** → Authentication → URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

**Google Cloud Console** → OAuth client → add Supabase’s callback URL (see [SECRETS.md](SECRETS.md)).

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo vs real listings

- **Demo spots** (`demo-*` IDs) live in `lib/data/demo-spots.ts` — on the map in **dev** by default.
- In **production**, demo spots are hidden unless `NEXT_PUBLIC_ENABLE_DEMO_SPOTS=true`.
- **Seed spots** (`supabase/seed-example-spots.sql`) are example UUID listings with a Demo badge.
- **Real listings** come from Supabase after publishing from the host dashboard.

## Project structure

```
app/              # routes and pages
components/       # UI by feature
lib/
  actions/        # server actions
  config/         # env, constants, feature flags
  data/           # demo spots + cookie bookings
  domain/         # booking rules, reservations, ownership
  helpers/        # formatting, validation, redirects
  integrations/   # mapbox, geocoding, photo uploads
  supabase/       # client + queries
  types/          # shared TypeScript types
public/           # screenshots and static assets
supabase/         # SQL schema, migrations, seed data
```

## Deploy

Add the same env vars in Vercel (or your host). Update Supabase Auth Site URL and redirect URLs to your production domain.

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
```

Manual QA checklist: [TESTING.md](TESTING.md).
