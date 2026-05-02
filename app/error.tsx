"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <Logo />
      <h1 className="mt-6 text-5xl font-extrabold tracking-tight">Something broke</h1>
      <p className="mt-3 max-w-md text-ink-muted">
        That&apos;s on us. We&apos;re looking into it. Try again, or head back to the homepage.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn">Try again</button>
        <Link href="/" className="btn btn-primary">Back to Crafty</Link>
      </div>
    </div>
  );
}
