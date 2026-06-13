// PRD §7.12 / §6.1 — contact + report entry point.
//
// Default: a way to reach support. With ?ref=report&type=&slug= (the link the
// detail pages send), it resolves the listing and renders a working report
// form that posts to /api/flags — closing the dead-end the mailto-only page
// used to be.
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Mail } from "lucide-react";
import { prisma } from "@/lib/db";
import { ReportForm } from "@/components/ReportForm";
import type { EntityType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_MAP: Record<string, { entityType: EntityType; label: string }> = {
  crafter: { entityType: "CRAFTER", label: "crafter" },
  store: { entityType: "STORE", label: "store" },
  studio: { entityType: "STUDIO", label: "studio" },
  event: { entityType: "EVENT", label: "event" },
};

async function resolveEntity(type: string, slug: string): Promise<{ id: string; name: string } | null> {
  const where = { slug, status: "PUBLISHED" as const };
  const select = { id: true, name: true };
  switch (type) {
    case "crafter": return prisma.crafter.findFirst({ where, select });
    case "store": return prisma.store.findFirst({ where, select });
    case "studio": return prisma.studio.findFirst({ where, select });
    case "event": return prisma.event.findFirst({ where, select });
    default: return null;
  }
}

export default async function Contact({
  searchParams,
}: {
  searchParams: { ref?: string; type?: string; slug?: string };
}) {
  const isReport = searchParams.ref === "report" && !!searchParams.type && !!searchParams.slug;
  const mapped = isReport ? TYPE_MAP[searchParams.type!] : null;
  const entity = isReport && mapped ? await resolveEntity(searchParams.type!, searchParams.slug!) : null;

  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12">
        {isReport && mapped && entity ? (
          <div className="mx-auto max-w-xl card p-8">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Report this {mapped.label}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              You&apos;re reporting <strong className="text-ink">{entity.name}</strong>. Reports are private and reviewed by our moderation team — the listing stays up while we look into it.
            </p>
            <ReportForm entityType={mapped.entityType} entityId={entity.id} entityName={entity.name} />
          </div>
        ) : isReport ? (
          <div className="mx-auto max-w-xl card p-8 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">Listing not found</h1>
            <p className="mt-3 text-sm text-ink-muted">
              We couldn&apos;t find the listing you&apos;re trying to report — it may have been removed or unpublished. If something still looks wrong, email us.
            </p>
            <a href="mailto:hello@crafty.app" className="btn btn-primary mt-6 inline-flex">
              <Mail size={16} /> hello@crafty.app
            </a>
          </div>
        ) : (
          <div className="mx-auto max-w-xl card p-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">Get in touch</h1>
            <p className="mt-3 text-sm text-ink-muted">
              Questions, claims, or partnership ideas — drop us a line and we&apos;ll get back to you.
            </p>
            <a
              href="mailto:hello@crafty.app?subject=Hello%20Crafty"
              className="btn btn-primary mt-6 inline-flex"
            >
              <Mail size={16} /> hello@crafty.app
            </a>
            <p className="mt-4 text-xs text-ink-subtle">
              To report a specific listing, use the “Report this listing” link on its page.
            </p>
          </div>
        )}
      </main>
      <AppFooter />
    </>
  );
}
