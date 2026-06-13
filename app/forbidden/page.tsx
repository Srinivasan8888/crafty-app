import Link from "next/link";
import { Logo } from "@/components/Logo";

// PRD §23.1 — branded 403. Next 14 has no forbidden.tsx convention, so this is
// a plain route that auth guards redirect to when an authenticated user lacks
// permission (e.g. a non-admin hitting /admin). Mirrors not-found.tsx.
export const metadata = { title: "No access · Crafty" };

export default function Forbidden() {
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
          className="font-display font-extrabold leading-none tracking-tight"
          style={{ fontSize: "80px", letterSpacing: "-3px" }}
        >
          4<em className="italic font-semibold text-magenta">0</em>3
        </h1>
      </div>

      <p
        className="mt-3 font-display italic text-muted"
        style={{ fontSize: "22px" }}
      >
        This corner isn&apos;t yours to craft.
      </p>

      <p className="mt-4 max-w-md text-ink-muted leading-relaxed">
        You don&apos;t have access to this page. If you think you should, sign in
        with the right account — otherwise head back home.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/sign-in" className="btn btn-primary">
          Sign in
        </Link>
        <Link href="/" className="btn btn-ghost">
          Take me home
        </Link>
      </div>

      <p
        className="mt-12 font-display italic text-muted"
        style={{ fontSize: "13px" }}
      >
        Think this is a mistake?{" "}
        <Link
          href="/contact"
          className="not-italic font-semibold text-forest"
          style={{
            borderBottom: "1.5px solid rgb(var(--mustard))",
            paddingBottom: "1px",
          }}
        >
          let us know
        </Link>
        .
      </p>
    </main>
  );
}
