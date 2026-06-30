# Secrets & environment variables

## Local development

1. Copy `.env.example` to `.env.local`
2. Fill in these three values:

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page — use the **anon/publishable** key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | [mapbox.com](https://account.mapbox.com) → Access tokens |

Restart `npm run dev` after changing `.env.local`.

## Never commit

- `.env.local` or any file with real keys
- Supabase **service_role** key (bypasses RLS — server-only)
- Google OAuth **client secret** (lives in Supabase/Google dashboards only)

Only `.env.example` (empty placeholders) belongs in git.

## Mapbox token

`NEXT_PUBLIC_MAPBOX_TOKEN` is bundled into client JavaScript — anyone can see it on a live site. In the Mapbox dashboard, restrict the token to your domains (e.g. `http://localhost:3000/*` and your production URL).

## Google OAuth

Configured in Supabase Auth, not in this repo. Redirect URI:

```
https://<your-project>.supabase.co/auth/v1/callback
```

## If a key leaks

1. Revoke the key in the provider dashboard (Supabase, Mapbox, or Google)
2. Generate a new key
3. Update `.env.local` and your hosting provider's env vars (Vercel, etc.)
4. If `.env.local` was ever committed, rotate **all** keys — git history keeps old secrets

## Production

Add env vars in your hosting dashboard (Vercel → Settings → Environment Variables). Do not put secrets in the repo.
