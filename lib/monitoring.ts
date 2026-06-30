type ErrorContext = Record<string, unknown>;

let captureExceptionFn: ((error: unknown) => string) | null = null;

export async function initMonitoring() {
  const dsn = process.env.SENTRY_DSN?.trim();

  if (!dsn) {
    return;
  }

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1
    });
    captureExceptionFn = (error: unknown) => Sentry.captureException(error);
  } catch (error) {
    console.error("[monitoring] Sentry init failed — is @sentry/nextjs installed?", error);
  }
}

export function captureError(error: unknown, context?: ErrorContext) {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    at: new Date().toISOString()
  };

  console.error("[curbside]", payload);

  if (captureExceptionFn) {
    captureExceptionFn(error);
  }
}
