# Curbside

Parking marketplace for Isla Vista / UCSB — find and reserve driveway, garage, and lot spots on a map.

## Features

- **Explore map** — browse listings with filters, price markers, and spot details
- **Reservations** — book a spot, save guest info, view access instructions after checkout
- **Host dashboard** — publish listings, upload photos, manage reservations
- **Google sign-in** — Supabase Auth with protected routes

## Screenshots

### Home

![Curbside home page](public/screenshots/home.png)

### Explore

![Curbside explore map](public/screenshots/explore.png)

### Sign in

![Curbside sign in](public/screenshots/signin.png)

## Tech stack

Next.js · TypeScript · Tailwind CSS · Supabase · Mapbox

## Run locally

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

You'll need Supabase, Mapbox, and Google OAuth configured. Full instructions: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Developer docs

| Doc | Purpose |
|-----|---------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, database, deploy notes |
| [docs/SECRETS.md](docs/SECRETS.md) | Environment variables |
| [docs/TESTING.md](docs/TESTING.md) | Manual QA checklist |
| [docs/MONITORING.md](docs/MONITORING.md) | Optional Sentry |
