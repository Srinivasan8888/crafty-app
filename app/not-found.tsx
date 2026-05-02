import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-10">
        <Logo size="sm" />
      </div>

      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-4 text-[26px] opacity-55"
          style={{ color: "rgb(var(--mustard))" }}
        >
          ❋
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-2 text-[26px] opacity-50"
          style={{ color: "rgb(var(--magenta))" }}
        >
          ✿
        </span>
        <h1
          className="font-display font-extrabold leading-none tracking-tight"
          style={{ fontSize: "80px", letterSpacing: "-3px" }}
        >
          4<em className="italic font-semibold" style={{ color: "rgb(var(--magenta))" }}>0</em>4
        </h1>
      </div>

      <p
        className="mt-3 font-display italic"
        style={{ fontSize: "22px", color: "rgb(var(--muted))" }}
      >
        Looks like this craft got lost.
      </p>

      <p className="mt-4 max-w-md text-ink-muted leading-relaxed">
        We can&apos;t find what you&apos;re looking for. Maybe it never existed,
        or maybe it just got tucked away.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Take me home
        </Link>
        <Link href="/bengaluru/search" className="btn btn-ghost">
          Try search
        </Link>
      </div>

      <p
        className="mt-12 font-display italic"
        style={{ fontSize: "13px", color: "rgb(var(--muted))" }}
      >
        If you think this is a bug,{" "}
        <Link
          href="/contact"
          className="not-italic font-semibold"
          style={{
            color: "rgb(var(--forest))",
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
