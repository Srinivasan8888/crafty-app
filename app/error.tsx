"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Logo } from "@/components/Logo";

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
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-10">
        <Logo size="sm" />
      </div>

      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-4 text-[26px] opacity-55 text-mustard"
        >
          ❋
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-2 text-[26px] opacity-50 text-magenta"
        >
          ✿
        </span>
        <h1
          className="font-display font-extrabold leading-tight tracking-tight"
          style={{ fontSize: "44px", letterSpacing: "-1.4px" }}
        >
          Something{" "}
          <em className="italic font-semibold text-magenta">
            dropped a stitch.
          </em>
        </h1>
      </div>

      <p className="mt-5 max-w-md text-ink-muted leading-relaxed">
        Looks like something on our end fell apart. Try again, or come back in a
        minute.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Take me home
        </Link>
      </div>

      <p
        className="mt-10 font-display italic text-muted"
        style={{ fontSize: "13px" }}
      >
        If this keeps happening, email{" "}
        <a
          href="mailto:hi@crafty.app"
          className="not-italic font-semibold text-forest"
          style={{
            borderBottom: "1.5px solid rgb(var(--mustard))",
            paddingBottom: "1px",
          }}
        >
          hi@crafty.app
        </a>
        .
      </p>

      {error?.digest ? (
        <p
          className="mt-6 italic text-subtle"
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "11px",
          }}
        >
          ref: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
