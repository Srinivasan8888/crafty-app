/* eslint-disable no-console */
import { PrismaClient, EventType } from "@prisma/client";

const prisma = new PrismaClient();

const CITIES = [
  { slug: "bengaluru", display_name: "Bengaluru", display_order: 1 },
  { slug: "mumbai",    display_name: "Mumbai",    display_order: 2 },
  { slug: "delhi",     display_name: "Delhi NCR", display_order: 3 },
  { slug: "hyderabad", display_name: "Hyderabad", display_order: 4 },
  { slug: "chennai",   display_name: "Chennai",   display_order: 5 },
  { slug: "pune",      display_name: "Pune",      display_order: 6 },
];

const CRAFT_CATS = [
  "Crochet", "Knitting", "Embroidery", "Macrame", "Pottery", "Painting",
  "Jewellery", "Paper Craft", "Resin Art", "Wood Craft", "Fiber Art", "Other",
];

const SUPPLY_CATS = [
  "Yarn", "Fabric", "Beads", "Tools", "Paper", "Paint",
  "Clay", "Embroidery Supplies", "Wood", "Other",
];

const DISCIPLINES = [
  "Pottery", "Painting", "Jewellery", "Sketching", "Calligraphy",
  "Sculpture", "Textile Arts", "Mixed Media", "Other",
];

// Photo URLs — picsum.photos with a per-slug deterministic seed.
// Picsum never 404s (unlike hotlinked Unsplash photo IDs), and a unique
// seed per listing guarantees no two listings share an image. Topical
// matching (yarn store → yarn photo) is deferred to V1.5 when real
// owner-uploaded photos arrive.
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PHOTO = (seed: string, w = 800, h?: number) =>
  `https://picsum.photos/seed/${slugify(seed)}/${w}/${h ?? Math.round(w * 0.75)}`;

const CRAFTERS_BLR = [
  { name: "Aisha Crochet", tagline: "Hand-crocheted heirlooms from Indiranagar", bio: "Ex-IT, full-time crocheter since 2022. Custom orders, runs Sunday meetups at Cubbon Park.", cats: ["Crochet", "Fiber Art"], contact_instagram: "@aishacrochet", contact_whatsapp: "+91-98865-44321" },
  { name: "Studio Mehendi", tagline: "Bridal henna + craft workshops", bio: "10+ years of bridal henna. Now also teaching weekend block-printing.", cats: ["Painting", "Other"], contact_instagram: "@studiomehendi" },
  { name: "Clayful Bengaluru", tagline: "Stoneware planters, hand-thrown", bio: "Whitefield home studio. Stoneware planters, garden ware, custom orders.", cats: ["Pottery"], contact_whatsapp: "+91-99000-12345", contact_website: "https://example.com/clayful" },
  { name: "Threadwork by Reema", tagline: "Modern embroidery on linen", bio: "Linen wall hangings, embroidered apparel. Ships PAN-India.", cats: ["Embroidery"], contact_instagram: "@threadworkrm" },
  { name: "Bead & Bloom", tagline: "Boho jewellery, handmade in Koramangala", bio: "Brass + glass-bead jewellery, with a little resin on the side.", cats: ["Jewellery", "Resin Art"], contact_instagram: "@beadandbloom" },
  { name: "Paper Crane Co.", tagline: "Origami, paper sculpture, and stationery", bio: "Origami workshops + bespoke wedding stationery from Jayanagar.", cats: ["Paper Craft"], contact_instagram: "@papercranebgl", contact_website: "https://example.com/papercrane" },
];

const CRAFTERS_MUM = [
  { name: "Mumbai Macrame Lab", tagline: "Wall art, plant hangers, custom commissions", bio: "Bandra-based, makes for cafes and homes across Mumbai.", cats: ["Macrame"] },
  { name: "Resin Roopa", tagline: "Resin coasters, trays, jewellery", bio: "Andheri studio. Custom name plates and corporate gifting.", cats: ["Resin Art", "Jewellery"] },
];

const STORES_BLR = [
  { name: "Krishnan Yarns", address: "Commercial Street, near Brigade Rd", cats: ["Yarn", "Embroidery Supplies"], contact_phone: "+91-80-2558-1010" },
  { name: "Sripriya Beads & Co", address: "Jayanagar 4th Block", cats: ["Beads", "Tools"] },
  { name: "Hobby Ideas BLR", address: "Forum Mall, Koramangala", cats: ["Paper", "Paint", "Tools"], contact_website: "https://example.com/hobbyideas" },
  { name: "Whitefield Clay Mart", address: "ITPL Main Road, Whitefield", cats: ["Clay", "Tools"] },
];

