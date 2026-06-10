// PRD §16.3 + §26.1 — sitemap.xml generated at request time from DB.
// Lists all PUBLISHED entities across every active city.

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1h — refresh hourly so new listings appear in Google soon.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, crafters, stores, studios, events] = await Promise.all([
    prisma.city.findMany({ where: { is_active: true }, select: { slug: true } }),
    prisma.crafter.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updated_at: true, city: { select: { slug: true } } },
    }),
    prisma.store.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updated_at: true, city: { select: { slug: true } } },
    }),
    prisma.studio.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updated_at: true, city: { select: { slug: true } } },
    }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", end_at: { gte: new Date() } },
      select: { slug: true, updated_at: true, city: { select: { slug: true } } },
    }),
  ]);

  const u = (path: string): string => `${SITE_URL}${path}`;
  const now = new Date();

  const cityRoots: MetadataRoute.Sitemap = cities.flatMap((c) => [
    { url: u(`/${c.slug}`), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: u(`/${c.slug}/crafters`), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: u(`/${c.slug}/stores`), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: u(`/${c.slug}/learn`), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: u(`/${c.slug}/events`), lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ]);

  const detailPages: MetadataRoute.Sitemap = [
    ...crafters.map((c) => ({
      url: u(`/${c.city.slug}/crafters/${c.slug}`),
      lastModified: c.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...stores.map((s) => ({
      url: u(`/${s.city.slug}/stores/${s.slug}`),
      lastModified: s.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...studios.map((s) => ({
      url: u(`/${s.city.slug}/learn/${s.slug}`),
      lastModified: s.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...events.map((e) => ({
      url: u(`/${e.city.slug}/events/${e.slug}`),
      lastModified: e.updated_at,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  return [
    { url: u("/"), lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: u("/list-your-profile"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: u("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: u("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ...cityRoots,
    ...detailPages,
  ];
}
