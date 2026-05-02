import Link from "next/link";
import { Logo } from "./Logo";

export function AppFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-canvas-sunken">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-md text-sm text-ink-muted">
            India&apos;s craft community, one city at a time. Discover crafters,
            supply stores, studios and events near you.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Discover</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li><Link href="/bengaluru/crafters" className="hover:text-ink">Crafters</Link></li>
            <li><Link href="/bengaluru/stores" className="hover:text-ink">Stores</Link></li>
            <li><Link href="/bengaluru/learn" className="hover:text-ink">Learn</Link></li>
            <li><Link href="/bengaluru/events" className="hover:text-ink">Events</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li><Link href="/list-your-profile" className="hover:text-ink">List your profile</Link></li>
            <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-ink">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container flex h-12 items-center justify-between text-xs text-ink-subtle">
          <span>© {new Date().getFullYear()} Crafty · Dealquick Labs Pvt Ltd</span>
          <span>Made in Bengaluru</span>
        </div>
      </div>
    </footer>
  );
}
