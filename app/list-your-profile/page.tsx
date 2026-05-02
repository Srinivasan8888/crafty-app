import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { SafeImage } from "@/components/SafeImage";
import { ArrowRight } from "lucide-react";

// Editorial seed photo for the crafter hero — handmade pottery, warm light.
// SafeImage handles 404s with the branded cream-2/cream-3 fallback.
const CRAFTER_HERO_PHOTO =
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80&fit=crop&auto=format";

export default function ListYourProfile() {
  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12 md:py-16">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-display text-xs font-bold uppercase tracking-[3px] text-forest border-b border-mustard pb-1.5">
            List with Crafty
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl md:text-6xl">
            Get your craft{" "}
            <em className="font-semibold italic text-magenta">discovered</em>
          </h1>
          <p className="mt-5 text-lg text-ink-muted md:text-xl">
            Free to list. About five minutes to set up. Listings are
            city-localized so the right buyers find you.
          </p>
        </div>

        {/* Crafter — hero card */}
        <section className="mx-auto mt-12 max-w-5xl">
          <Link
            href="/dashboard/crafter/new"
            aria-label="Create a crafter profile"
            className="group relative block overflow-hidden rounded-xl border border-line-strong bg-cream-2 shadow-soft transition-shadow hover:shadow-soft-lg"
          >
            <div className="grid md:grid-cols-[1.1fr_1fr]">
              {/* Photo */}
              <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[360px]">
                <SafeImage
                  src={CRAFTER_HERO_PHOTO}
                  alt=""
                  fill
                  sizes="(min-width:768px) 55vw, 100vw"
                  className="object-cover"
                />
                {/* Soft cream overlay on the right edge for type contrast on md+ */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 hidden md:block"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0) 60%, rgb(var(--cream-2)) 100%)",
                  }}
                />
              </div>

              {/* Copy */}
              <div className="relative p-7 md:p-10">
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-5 top-5 text-[28px] opacity-55 text-mustard"
                >
                  ❋
                </span>
                <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
                  For crafters
                </p>
                <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-4xl">
                  I make and sell{" "}
                  <em className="font-semibold italic text-magenta">craft</em>
                </h2>
                <p className="mt-4 font-display text-base italic text-muted md:text-lg">
                  For the people <em>making things by hand</em> — sell handmade
                  goods, share a portfolio, take custom orders. Optional
                  classes block.
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <span className="btn btn-primary btn-lg group-hover:translate-x-[1px] transition-transform">
                    Create crafter profile <ArrowRight size={16} />
                  </span>
                </div>

                <p className="mt-4 text-xs text-ink-subtle">
                  Free, always. ~5 minutes. Goes live immediately.
                </p>
              </div>
            </div>
          </Link>
        </section>

        {/* Secondary — three smaller cards */}
        <section className="mx-auto mt-10 max-w-5xl">
          <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
            Or, list a place &amp; happenings
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SecondaryCard
              eyebrow="Supply store"
              title="I sell craft supplies"
              desc="Yarn, fabric, beads, tools — be findable when buyers search by city."
              href="/dashboard/store/new"
              cta="List store"
            />
            <SecondaryCard
              eyebrow="Studio / academy"
              title="I teach craft"
              desc="Class schedules, age groups, ongoing courses — for established teaching studios."
              href="/dashboard/studio/new"
              cta="List studio"
            />
            <SecondaryCard
              eyebrow="Event"
              title="I'm hosting something"
              desc="Workshops, fairs, pop-ups — linked to your crafter, store, or studio."
              href="/dashboard/events/new"
              cta="Host event"
            />
          </div>
        </section>

        {/* Footer link */}
        <p className="mx-auto mt-12 max-w-2xl text-center font-display text-sm italic text-muted">
          Already have an account?{" "}
          <Link
            href="/dashboard"
            className="not-italic font-semibold text-forest underline decoration-mustard decoration-[1.5px] underline-offset-4 hover:decoration-2"
          >
            Go to your dashboard →
          </Link>
        </p>
      </main>
      <AppFooter />
    </>
  );
}

function SecondaryCard({
  eyebrow,
  title,
  desc,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-line bg-cream p-5 transition-colors hover:border-line-strong hover:bg-cream-2"
    >
      <p className="font-display text-[11px] font-bold uppercase tracking-[2.5px] text-forest">
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-lg font-bold leading-tight tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest group-hover:gap-1.5 transition-all">
        {cta} <ArrowRight size={14} />
      </p>
    </Link>
  );
}
