import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Sparkles, Store, GraduationCap, Calendar } from "lucide-react";

export default function ListYourProfile() {
  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Get your craft <span className="text-accent">discovered</span>
          </h1>
          <p className="mt-4 text-lg text-ink-muted">
            Free to list. ~5 minutes to set up. Listings are city-localized so the right buyers find you.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          <Card icon={<Sparkles size={20} />} title="Crafter profile" desc="Sell handmade goods, share portfolio, take custom orders. Optional classes block." href="/dashboard/crafter/new" cta="Create crafter profile" />
          <Card icon={<Store size={20} />} title="Supply store" desc="Yarn, fabric, beads, tools — be findable when buyers search by city." href="/dashboard/store/new" cta="List your store" />
          <Card icon={<GraduationCap size={20} />} title="Studio / academy" desc="Established teaching studios. Class schedules, age groups, ongoing courses." href="/dashboard/studio/new" cta="List your studio" />
          <Card icon={<Calendar size={20} />} title="Event" desc="Workshops, fairs, pop-ups. Linked to your crafter, store, or studio profile." href="/dashboard/events/new" cta="Host an event" />
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-ink-subtle">
          Already have an account? <Link href="/dashboard" className="text-accent hover:underline">Go to your dashboard →</Link>
        </p>
      </main>
      <AppFooter />
    </>
  );
}

function Card({ icon, title, desc, href, cta }: { icon: React.ReactNode; title: string; desc: string; href: string; cta: string }) {
  return (
    <Link href={href} className="card card-hover p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">{icon}</div>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-ink-muted">{desc}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">{cta} →</p>
    </Link>
  );
}
