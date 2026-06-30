# Error monitoring (optional)

## Default behavior

Errors are logged to the server/console with a `[curbside]` prefix. No third-party account is required.

## Sentry (optional)

1. Create a project at [sentry.io](https://sentry.io) and copy the DSN.
2. Add to `.env.local` (and your hosting dashboard):

```
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project
```

3. Sentry is already listed in `package.json`. If you removed it, run:

```bash
npm install @sentry/nextjs
```

4. Redeploy. Errors from `instrumentation.ts` and client error boundaries will be sent when `SENTRY_DSN` is set.

Leave `SENTRY_DSN` empty to disable — the app works normally without it.
