// PRD §20 — Sentry error monitoring.
//
// Next.js automatically runs `register()` from this file at server start.
// We initialize Sentry only when SENTRY_DSN is configured; otherwise the
// SDK is silent. The browser side reads NEXT_PUBLIC_SENTRY_DSN.

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn.startsWith("https://placeholder")) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }
}

export async function onRequestError(
  error: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  errorContext: {
    routerKind: string;
    routePath: string;
    routeType: string;
  },
) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn.startsWith("https://placeholder")) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, errorContext);
}
