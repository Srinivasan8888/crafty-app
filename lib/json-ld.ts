// PRD §16.3 — schema.org JSON-LD builders for entity detail pages.
//
// Renderers below return plain JS objects; the calling page serializes them
// inside a <script type="application/ld+json"> tag. We don't include @context
// on every nested object — only at the root — which is the schema.org idiom.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function buildCrafterJsonLd(c: {
  name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  profile_photo: string;
  contact_whatsapp: string | null;
  contact_instagram: string | null;
  contact_website: string | null;
  city: { display_name: string; slug: string };
  craft_categories: { category: { display_name: string } }[];
}) {
  const sameAs: string[] = [];
  if (c.contact_instagram) {
    const handle = c.contact_instagram.replace(/^@/, "");
    sameAs.push(`https://instagram.com/${handle}`);
  }
  if (c.contact_website) sameAs.push(c.contact_website);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/${c.city.slug}/crafters/${c.slug}`,
    name: c.name,
    description: c.bio ?? c.tagline ?? `${c.name} on Crafty.`,
    image: absoluteUrl(c.profile_photo),
    url: `${SITE_URL}/${c.city.slug}/crafters/${c.slug}`,
    address: { "@type": "PostalAddress", addressLocality: c.city.display_name, addressCountry: "IN" },
    telephone: c.contact_whatsapp ?? undefined,
    knowsAbout: c.craft_categories.map((j) => j.category.display_name),
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

export function buildStoreJsonLd(s: {
  name: string;
  slug: string;
  logo_photo: string;
  address: string;
  is_online_only: boolean;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_website: string | null;
  city: { display_name: string; slug: string };
  supply_categories: { category: { display_name: string } }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/${s.city.slug}/stores/${s.slug}`,
    name: s.name,
    image: absoluteUrl(s.logo_photo),
    url: `${SITE_URL}/${s.city.slug}/stores/${s.slug}`,
    address: s.is_online_only
      ? undefined
      : {
          "@type": "PostalAddress",
          streetAddress: s.address,
          addressLocality: s.city.display_name,
          addressCountry: "IN",
        },
    telephone: s.contact_phone ?? s.contact_whatsapp ?? undefined,
    sameAs: s.contact_website ? [s.contact_website] : undefined,
    keywords: s.supply_categories.map((j) => j.category.display_name).join(", ") || undefined,
  };
}

export function buildStudioJsonLd(s: {
  name: string;
  slug: string;
  logo_photo: string;
  address: string;
  is_online_only: boolean;
  age_group: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_website: string | null;
  city: { display_name: string; slug: string };
  craft_disciplines: { discipline: { display_name: string } }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE_URL}/${s.city.slug}/learn/${s.slug}`,
    name: s.name,
    image: absoluteUrl(s.logo_photo),
    url: `${SITE_URL}/${s.city.slug}/learn/${s.slug}`,
    address: s.is_online_only
      ? undefined
      : {
          "@type": "PostalAddress",
          streetAddress: s.address,
          addressLocality: s.city.display_name,
          addressCountry: "IN",
        },
    telephone: s.contact_phone ?? s.contact_whatsapp ?? undefined,
    sameAs: s.contact_website ? [s.contact_website] : undefined,
    audience: s.age_group ? { "@type": "EducationalAudience", educationalRole: s.age_group } : undefined,
    teaches: s.craft_disciplines.map((j) => j.discipline.display_name),
  };
}

export function buildEventJsonLd(e: {
  name: string;
  slug: string;
  description: string;
  cover_image: string;
  start_at: Date;
  end_at: Date;
  venue_name: string;
  venue_address: string | null;
  is_online: boolean;
  is_free: boolean;
  price_amount: any;
  registration_url: string;
  city: { display_name: string; slug: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${SITE_URL}/${e.city.slug}/events/${e.slug}`,
    name: e.name,
    description: e.description,
    image: absoluteUrl(e.cover_image),
    url: `${SITE_URL}/${e.city.slug}/events/${e.slug}`,
    startDate: e.start_at.toISOString(),
    endDate: e.end_at.toISOString(),
    eventAttendanceMode: e.is_online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: e.is_online
      ? {
          "@type": "VirtualLocation",
          url: e.registration_url,
        }
      : {
          "@type": "Place",
          name: e.venue_name,
          address: {
            "@type": "PostalAddress",
            streetAddress: e.venue_address ?? e.venue_name,
            addressLocality: e.city.display_name,
            addressCountry: "IN",
          },
        },
    offers: {
      "@type": "Offer",
      url: e.registration_url,
      price: e.is_free ? "0" : String(e.price_amount ?? "0"),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      validFrom: new Date().toISOString(),
    },
  };
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path}`;
}

/** Serialize a JSON-LD object for safe embedding. Strips </script>. */
export function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
