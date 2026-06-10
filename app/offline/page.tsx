// V3 — PWA offline fallback.
//
// Served by the service worker when both network + cache miss on a navigation.
// Branded, minimal, and only references inline-able assets so it renders
// when the network is fully down.

import Link from "next/link";
import { OfflineRetryButton } from "./OfflineRetryButton";

export const metadata = {
  title: "Offline — Crafty",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "rgb(var(--cream))" }}
    >
      <div className="max-w-md text-center">
        <div
          aria-hidden
          className="text-magenta text-5xl mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ❋
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          You&rsquo;re offline.
        </h1>
        <p className="mt-4 text-base text-ink-muted">
          The connection dropped, but Crafty is still here when you come back.
          Saved items and recently viewed pages are still available.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/" className="btn btn-primary">
            Try the home page
          </Link>
          <OfflineRetryButton />
        </div>
        <p className="mt-8 font-display text-sm italic text-muted">
          Crafty — discover India&rsquo;s craft community, one city at a time.
        </p>
      </div>
    </main>
  );
}