const STORES_MUM = [
  { name: "Bandra Yarn Bar", address: "Linking Road, Bandra West", cats: ["Yarn", "Embroidery Supplies"] },
];

const STUDIOS_BLR = [
  { name: "Anjali's Pottery Studio", address: "Whitefield, near Phoenix Marketcity", disciplines: ["Pottery", "Sculpture"], age_group: "Adults & Teens", contact_website: "https://example.com/anjali-pottery" },
  { name: "Inkblot Art Academy", address: "HSR Layout, 27th Main", disciplines: ["Painting", "Sketching", "Calligraphy"], age_group: "Kids 8+" },
  { name: "Loom & Thread", address: "Indiranagar 100ft Road", disciplines: ["Textile Arts", "Mixed Media"], age_group: "Adults" },
];

const STUDIOS_MUM = [
  { name: "Powai Paint House", address: "Hiranandani Gardens, Powai", disciplines: ["Painting", "Sketching"], age_group: "All ages" },
];

async function main() {
  console.log("→ wiping & re-seeding crafty_dev");

  // Truncate everything in dependency order
  await prisma.flag.deleteMany();
  await prisma.save.deleteMany();
  await prisma.event.deleteMany();
  await prisma.craftCategoryOnCrafter.deleteMany();
  await prisma.supplyCategoryOnStore.deleteMany();
  await prisma.disciplineOnStudio.deleteMany();
  await prisma.crafter.deleteMany();
  await prisma.store.deleteMany();
  await prisma.studio.deleteMany();
  await prisma.user.deleteMany();
  await prisma.craftCategory.deleteMany();
  await prisma.supplyCategory.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.city.deleteMany();
  await prisma.slugRedirect.deleteMany();

  // Cities
  for (const c of CITIES) await prisma.city.create({ data: c });
  const blr = (await prisma.city.findUnique({ where: { slug: "bengaluru" } }))!;
  const mum = (await prisma.city.findUnique({ where: { slug: "mumbai" } }))!;

  // Categories
  for (let i = 0; i < CRAFT_CATS.length; i++) {
    await prisma.craftCategory.create({
      data: { slug: CRAFT_CATS[i].toLowerCase().replace(/\s+/g, "-"), display_name: CRAFT_CATS[i], display_order: i },
    });
  }
  for (let i = 0; i < SUPPLY_CATS.length; i++) {
    await prisma.supplyCategory.create({
      data: { slug: SUPPLY_CATS[i].toLowerCase().replace(/\s+/g, "-"), display_name: SUPPLY_CATS[i], display_order: i },
    });
  }
  for (let i = 0; i < DISCIPLINES.length; i++) {
    await prisma.discipline.create({
      data: { slug: DISCIPLINES[i].toLowerCase().replace(/\s+/g, "-"), display_name: DISCIPLINES[i], display_order: i },
    });
  }

  // Founder admin (the dev-stub user; starts with NO listings so they can test the create flow)
  await prisma.user.create({
    data: {
      email: process.env.DEV_USER_EMAIL || "pavithran7777@gmail.com",
      display_name: "Pavithran",
      role: "ADMIN",
      is_admin: true,
    },
  });

  // T7 — Second-in-Command admin per PRD §12.4. Seeded so the launch never
  // ships with a single point of failure on moderation/curation. Replace
  // SIC_ADMIN_EMAIL in .env with the actual SiC once identified (Week 4
  // deliverable per the design doc). Defaults to a clearly-placeholder email
  // so a misconfigured deploy is obvious. Responsibilities documented in
  // docs/operations.md.
  const sicEmail = process.env.SIC_ADMIN_EMAIL || "sic-placeholder@crafty.app";
  await prisma.user.create({
    data: {
      email: sicEmail,
      display_name: process.env.SIC_ADMIN_NAME || "SiC (placeholder)",
      role: "ADMIN",
      is_admin: true,
    },
  });
  // Seed-bot owns all seeded listings, so the founder dashboard starts empty.
  const admin = await prisma.user.create({
    data: {
      email: "seed-bot@crafty.app",
      display_name: "Crafty Seed",
      role: "CREATOR",
      is_admin: false,
    },
  });

  // Crafters
  const allCraftCats = await prisma.craftCategory.findMany();
  const catBySlug = new Map(allCraftCats.map((c) => [c.display_name, c.id]));
  for (const c of CRAFTERS_BLR) {
    const slug = slugify(c.name);
    const created = await prisma.crafter.create({
      data: {
        slug,
        owner_user_id: admin.id,
        name: c.name,
        tagline: c.tagline,
        bio: c.bio,
        city_id: blr.id,
        profile_photo: PHOTO(`crafter-${slug}`, 600),
        portfolio_photos: [PHOTO(`crafter-${slug}-portfolio-1`, 1000), PHOTO(`crafter-${slug}-portfolio-2`, 1000)],
        contact_whatsapp: c.contact_whatsapp,
        contact_instagram: c.contact_instagram,
        contact_website: c.contact_website,
        offers_classes: c.cats.includes("Crochet") || c.cats.includes("Pottery"),
        is_featured: c.name.startsWith("Aisha"),
      },
    });
    for (const catName of c.cats) {
      const cid = catBySlug.get(catName);
      if (cid) await prisma.craftCategoryOnCrafter.create({ data: { crafter_id: created.id, category_id: cid } });
    }
  }
  for (const c of CRAFTERS_MUM) {
    const slug = slugify(c.name);
    const created = await prisma.crafter.create({
      data: {
        slug,
        owner_user_id: admin.id,
        name: c.name,
        tagline: c.tagline,
        bio: c.bio,
        city_id: mum.id,
        profile_photo: PHOTO(`crafter-${slug}`, 600),
        portfolio_photos: [PHOTO(`crafter-${slug}-portfolio-1`, 1000)],
        contact_instagram: "@" + c.name.toLowerCase().replace(/\s+/g, ""),
      },
    });
    for (const catName of c.cats) {
      const cid = catBySlug.get(catName);
      if (cid) await prisma.craftCategoryOnCrafter.create({ data: { crafter_id: created.id, category_id: cid } });
    }
  }

  // Stores
  const allSupply = await prisma.supplyCategory.findMany();
  const supplyByName = new Map(allSupply.map((s) => [s.display_name, s.id]));
  for (const s of STORES_BLR) {
    const slug = slugify(s.name);
    const created = await prisma.store.create({
      data: {
        slug,
        owner_user_id: null,        // admin pre-populated, unclaimed
        is_claimed: false,
        name: s.name,
        logo_photo: PHOTO(`store-${slug}`, 600),
        city_id: blr.id,
        address: s.address,
        contact_phone: s.contact_phone,
        contact_website: s.contact_website,
      },
    });
    for (const sc of s.cats) {
      const id = supplyByName.get(sc);
      if (id) await prisma.supplyCategoryOnStore.create({ data: { store_id: created.id, category_id: id } });
    }
  }
  for (const s of STORES_MUM) {
    const slug = slugify(s.name);
    const created = await prisma.store.create({
      data: {
        slug,
        owner_user_id: null,
        is_claimed: false,
        name: s.name,
        logo_photo: PHOTO(`store-${slug}`, 600),
        city_id: mum.id,
        address: s.address,
      },
    });
    for (const sc of s.cats) {
      const id = supplyByName.get(sc);
      if (id) await prisma.supplyCategoryOnStore.create({ data: { store_id: created.id, category_id: id } });
    }
  }

  // Studios
  const allDisc = await prisma.discipline.findMany();
  const discByName = new Map(allDisc.map((d) => [d.display_name, d.id]));
  for (const st of STUDIOS_BLR) {
    const slug = slugify(st.name);
    const created = await prisma.studio.create({
      data: {
        slug,
        owner_user_id: null,
        is_claimed: false,
        name: st.name,
        logo_photo: PHOTO(`studio-${slug}`, 600),
        city_id: blr.id,
        address: st.address,
        age_group: st.age_group,
        contact_website: st.contact_website,
      },
    });
    for (const d of st.disciplines) {
      const id = discByName.get(d);
      if (id) await prisma.disciplineOnStudio.create({ data: { studio_id: created.id, discipline_id: id } });
    }
  }
  for (const st of STUDIOS_MUM) {
    const slug = slugify(st.name);
    const created = await prisma.studio.create({
      data: {
        slug,
        owner_user_id: null,
        is_claimed: false,
        name: st.name,
        logo_photo: PHOTO(`studio-${slug}`, 600),
        city_id: mum.id,
        address: st.address,
        age_group: st.age_group,
      },
    });
    for (const d of st.disciplines) {
      const id = discByName.get(d);
      if (id) await prisma.disciplineOnStudio.create({ data: { studio_id: created.id, discipline_id: id } });
    }
  }

  // Events — link to a crafter/store/studio organizer (Issue 1.2 — exactly one)
  const aisha = await prisma.crafter.findUnique({ where: { slug: "aisha-crochet" } });
  const krishnan = await prisma.store.findUnique({ where: { slug: "krishnan-yarns" } });
  const anjali = await prisma.studio.findUnique({ where: { slug: "anjali-s-pottery-studio" } });

  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 86400_000);
  // Find the next Sunday from today (>=1 day away) and set a specific time-of-day on it.
  // Used by the Cubbon meetup so it always falls on a Sunday morning, never 1:29am.
  const nextSundayAt = (hour: number, minute = 0) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const daysUntilSun = (7 - d.getDay()) % 7 || 7; // never today (avoid past time-of-day issues)
    d.setDate(d.getDate() + daysUntilSun);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const meetupStart = nextSundayAt(10, 0);
  const meetupEnd = nextSundayAt(12, 0);

  const events = [
    {
      organizer_crafter_id: aisha?.id, name: "Sunday Cubbon Crochet Meetup",
      description: "Free open meetup. Bring your hooks, stay for the chai. Beginner-friendly.",
      start_at: meetupStart, end_at: meetupEnd, city_id: blr.id,
      venue_name: "Cubbon Park", venue_address: "Cubbon Park, near Hudson Circle",
      event_type: EventType.POPUP, is_free: true,
      registration_url: "https://example.com/cubbon-meetup",
      cover_image: PHOTO("event-sunday-cubbon-crochet-meetup", 1200, 800),
    },
    {
      organizer_store_id: krishnan?.id, name: "Yarn 101: Picking Your First Wool",
      description: "Free in-store workshop with chai. Mr. Krishnan walks you through fibers, gauges, and projects to start with.",
      start_at: inDays(10), end_at: inDays(10 + 0.08), city_id: blr.id,
      venue_name: "Krishnan Yarns Store", venue_address: "Commercial Street, near Brigade Rd",
      event_type: EventType.WORKSHOP, is_free: true,
      registration_url: "https://example.com/yarn-101",
      cover_image: PHOTO("event-yarn-101-picking-your-first-wool", 1200, 800),
    },
    {
      organizer_studio_id: anjali?.id, name: "Beginner's Wheel-Throwing Class",
      description: "3-hour intro to the pottery wheel. All materials included. Limited to 8 students.",
      start_at: inDays(14), end_at: inDays(14 + 0.13), city_id: blr.id,
      venue_name: "Anjali's Pottery Studio", venue_address: "Whitefield, near Phoenix Marketcity",
      event_type: EventType.CLASS, is_free: false, price_amount: 1800 as unknown as number,
      registration_url: "https://example.com/wheel-throwing",
      cover_image: PHOTO("event-beginners-wheel-throwing-class", 1200, 800),
    },
    {
      organizer_crafter_id: aisha?.id, name: "Holiday Craft Fair @ Indiranagar",
      description: "Weekend pop-up fair. 30+ crafters. Free entry. Pet-friendly.",
      start_at: inDays(21), end_at: inDays(22), city_id: blr.id,
      venue_name: "100ft Boulevard, Indiranagar", venue_address: "Indiranagar 100ft Road",
      event_type: EventType.FAIR, is_free: true,
      registration_url: "https://example.com/indiranagar-fair",
      cover_image: PHOTO("event-holiday-craft-fair-indiranagar", 1200, 800),
    },
  ];
  for (const e of events) {
    if (!e.organizer_crafter_id && !e.organizer_store_id && !e.organizer_studio_id) continue;
    await prisma.event.create({
      data: {
        slug: e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        organizer_user_id: admin.id,
        organizer_crafter_id: e.organizer_crafter_id,
        organizer_store_id: e.organizer_store_id,
        organizer_studio_id: e.organizer_studio_id,
        name: e.name,
        description: e.description,
        cover_image: e.cover_image,
        start_at: e.start_at,
        end_at: e.end_at,
        city_id: e.city_id,
        venue_name: e.venue_name,
        venue_address: e.venue_address,
        event_type: e.event_type,
        is_free: e.is_free,
        price_amount: e.price_amount as unknown as undefined,
        registration_url: e.registration_url,
      },
    });
  }

  console.log("✓ Seeded:");
  console.log("  cities:", await prisma.city.count());
  console.log("  craft cats:", await prisma.craftCategory.count());
  console.log("  supply cats:", await prisma.supplyCategory.count());
  console.log("  disciplines:", await prisma.discipline.count());
  console.log("  crafters:", await prisma.crafter.count());
  console.log("  stores:", await prisma.store.count());
  console.log("  studios:", await prisma.studio.count());
  console.log("  events:", await prisma.event.count());
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
