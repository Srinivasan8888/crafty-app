// Descope sign-in flow. The <Descope> component is a Web Component under the
// hood — must be dynamically imported with ssr:false (per Descope's SSR docs).
// In DEV_AUTH mode this page is unreachable in normal flow (lib/auth auto-logs
// in), but we still render a friendly fallback so direct navigation doesn't 404.

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MaybeAuthProvider } from "@/components/MaybeAuthProvider";
import { craftyDescopeTheme } from "@/lib/descopeTheme";

const Descope = dynamic(
  () => import("@descope/nextjs-sdk").then((m) => m.Descope),
  { ssr: false, loading: () => <p className="text-sm text-ink-muted">Loading sign-in…</p> },
);

const DEV = process.env.DEV_AUTH === "true";
const CONFIGURED =
  !!process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID &&
  !process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID.startsWith("P_placeholder");

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string };
}) {
  // Accept ?redirect_url=... so post-sign-in lands where the user came from.
  // Only allow same-origin relative paths (a single leading "/", not "//evil").
  // Prevents an open-redirect via ?redirect_url=https://evil.example.
  const rawRedirect = searchParams.redirect_url;
  const after =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  return (
    <MaybeAuthProvider>
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgb(var(--cream))",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="flex items-center justify-between px-[18px] md:px-[var(--container-pad)] py-3 md:py-[18px] mx-auto"
          style={{ maxWidth: "var(--container-max)" }}
        >
          <Link href="/" className="inline-flex items-center" aria-label="Crafty home">
            <Logo size="md" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: "rgb(var(--muted))" }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to site
          </Link>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-cream p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl text-ink">Sign in to Crafty</h1>
          <p className="mt-2 text-sm text-ink-muted">
            New here? <Link href="/sign-up" className="underline">Create an account</Link>.
          </p>
          <div className="mt-6">
            {DEV || !CONFIGURED ? (
              <p className="rounded-md border border-line bg-canvas-sunken p-4 text-sm text-ink-muted">
                {DEV
                  ? "Dev mode active — you're already signed in as the dev user. Set DEV_AUTH=false to test Descope."
                  : "Descope project not configured yet. Set NEXT_PUBLIC_DESCOPE_PROJECT_ID in .env to enable real sign-in."}
              </p>
            ) : (
              <Descope
                flowId="sign-in"
                theme="light"
                themeOverride={craftyDescopeTheme as any}
                redirectAfterSuccess={after}
              />
            )}
          </div>
        </div>
      </div>
    </MaybeAuthProvider>
  );
}
