import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MaybeAuthProvider } from "@/components/MaybeAuthProvider";
import { craftyDescopeTheme } from "@/lib/descopeTheme";

const Descope = dynamic(
  () => import("@descope/nextjs-sdk").then((m) => m.Descope),
  { ssr: false, loading: () => <p className="text-sm text-ink-muted">Loading sign-up…</p> },
);

const DEV = process.env.DEV_AUTH === "true";
const CONFIGURED =
  !!process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID &&
  !process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID.startsWith("P_placeholder");

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string };
}) {
  // The /list-your-profile server action sets the signup-intent cookie + sends
  // users here with ?redirect_url=/dashboard/... so the post-signup landing is
  // the form they originally clicked. Default to /dashboard.
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

      {/* Market-stall split: warm brand panel (lg+) + auth column. */}
      <div className="bg-cream grid min-h-[calc(100vh-72px)] lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT — brand panel. Hidden on small screens; a compact strip shows
            instead so mobile stays focused on the form. */}
        <aside
          className="relative hidden flex-col justify-between overflow-hidden p-10 xl:p-14 lg:flex"
          style={{
            background: "rgb(var(--cream-2))",
            borderRight: "1px solid var(--line-strong)",
          }}
          aria-hidden="true"
        >
          {/* Decorative marigold/rose motif (tokens only, no gradient text). */}
          <span
            className="pointer-events-none absolute select-none"
            style={{ top: 28, left: 40, fontSize: 30, color: "rgb(var(--mustard))", opacity: 0.55 }}
          >
            ❋
          </span>
          <span
            className="pointer-events-none absolute select-none"
            style={{ bottom: 120, right: 56, fontSize: 30, color: "rgb(var(--magenta))", opacity: 0.45 }}
          >
            ✿
          </span>

          <div>
            <p
              className="font-display text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgb(var(--forest))" }}
            >
              Set up your stall
            </p>
            <h2
              className="font-display mt-5 max-w-[14ch] text-4xl xl:text-5xl"
              style={{ color: "rgb(var(--ink))", lineHeight: 1.05, letterSpacing: "-0.01em" }}
            >
              Find your place in the{" "}
              <em style={{ fontStyle: "italic", color: "rgb(var(--magenta))" }}>Sunday bazaar.</em>
            </h2>
            <p className="mt-5 max-w-[42ch] text-sm" style={{ color: "rgb(var(--muted))" }}>
              Join a neighbourhood of makers, studios, and curious buyers. Save the work
              you love and follow it city by city.
            </p>
          </div>

          <div
            className="flex items-center gap-3 text-sm"
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: 20,
              color: "rgb(var(--subtle))",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
            }}
          >
            <Logo size="md" />
            <span>India&apos;s handmade-craft community, by city.</span>
          </div>
        </aside>

        {/* RIGHT — auth content, centred in its column. */}
        <main className="flex items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-md">
            {/* Compact brand strip for mobile (brand panel is hidden there). */}
            <p
              className="font-display mb-5 text-xs font-semibold uppercase tracking-[0.16em] lg:hidden"
              style={{ color: "rgb(var(--forest))" }}
            >
              Join the Crafty bazaar
            </p>

            <div
              className="rounded-lg p-6 sm:p-8"
              style={{
                background: "rgb(var(--cream))",
                border: "1px solid var(--line-strong)",
                boxShadow: "var(--soft-shadow)",
              }}
            >
              <h1 className="font-display text-3xl text-ink">Create your Crafty account</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Already have one?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold underline"
                  style={{ color: "rgb(var(--magenta))" }}
                >
                  Sign in
                </Link>
                .
              </p>

              <div className="mt-6">
                {DEV || !CONFIGURED ? (
                  <div
                    className="rounded-md p-4"
                    style={{
                      background: "var(--tint-mustard)",
                      border: "1px dashed var(--line-strong)",
                    }}
                  >
                    <p
                      className="font-display text-sm font-semibold"
                      style={{ color: "rgb(var(--ink))" }}
                    >
                      {DEV ? "Dev mode is active" : "Sign-up not configured yet"}
                    </p>
                    <p className="mt-1.5 text-sm" style={{ color: "rgb(var(--muted))" }}>
                      {DEV
                        ? "You're already signed in as the dev user. Set DEV_AUTH=false to test the real Descope flow here."
                        : "Set NEXT_PUBLIC_DESCOPE_PROJECT_ID in .env to enable real sign-up. The form will appear here once configured."}
                    </p>
                    {DEV && (
                      <Link
                        href={after}
                        className="btn btn-primary btn-sm mt-4 inline-block"
                      >
                        Continue to dashboard
                      </Link>
                    )}
                  </div>
                ) : (
                  <Descope
                    // Combined create-or-sign-in flow so an existing user who
                    // lands here and uses Google isn't rejected for already
                    // existing — same flow as /sign-in (Descope default).
                    flowId="sign-up-or-in"
                    theme="light"
                    themeOverride={craftyDescopeTheme as any}
                    redirectAfterSuccess={after}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </MaybeAuthProvider>
  );
}
