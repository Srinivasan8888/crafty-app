import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <Logo />
      <h1 className="mt-6 text-5xl font-extrabold tracking-tight">404</h1>
      <p className="mt-3 max-w-md text-ink-muted">
        Looks like this craft got lost on the way here. Try the homepage and we&apos;ll get you back on track.
      </p>
      <Link href="/" className="btn btn-primary mt-6">Back to Crafty</Link>
    </div>
  );
}
