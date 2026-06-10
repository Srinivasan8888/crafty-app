"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-16 text-center text-ink">
          <h1 className="font-display text-4xl font-extrabold">
            Something went wrong
          </h1>
          <p className="mt-4 max-w-md text-ink-muted">
            Try again, or come back in a minute.
          </p>
          <button type="button" onClick={reset} className="btn btn-primary mt-7">
            Try again
          </button>
          {error?.digest ? (
            <p className="mt-6 font-mono text-xs text-ink-subtle">
              ref: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
