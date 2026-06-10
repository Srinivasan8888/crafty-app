"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

export default function SentryExamplePage() {
  function triggerError() {
    const error = new Error("Sentry verification error from Crafty");
    Sentry.captureException(error);
    throw error;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-magenta">
        Sentry check
      </p>
      <h1 className="mt-3 font-display text-4xl font-extrabold text-ink">
        Verify error reporting
      </h1>
      <p className="mt-4 text-ink-muted">
        Use this page only while setting up Sentry. The button sends a test
        exception to the configured project.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={triggerError} className="btn btn-primary">
          Trigger test error
        </button>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
