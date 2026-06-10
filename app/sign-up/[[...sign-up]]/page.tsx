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
  const after = searchParams.redirect_url || "/dashboard";
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
          <h1 className="font-display text-3xl text-ink">Create your Crafty account</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Already have one? <Link href="/sign-in" className="underline">Sign in</Link>.
          </p>
          <div className="mt-6">
            {DEV || !CONFIGURED ? (
              <p className="rounded-md border border-line bg-canvas-sunken p-4 text-sm text-ink-muted">
                {DEV
                  ? "Dev mode active — you're already signed in as the dev user. Set DEV_AUTH=false to test Descope."
                  : "Descope project not configured yet. Set NEXT_PUBLIC_DESCOPE_PROJECT_ID in .env to enable real sign-up."}
              </p>
            ) : (
              <Descope
                flowId="sign-up"
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
