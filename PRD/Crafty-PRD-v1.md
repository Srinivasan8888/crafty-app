# Crafty — Product Requirements Document (V1.0)

**Product:** Crafty — Craft Discovery & Community Platform
**Version:** 1.0 (MVP)
**Status:** PRD — Ready for Development
**Owner:** Pavithran Chinnusamy (Director, Dealquick Labs Pvt Ltd)
**Date:** 01 May 2026
**Domain:** [crafty.app](https://crafty.app)
**Confidentiality:** Internal — Crafty Team & Build Partners

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision, Mission & Strategy](#2-product-vision-mission--strategy)
3. [Goals, Non-Goals & Success Metrics](#3-goals-non-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [User Stories & Jobs-To-Be-Done](#5-user-stories--jobs-to-be-done)
6. [Information Architecture](#6-information-architecture)
7. [Feature Specifications](#7-feature-specifications)
8. [User Flows](#8-user-flows)
9. [Tech Stack & Architecture](#9-tech-stack--architecture)
10. [System Architecture & Data Flow](#10-system-architecture--data-flow)
11. [Data Model](#11-data-model)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Object Storage & Media Pipeline](#13-object-storage--media-pipeline)
14. [Search](#14-search)
15. [Email (Transactional)](#15-email-transactional)
16. [Analytics, Tracking & SEO](#16-analytics-tracking--seo)
17. [Design System (Gumroad-Based)](#17-design-system-gumroad-based)
18. [Responsive Strategy — Mobile-First Discovery, Web-First Creation](#18-responsive-strategy)
19. [Performance Requirements](#19-performance-requirements)
20. [Security Requirements](#20-security-requirements)
21. [Privacy, Legal & Compliance](#21-privacy-legal--compliance)
22. [Accessibility](#22-accessibility)
23. [Error Handling & Empty States](#23-error-handling--empty-states)
24. [Admin & Moderation](#24-admin--moderation)
25. [Notifications](#25-notifications)
26. [Release Plan & Roadmap](#26-release-plan--roadmap)
27. [Risks & Mitigations](#27-risks--mitigations)
28. [Open Questions & Decisions Log](#28-open-questions--decisions-log)
29. [Appendix](#29-appendix)

---

## 1. Executive Summary

**Crafty** is India's first city-localized discovery and community platform for the handmade craft ecosystem. It connects four interlinked groups under one roof:

1. **Crafters** — hobbyists and professionals who make and sell handmade goods
2. **Stores** — shops that sell craft supplies and tools (physical & online)
3. **Learn** — dedicated studios, schools and academies that teach art and craft
4. **Events** — workshops, fairs, exhibitions, pop-ups, and classes

The V1 product is a **mobile-first discovery experience** for buyers, paired with a **web-first creator/admin dashboard** for crafters, store owners, studios and platform operators. The homepage defaults to **Bengaluru** and is localized by city; users can switch cities to discover crafters, supply stores, learning institutes and upcoming events near them.

Crafty's V1 is a **directory + light social** product (heart/save, profile pages, off-platform contact and event registration). Transactions, on-platform messaging, and reviews are explicitly out of scope for V1.

**Build platform:** Replit (full-stack hosting, Postgres DB, object storage, custom domain). **Auth:** Clerk. **Email:** Resend. **Design:** Gumroad Design System (Figma).

---

## 2. Product Vision, Mission & Strategy

### 2.1 Vision
> To be the go-to discovery hub for India's craft community — every crafter, store, studio, and event findable in every city.

### 2.2 Mission
Help India's handmade-craft ecosystem flourish by giving crafters visibility, supply stores reach, studios students, and buyers a single trusted place to discover them — starting in Bengaluru and expanding city by city.

### 2.3 Why Now
- WhatsApp-based craft communities (Crafty Bengaluru, Cubbon meetups) have organically grown but discovery is fragmented across Instagram, WhatsApp groups, word-of-mouth.
- Indian handmade economy is rising in tier-1 cities (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Chennai, Pune).
- No dominant player owns local craft discovery — Etsy is global/transactional, Instagram is content-not-discovery, Justdial is generic.

### 2.4 Strategic Bets
| Bet | Why |
|-----|-----|
| Mobile-first for buyers | Discovery is impulsive and overwhelmingly happens on phones in India |
| Web-first for sellers | Listing creation, image uploads, event setup demand richer UI |
| City-localized homepage | Crafts and crafters are local first; no global feed in V1 |
| Free V1 | Build supply (crafters, stores, studios) and demand (buyers) before monetization |
| Off-platform transactions | Reduce build cost, defer payment-gateway work to V2 |

### 2.5 V1 Out-of-Scope
- On-platform transactions, payments, escrow
- Reviews and ratings
- On-platform DM / messaging
- Mobile native apps (iOS/Android)
- Recurring/multi-instance events
- Per-product category filtering
- Cross-city search
- Marketing emails, onboarding email sequences
- API for third parties
- Multi-language UI (English-only V1)

---

## 3. Goals, Non-Goals & Success Metrics

### 3.1 Goals (V1)
1. Launch a discoverable, indexable, city-localized directory for Bengaluru by [Launch Date].
2. Onboard **150+ crafters**, **40+ supply stores**, **20+ studios/academies**, and **30+ live upcoming events** in Bengaluru in the first 90 days.
3. Hit **5,000+ MAU (Monthly Active Visitors)** within the first 90 days.
4. Maintain **<3s LCP** on standard 4G mobile in India.
5. Achieve **>70% week-1 task completion** for creators (signup → listing live).

### 3.2 North Star Metric
**Weekly Active Discovery Sessions** — number of unique users who view ≥3 listing/profile/event pages per week. Combines acquisition + engagement + relevance.

### 3.3 Leading Indicators
- Listings created per week (supply side)
- Heart/save events per week (engagement)
- Click-throughs to creator contact info (intent)
- Events with ≥1 view in their city (event utility)

### 3.4 Lagging Indicators
- MAU / WAU
- 30-day retention (visitors who return)
- Domain rating / organic search traffic (SEO)
- Number of cities with ≥10 listings (geographic depth)

### 3.5 Non-Goals
- Revenue. Crafty V1 is free for all entity types. No ads, no commissions, no listing fees.
- Best-in-class search relevance. V1 uses simple Postgres full-text search.
- Mobile apps. Mobile web is the V1 mobile experience.

---

## 4. User Personas

### 4.1 Buyer / Discoverer ("Priya, 28, marketing manager, Bengaluru")
- **Behavior:** Scrolls Instagram for handmade gift ideas, follows craft accounts, lurks in WhatsApp groups, attends Cubbon meetups occasionally.
- **Goals:** Find a crochet artist nearby, discover a new Sunday workshop, locate yarn supply stores in Indiranagar.
- **Pain Points:** Discovery is fragmented; can't find what's local; Instagram doesn't tell you who ships in India.
- **Device:** 95% mobile (Android/iOS Chrome/Safari). Rare desktop.
- **Conversion Trigger:** Wants to save a crafter she likes; we prompt sign-in.

### 4.2 Hobbyist Crafter Turned Seller ("Aisha, 32, ex-IT, sells crochet on weekends")
- **Behavior:** Sells via Instagram DMs, attends Cubbon Park crafty meetups, gets paid via UPI.
- **Goals:** Get discovered beyond her Instagram circle, list weekend workshops she runs at home, gain credibility.
- **Pain Points:** Instagram algorithm hides her from local audiences; no way to get found by city.
- **Device:** Both phone (browse) and laptop (uploading detailed product photos, writing bios).
- **Conversion Trigger:** "List Your Profile" CTA on the homepage.

### 4.3 Supply Store Owner ("Mr. Krishnan, 55, runs a yarn shop in Commercial Street")
- **Behavior:** Walk-in customers, no website, accepts orders via WhatsApp, doesn't trust digital ads.
- **Goals:** Be findable when someone searches for "yarn in Bengaluru" without paying for ads.
- **Pain Points:** Tech intimidation, English not first language, doesn't have time to maintain a profile.
- **Device:** Smartphone primary; staff manages digital presence.
- **Conversion Trigger:** Either self-registers, or admin pre-populates and he claims via email.

### 4.4 Studio / Academy Operator ("Anjali, 40, runs a pottery studio in Whitefield")
- **Behavior:** Posts class schedules on Instagram, runs WhatsApp groups for students, hosts open studio events.
- **Goals:** Steady stream of new students; dedicated audience for special workshops and events.
- **Pain Points:** Hard to reach beyond word-of-mouth and Instagram followers.
- **Device:** Laptop for managing schedule and posting events; phone for replies.
- **Conversion Trigger:** Event creation flow — wants to promote a one-off pottery workshop.

### 4.5 Event Organizer / Community Lead ("Rahul, 30, runs Crafty Bengaluru Cubbon meetups")
- **Behavior:** Hosts free Sunday meetups, posts event details in WhatsApp, coordinates with crafters and supply stores.
- **Goals:** Promote upcoming meetups beyond the WhatsApp group; help crafters in the group get discovered.
- **Device:** Both, with heavy mobile usage.
- **Conversion Trigger:** Add an event tied to his crafter profile (or unaffiliated org profile).

### 4.6 Crafty Admin (Internal — Pavithran + delegates)
- **Behavior:** Curate listings, pre-populate stores/studios from public data, moderate flags.
- **Goals:** Keep the directory clean, accurate, spam-free; ramp coverage city by city.
- **Device:** Laptop, web-first.

---

## 5. User Stories & Jobs-To-Be-Done

### 5.1 Buyer Stories
- *As a buyer in Bengaluru, I want to see all crochet artists in my city so I can pick someone to commission a custom piece.*
- *As a buyer, I want to save crafters I like so I can return later without re-searching.*
- *As a buyer, I want to filter events by craft so I can find a weekend pottery workshop.*
- *As a buyer, when I switch cities, I want all sections (crafters, stores, learn, events) to update so the experience stays localized.*
- *As a buyer, I want to message a crafter via Instagram/WhatsApp directly from their profile so I can complete the transaction off-platform.*

### 5.2 Crafter Stories
- *As a crafter, I want to list my profile in under 5 minutes so I can start being discovered.*
- *As a crafter who also runs a supply store, I want to manage both listings from one dashboard.*
- *As a crafter, I want to add up to 6 portfolio photos so buyers see my range.*
- *As a crafter, I want to add a workshop I'm hosting and have it appear in Events with a link back to my profile.*

### 5.3 Store / Studio Stories
- *As a store owner, I want to claim a pre-populated listing the admin created from public data, so I don't lose existing organic visibility.*
- *As a studio operator, I want to promote my pottery workshop to the right local audience.*

### 5.4 Admin Stories
- *As an admin, I want to see all flagged listings at the top of my dashboard so I can moderate fast.*
- *As an admin, I want to feature a high-quality crafter so they appear at the top of the city's listing.*
- *As an admin, I want to export all listings/users to CSV for backup.*
- *As an admin, I want to promote another team member to admin role from the dashboard.*

---

## 6. Information Architecture

### 6.1 Site Map

```
crafty.app/
├── /                                    Homepage (city-localized)
├── /crafters                            All crafters (city-filtered)
│   └── /crafters/[slug]                 Crafter profile
├── /stores                              All stores (city-filtered)
│   └── /stores/[slug]                   Store detail
├── /learn                               All studios/academies (city-filtered)
│   └── /learn/[slug]                    Studio detail
├── /events                              All upcoming events (city-filtered)
│   └── /events/[slug]                   Event detail
├── /search?q=...&city=...               Global (city-scoped) search results
├── /list-your-profile                   Creator entry (signup CTA)
├── /signup                              Visitor signup (Google/SSO)
├── /login                               Login (Clerk)
├── /dashboard                           Creator dashboard
│   ├── /dashboard/crafter
│   ├── /dashboard/store
│   ├── /dashboard/learn
│   ├── /dashboard/events
│   └── /dashboard/saved                 Visitor's saved/hearted list
├── /admin                               Admin console (role-gated)
│   ├── /admin/listings
│   ├── /admin/users
│   ├── /admin/events
│   ├── /admin/flags                     Moderation queue (default landing)
│   ├── /admin/cities
│   └── /admin/export                    CSV export
├── /contact                             Footer support page (mailto + form)
├── /terms                               Terms of Service (placeholder V1)
├── /privacy                             Privacy Policy (placeholder V1)
├── /404                                 Custom 404 (Gumroad style)
└── /500                                 Custom error page (Gumroad style)
```

### 6.2 URL Conventions
- Slugs are lowercase, hyphenated, immutable post-publish.
- **Slug generation contract** (per [crafty-app/lib/util.ts] `ensureUniqueSlug`):
  - Lowercase + NFKD normalize + strip combining diacritics via `[̀-ͯ]` Unicode escape (NOT literal combining chars in regex source — those are unreadable across editors).
  - Replace non-`a-z0-9` with `-`; trim leading/trailing dashes.
  - Reserved-word list short-circuits: append `-1` if base equals a reserved slug (admin, api, dashboard, etc. — full list in code).
  - **Length cap**: base slug truncated to 56 chars (4 chars reserved for `-999` collision suffix); final slug always ≤60 chars even with high-numbered collisions. DB columns sized 64.
- City is a query param, not in the path: `/crafters?city=bengaluru`. The homepage selector writes to a session cookie + URL query for shareable city-scoped URLs.
- All entity pages (crafter, store, learn, event) are SSR'd for SEO.

### 6.3 Global Navigation
- **Mobile (default):** Logo (left), city selector (center), hamburger (right) → Crafters, Stores, Learn, Events, Search, List Your Profile, Login.
- **Desktop:** Logo, city selector, top nav (Crafters, Stores, Learn, Events, Search, List Your Profile, Login/Profile menu).

---

## 7. Feature Specifications

### 7.1 Homepage

**Purpose:** Single localized discovery surface.

**Hero composition:** Editorial-led. Full-bleed real Indian craft photograph as the brand anchor (e.g., hands at a clay wheel, a workspace with yarn + scissors + tea, a stack of finished crochet pouches on wood). Warm cream gradient scrim at the bottom 40% of the photo so type sits legibly. Display headline + subhead + 2 CTAs are overlaid on the scrim. The hero is **one composition**, not a stacked card. Source photography from real Crafty Bengaluru meetups (Pavithran has these); fall back to commissioned shots before launch (open question H, designer/photographer).

**Headline (primary):** "Find the crocheter, the yarn shop, and the Sunday workshop near you."
**Subhead:** "Crafty is India's noticeboard for handmade. Bengaluru first; your city next."

**Sections (top-down):**
1. **Header** — Logo, city selector, nav, login/profile menu. Sticky, 56px tall on mobile, 72px on desktop.
2. **Hero** — Editorial composition described above. Mobile target height: 480px (above-fold dominance). Desktop target height: 640px.
   - Primary CTA: "Explore Crafters" → `/crafters?city=[selected]`
   - Secondary CTA (less prominent, ghost/outline style): "List Your Profile" → `/list-your-profile`
   - **No big global add CTAs** — section-level CTAs handle this.
   - **Unsupported-city banner** (per §7.2.1) renders ABOVE the hero on cold load when applicable.
3. **City Selector** — pill-style chip row (horizontally scrollable on mobile), default Bengaluru. Cities are admin-managed (only cities with ≥1 piece of content show). Trailing pill: `+ Add my city →` per §7.2.1. Selecting a city updates all four directory sections + persists in session cookie.
4. **Crafters in [City]** — single horizontal card row of CrafterCards (1:1 square) + "See all crafters →" link in the section heading row.
5. **Stores in [City]** — single horizontal card row of StoreCards (4:3 wide horizontal) + "See all stores →" link.
6. **Community moment** — full-bleed editorial section breaking the rail-rhythm. Single anchor photo (real meetup / studio / craft scene from this city) + 1-line caption (e.g., "Cubbon Park, Sunday morning. 60 crafters." in a particular city; admin-curatable per city via a `CommunityMoment` json field on the City model — fall back to a generic Crafty community moment for cities without curated content). NOT a card, NOT a rail. One photo, one sentence. Optional small "More from the community →" link to a future V1.5 community page (omit link in V1).
7. **Learn in [City]** — single horizontal card row of StudioCards (1:1 square) + "See all institutes →" link.
8. **Events in [City]** — single horizontal card row of EventCards (16:9 with date badge top-left), upcoming only, sorted by date asc + "See all events →" link.
9. **Footer** — Logo, About link, Contact, Privacy, Terms, copyright, social links.

**Behavior:**
- All four sections update on city switch.
- Empty city (no listings in section) → friendly empty state (Gumroad illustration) with "Be the first — list your [crafter/store/studio/event]" CTA.
- First-time visitor optional tooltip walkthrough — **deferred to V1.5 only** (see §26.2). Not built in V1.
- **Empty-city day-one behavior:** when a city has 0 listings across all 4 entity types (zero crafters AND zero stores AND zero studios AND zero events with `is_published=true`), replace the rail stack with a single full-bleed editorial section: heading "Crafty is opening in [City]." + body "Be the first crafter, store, studio, or event — you'll be the founding listings." + 4 inline CTAs (one per entity type linking to `/list-your-profile`). Hero, city pill row, and footer remain unchanged. Reverts to standard rail layout the moment any rail has ≥1 listing. Detected at SSR via combined count query on `Crafter`, `Store`, `Studio`, `Event` filtered by `city_id` and `is_published`.

### 7.2 City Selector

- **V1 ships as Bengaluru-only** per the approved design doc. The `City` table seeds 6 cities (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Chennai, Pune) but **only Bengaluru has `is_active=true`** at launch. Other cities ship as inactive — they exist in the schema for future expansion, do not appear in the city pill row, and have zero listings on day one.
- The city pill row therefore renders as a single "Bengaluru" chip in V1. The chip stays visible (rather than hidden) because (a) it announces what the platform IS, and (b) it primes a "more cities coming" expectation.
- Stored client-side: URL query param `?city=bengaluru` + session cookie `crafty_city`. Both written for forward-compat with V1.5 multi-city.
- Server reads cookie/query for SSR localization.
- Selection persists for the session only — no permanent profile preference in V1.
- **No IP geolocation, no unsupported-city banner, no CityRequest collection in V1.** All three are V1.5 features that ship together with the second city's launch (driven by metrics + Rahul's curator network expansion, not by inbound demand capture). Reasoning: founder-curated trust does not extend beyond Rahul's community in Bengaluru; capturing demand for Mumbai before there is a Mumbai curator creates expectations the product cannot fulfill.

#### 7.2.1 V1.5 Multi-City Plan (deferred)
- When a second city is launched (criteria: a designated curator owns it AND the design-doc Day-90 metrics gate has passed), unblock the path:
  - Activate the city via `is_active=true`.
  - Add it to the city pill row.
  - Re-evaluate whether to add the unsupported-city banner + CityRequest at that point. The mechanism is not pre-wired in V1.

### 7.3 Crafters

#### Card (homepage row + listing grid)
| Field | Required | Notes |
|-------|----------|-------|
| Profile photo | Yes | Square (1:1), served at 400×400 max from object storage |
| Crafter / shop name | Yes | |
| Craft category(ies) | Yes | Multi-select; up to 3 shown on card as chips below text |
| City | Yes | |
| Tagline | Optional | Max 80 chars |
| Teaches badge | Optional | Auto-shown as inline chip in the chips row (alongside category chips) when crafter offers classes |
| Featured badge | Optional | Set by admin; renders as "Featured ✨" pill in the **top-left** corner overlaid on photo |
| Save heart | Auto | 36×36px ink-on-white circular button in the **top-right** corner overlaid on photo (44×44 effective tap target via padding); fires optimistic save toggle per §23.5 |

**Card states (mobile-touch + desktop):**
- Default: card border 1.5px line color, shadow-card, rounded-lg.
- Desktop hover: translate -2px / -2px, ink offset shadow 4px, 100ms ease-out (per §17.7).
- Touch :active: same translate as hover for ~150ms before navigation. Provides tactile feedback on mobile where hover does not exist.
- Keyboard focus: 2px accent ring at 2px offset, ink retains.

#### Listing Page (`/crafters?city=...&category=...`)
- Multi-column responsive grid (2 cols mobile, 3 cols tablet, 4 cols desktop).
- Filter chip row: craft categories (multi-select). Sort: Featured → Most recent.
- Pagination (24 cards per page; infinite scroll on mobile, "Load more" button on desktop).
- Empty state if no matches.

#### Profile Page (`/crafters/[slug]`)
- **Above-the-fold contract (mobile, 414×600):** Hero photo (16:9 at ~50% viewport height), name, city, craft categories, ContactBlock (WhatsApp/Instagram/Website buttons, each ≥44×44px). The ContactBlock is the primary conversion event and **must not require scroll on the smallest mobile target.** Save/Share buttons sit on the hero corner, secondary.
- Bio (300 char max) — directly below the fold.
- Contact: WhatsApp, Instagram, website (any combination, ≥1 required). All open external — no DM in V1.
- Portfolio: up to 6 photos in gallery.
- Products section: list of products (photo, name, price, optional description). Click product → modal with photos + crafter contact CTA. **No product page URLs in V1.**
- Classes/workshops (if toggled on at signup): up to 3 classes with description, format (online/home/in-person), price.
- Cross-listing badges via the **CrossLinkCard** component (a 1-line warm card placed below ContactBlock, with a 32px circular thumbnail of the linked entity's logo + "Also runs Aisha's Yarn Store →" + chevron). Same component reused on Store / Studio profiles back-linking to the crafter or to peer entities. Renders for every linked entity owned by the same `owner_user_id`.
- Report button (link to flag form).

#### Required Data at Registration (Crafter)
- Name / shop name (3–60 chars)
- Craft category — multi-select from predefined list
- City — predefined list
- Profile photo (≤5MB, jpg/png/webp)
- Bio (optional, 300 char max)
- Contact info — at least one of WhatsApp, Instagram, website
- Portfolio photos (optional, up to 6, each ≤5MB)
- "Offers classes/workshops" toggle (optional)

### 7.4 Stores

#### Card
| Field | Required | Notes |
|-------|----------|-------|
| Store photo / logo | Yes | |
| Store name | Yes | |
| Supply categories | Yes | Multi-select; up to 3 shown |
| Address snippet | Yes | First line + locality |
| City | Yes | |
| Featured badge | Optional | Admin-set |

#### Listing Page (`/stores?city=...&category=...`)
- Same grid pattern as Crafters.
- Filter: supply categories (yarn, fabric, beads, tools, paper, paint, clay, embroidery, other — admin-managed).

#### Detail Page (`/stores/[slug]`)
- Hero photo, name, address (full), Google Maps embed.
- Supply categories listed.
- Operating hours (optional).
- Contact: phone, WhatsApp, website.
- "Online store" toggle — if online-only, hide Maps embed; show website CTA prominently.
- Cross-listing badges if applicable.
- "Is this your store? [Email us at hello@crafty.app](mailto:hello@crafty.app) to claim and manage this listing" — only on **unclaimed** (admin pre-populated) stores.
- Report button.

#### Admin Pre-Population
- Admin can manually add stores via `/admin/listings/new`.
- Admin enters publicly available info; listing is marked `is_claimed = false`.
- Public page automatically shows "claim this listing" notice.
- When email arrives at hello@crafty.app, admin verifies, links Clerk user to listing, sets `is_claimed = true`.

### 7.5 Learn (Studios & Academies)

#### Definition
**Strictly for established studios, schools, and academies dedicated to teaching art and craft.** Individual crafter-run home/online classes belong on the crafter's own profile, NOT here.

V1 admits **online-only studios** (e.g., online pottery course platforms) — they appear in Learn with their ongoing courses. **Short-term/one-off events from these online studios go in Events, not Learn.**

#### Card
| Field | Required | Notes |
|-------|----------|-------|
| Photo / logo | Yes | |
| Institute name | Yes | |
| Craft disciplines taught | Yes | Multi-select |
| Address snippet | Yes | |
| City | Yes | |
| Age group / level | Optional | |
| Featured badge | Optional | |

#### Listing Page & Detail Page
Same structure as Stores. Detail page additionally shows:
- Ongoing courses (name, duration, format, price, link to register externally).
- Operating hours.
- Cross-listing badges.
- Claim notice on unclaimed listings.

### 7.6 Events

#### Definition
- All V1 events are **single-instance only**. No recurring/ongoing events. Recurring is a V2 consideration.
- Events are **always linked to a creator profile** (crafter, store, or studio) — there is no orphan event creation.
- Event page **always credits the organizer** with link back to their profile.

#### Card
| Field | Required | Notes |
|-------|----------|-------|
| Cover image | Yes | 16:9 |
| Event name | Yes | |
| Date & time (start) | Yes | DD/MM/YY format, IST |
| End time | Yes | |
| Venue / location name | Yes | "Online" allowed |
| City | Yes | |
| Event type | Yes | Workshop / Fair / Exhibition / Class / Pop-up / Other |
| Organizer name | Yes | Linked to profile |
| Entry info | Yes | Free / Paid (with price if paid) |

#### Listing Page (`/events?city=...&type=...`)
- Filter by event type, craft category.
- Default sort: date ascending (soonest first).
- Past events hidden by default. "Show past events" toggle for V1.5.
- Same grid pattern.

#### Detail Page (`/events/[slug]`)
- Cover image, name, date/time (with "Add to calendar" download .ics).
- Venue (with Maps embed for physical events).
- Description (up to 1000 chars).
- Organizer card linking to crafter/store/studio profile.
- Entry info — Free / Paid (price displayed).
- **Registration CTA** — external link to organizer's preferred URL (Instagram form, Google Form, BookMyShow, etc.). **Crafty does not handle registration in V1.**
- Report button.

#### Event Creation
- Available to any creator type (crafter, store, learn).
- Form requires ALL fields above + cover image (≤5MB) + external registration URL + description.
- Goes live immediately on submit.
- Creator can edit/delete from their dashboard up until event end time.

### 7.7 Search

**Scope:** Global search across all four entity types (crafter, store, learn, event), but **scoped to selected city**. No cross-city search in V1.

**Implementation (V1):** Postgres full-text search with `tsvector` indexes on entity name, tagline/description, category fields. Tokenized + stemmed.

**UI:**
- Top nav search bar (full-width on mobile, pill on desktop).
- Results page (`/search?q=...&city=...`) groups results by entity type with section headers.
- Each section shows up to 6 results + "See all matching crafters" link.
- **Two distinct empty states** (see §23.2 illustration mapping):
  - **Pre-query** (user landed on `/search` with no `q`): "Searching" illustration + headline "Looking for something?" + body "Try \"crochet\", \"yarn\", or a craft you love." + 4-5 popular search chips for the current city (sourced from a curated admin list per city; fall back to a city-agnostic default list).
  - **Zero-result** (query ran, no matches): "Funnel" illustration + headline "No matches for \"[query]\" in [City]." + body "Try a different keyword or browse all crafters." + secondary CTA linking to `/crafters?city=[City]`.

**V2:** Switch to Postgres + dedicated search service (Typesense or Meilisearch) if relevance becomes an issue.

### 7.8 Authentication & Account Types

Two completely separate signup paths managed by **Clerk**.

| Account Type | Signup Path | Auth Methods | Permissions |
|--------------|-------------|--------------|-------------|
| **Visitor** | `/signup` (or implicit on heart/save) | Google SSO, Microsoft SSO, Email+Password | Browse, heart/save, search; cannot create listings |
| **Creator** | `/list-your-profile` → `/signup?role=creator` | Same | Visitor permissions + create/edit listings, events |
| **Admin** | Promoted via Admin Console (or seeded by code for first admin) | Same | Full visitor + creator + admin console |

**Key rules:**
- Same email/account can be both Visitor and Creator (one Clerk user; role determines dashboard exposure).
- Admin role is granted via `/admin/users → Promote to Admin`. First admin is hardcoded by seed migration.
- All authenticated UX changes based on `user.role`. The Clerk public metadata holds `role` and `is_admin`.

**Onboarding (post-auth):**
- Visitor: 1-screen tooltip "You can heart and save listings now."
- Creator: After signup, prompt to upload profile photo + complete first listing.
- Profile photo collected at this step (not at signup).

### 7.9 Visitor: Heart / Save

- Tap heart on any card or profile → adds to user's saved list.
- Saved list at `/dashboard/saved` (4 tabs: Crafters, Stores, Learn, Events).
- Local-only — no notifications, no email, no other-side visibility.
- Heart count is **not displayed publicly** in V1 (avoids leaderboard dynamics, popularity bias, brigading).

### 7.10 Creator Dashboard

**Layout (web-first, desktop-optimized):**
- Left sidebar: Listings (Crafter, Store, Learn), Events, Profile, Saved, Settings, Logout.
- Main panel top — **DashboardActivityStrip** (the dashboard's emotional center, not just a CRUD panel):
  - On visit ≥2 with ≥1 published listing: stat strip "Your profile got **N** saves this week. **M** people viewed your listings." + latest listing thumbnail with "View public page →" link.
  - On first visit / empty state: full-width "Create Crafter Profile" CTA with one-line nudge ("Takes about 5 minutes. You'll be discoverable in [City] right away.").
  - Stats source: `Save` table aggregate per `entity_id` over last 7 days; view counts deferred to V1.5 (skip the views half if not yet implemented; do not block on it).
- Below activity strip: Listing cards with edit/delete actions, "Add Listing" CTA per type.
- A creator account can hold N listings of each type (e.g., one crafter, one store).

**Listing Editor:**
- Multi-step form (web-first, but mobile-responsive). State managed by **React Hook Form** with `useWatch()` driving the preview pane — RHF gives multi-step validation + dirty-state + server-error mapping with minimal boilerplate.
- Live preview pane on desktop ≥1024px (right 40% of viewport, mirrors public profile layout); collapsible accordion on mobile <1024px ("Preview your card ▾" at top of each step).
- Image upload via drag-drop with progress indicators; 5MB cap enforced client-side + server-side.

### 7.11 Multiple Listings & Cross-Linking

- Single Clerk user can create:
  - Up to 1 Crafter profile
  - Up to 1 Store listing
  - Up to 1 Studio listing
  - Unlimited Events (tied to one of their listings)
- Cross-listing badges automatically render on each profile when same `owner_user_id` has multiple types.
  - Crafter profile: "This crafter also runs **Aisha's Yarn Store** →"
  - Store profile: "Owner also crafts at **Aisha Crochet** →"
- All listings managed from the unified `/dashboard`.

### 7.12 Reporting & Flagging

- Every listing/event detail page has a "Report this" link in the footer.
- Modal: select reason (Inappropriate content, Spam, Misleading, Copyright, Other) + optional 200-char note + email (auto-filled if logged in).
- Submit creates a `flag` record. Listing is **NOT auto-removed**. Admin reviews.
- Admin dashboard surfaces flagged items at top with reason + reporter.
- Admin can: dismiss flag, hide listing, delete listing, ban user.

### 7.13 Claim Flow (Pre-Populated Listings)

- Admin pre-populates store/studio with public data; sets `is_claimed = false`.
- Public detail page shows: "Is this your [store/institute]? [Email hello@crafty.app](mailto:hello@crafty.app?subject=Claim:%20[Store%20Name]) to claim."
- Admin handles inbound emails manually; verifies (e.g., by checking the email matches public domain or via business documents).
- On verification, admin links the creator's Clerk user_id to the listing in `/admin/listings/[id]/transfer-ownership`, flips `is_claimed = true`, and removes the claim notice.
- No automated claim UI in V1.

### 7.14 Admin Console (`/admin`)

**Default landing:** `/admin/flags` — moderation queue.

**Sections:**
- **Health** — `/admin/health` shows last-run + status for every cron job per §10.4. Red row if cron hasn't fired within 25h of expected schedule.
- **Flags** — moderation queue, reason filters, bulk actions.
- **Listings** — search/filter all crafter/store/learn listings; feature/unfeature; delete; edit any field; transfer ownership.
- **Events** — same as listings.
- **Users** — search by email, see linked listings, promote/demote admin, ban (soft-delete account).
- **Cities** — add/remove cities from the public selector.
- **Categories** — manage craft categories (Crochet, Pottery, etc.) and supply categories (Yarn, Fabric, etc.).
- **Export** — one-click CSV export of: users, crafters, stores, learn, events, flags. Each downloads as a separate CSV.
- **Audit Log (V1.5)** — every admin action logged. (V1: log to DB but no UI yet.)

**Admin permission model:**
- `is_admin = true` Boolean on user record.
- Server middleware on every `/admin/*` route checks Clerk session + `is_admin`.
- First admin seeded via migration (your email).
- Admins can promote any user to admin from `/admin/users`.

---

## 8. User Flows

### 8.1 Visitor → Browse → Heart

```
Land on / (homepage, Bengaluru default)
  → Scroll Crafters row → tap card
  → Crafter profile page loads
  → Tap heart icon
  → Modal: "Sign in to save"
  → Sign in via Google (Clerk)
  → Heart toggled, listing added to /dashboard/saved
  → Toast: "Saved to your list"
```

### 8.2 Visitor → Switch City

```
Land on / (Bengaluru)
  → Tap city chip "Mumbai"
  → URL updates to /?city=mumbai
  → Cookie set: crafty_city=mumbai
  → All four discovery rows reload (server fetch by city)
  → If Mumbai has no Events: empty state in Events row
```

### 8.3 Crafter Signup → First Listing Live

```
Tap "List Your Profile" on homepage
  → /list-your-profile (web-first interstitial explaining the flow)
  → Tap "Sign up as Creator" → Clerk signup
  → Post-signup: Onboarding modal
    → Upload profile photo (mandatory step; copy: "Pick something that shows your craft. You can change this anytime.")
    → Continue
  → /dashboard (empty state per §17.5: full-width "Create Crafter Profile" CTA + reassurance)
  → Tap "Create Crafter Profile"
  → Multi-step form with live preview (§7.10): Basics → Contact → Portfolio → Classes (optional) → Review
    - Desktop ≥1024px: 60/40 split, right pane mirrors public CrafterCard + profile preview, live-updates per field
    - Mobile <1024px: collapsible "Preview your card ▾" accordion at top of each step
  → Submit (button copy: "Publish my profile")
  → **Celebration screen**: full-screen takeover for ~3 seconds OR until user taps continue
    - "You're live in [City] 🌻"
    - Live URL displayed: `crafty.app/crafters/[slug]` (with copy-link button)
    - Three share buttons pre-filled: WhatsApp ("Find me on Crafty: [URL]"), Instagram (copy-to-clipboard for story), email
    - Secondary CTA: "View my profile →"
  → Transactional email sent via Resend: "Your Crafty profile is live!"
  → Redirect to /crafters/[slug]?welcome=1 (one-time confetti).
  → On client mount: read `?welcome=1`, fire confetti via dynamic-imported `canvas-confetti` (~5KB, code-split chunk loaded only when needed), then call `history.replaceState({}, '', location.pathname)` to strip the query param so the canonical URL stays clean and ISR cache is unaffected.
```

### 8.4 Creator Adds a Second Listing (Store)

```
/dashboard
  → Sidebar: "Add Store" CTA
  → Multi-step store form
  → Submit
  → Both listings now appear on dashboard
  → Cross-linking badges auto-render on each public profile
```

### 8.5 Event Creation

```
/dashboard → Events tab → "Create Event"
  → Form: Name, Date/Time, Venue, Type, Cover Image, Organizer (auto-filled with one of user's listings; user picks if multiple), Entry, Registration URL
  → Submit
  → Event live, transactional email confirmation
  → Event card appears in /events?city=[city]
  → Event detail page links back to organizer profile
```

### 8.6 Visitor Reports a Listing

```
Detail page footer → "Report this" link
  → Modal: select reason + optional note
  → Submit (no auth needed)
  → Flag record created, listing remains live
  → Admin sees in /admin/flags
  → Admin actions: Dismiss / Hide / Delete / Ban user
```

### 8.7 Admin Pre-Populates a Store; Owner Claims It

```
Admin: /admin/listings/new (Store) → fill in publicly-available info → save (is_claimed=false)
Public Store page now shows "claim this listing" notice
Owner emails hello@crafty.app
Admin verifies → /admin/listings/[id]/transfer-ownership → enter owner's Clerk email
System sends invite email via Resend ("You've been linked to your Crafty store")
Owner accepts via Clerk magic link → owner now manages listing from their dashboard
```

### 8.8 Admin Promotes a New Admin

```
/admin/users → search user by email
  → User detail → "Promote to Admin" button
  → Confirmation
  → User's role updated; they get admin access on next login
```

### 8.9 Emotional Journey Storyboards

The flows above describe what the system does at each step. The storyboards below describe what the **user feels** at each step and what design must do to support that feeling. They are normative for design + frontend implementation.

#### Storyboard A — Aisha publishes her first crafter listing

| # | Step | Aisha does | Aisha feels | Design supports it via |
|---|------|------------|-------------|-----------------------|
| 1 | Homepage CTA | Sees "List Your Profile" pill | Curious + slightly intimidated ("is this for someone like me?") | Warm secondary CTA copy. Hero subtext explicitly inclusive: "Crafters, supply stores, studios — list yours in 5 minutes." |
| 2 | `/list-your-profile` interstitial | Skim-reads the page | Wants 30 seconds of "yes, this is for you" before signup | Page shows: 3-step "what to expect" (sign up → upload photos → publish), 1 testimonial-style line from a real crafter, "Free, always" badge, "Sign up with Google" big primary CTA |
| 3 | Clerk SSO | Taps Google | Relief — "that was painless" | Clerk's default. No additional design lift. |
| 4 | Onboarding modal: photo upload | Uploads from gallery | Self-conscious about photo quality | Modal copy: "Pick something that shows your craft. You can change this anytime." Skip option: "Add later". |
| 5 | Empty dashboard | Stares at "Create Crafter Profile" | Slight overwhelm — "what does this involve?" | Hero CTA + 1-line reassurance: "Takes about 5 minutes. You'll be discoverable in [City] right away." |
| 6 | Form step 1 (Basics) | Types name, picks category | Engaged | Form copy is direct ("Your shop name", not "Brand identity"). Inline character counter for tagline. |
| 7 | Form step 2 (Contact) | Adds WhatsApp + Instagram | Mild anxiety: "do I have to share all of these?" | Helper text: "At least one is required. Buyers will reach you here directly." Pick-one validator. |
| 8 | Form step 3 (Portfolio) | Uploads 4 photos | Anxious: "do these look professional?" | **Live preview pane** (desktop side / mobile accordion) shows her CrafterCard + profile fold updating as she uploads. "Looks great" is implicit feedback. |
| 9 | Form step 4 (Classes, optional) | Skips | Neutral | Step skippable with "I don't teach classes" toggle. |
| 10 | Form step 5 (Review) | Scrolls through | Hopeful + nervous: "this is the moment" | Review summary mirrors public profile layout. Big "Publish my profile" button. Secondary "Back to edit". |
| 11 | Celebration screen | Reads "You're live in Bengaluru 🌻" | **Pride + validation** | Full-screen takeover with live URL, copy-link, and 3 pre-filled share buttons (WhatsApp / Instagram / email). Confetti micro-animation. |
| 12 | Lands on public profile | Sees her listing in the wild | Validation + share urge | `?welcome=1` triggers one-time confetti + ghost banner: "Share your link with your community →" |
| 13 | Email arrives | Glances at inbox | Confirmation | Resend email per §29.4 with warm tone, View/Edit CTAs. |

#### Storyboard B — Priya saves her first crafter

| # | Step | Priya does | Priya feels | Design supports it via |
|---|------|------------|-------------|-----------------------|
| 1 | Homepage scroll on bus | Scrolls Crafters rail | Browsing, low-commitment | Snap-scroll cards, fast image loads (blurhash), no autoplaying anything |
| 2 | Taps a crafter card | Profile loads | Interested | SSR + above-fold contract per §17.5 — hero + name + ContactBlock visible without scroll |
| 3 | Taps heart | Heart fills instantly | Positive ("yes that worked") | **Optimistic UI** per §23.5 — heart fills before server response |
| 4 | "Sign in to save" modal | Reads modal copy | Annoyed — interruption mid-task | Modal copy: "Sign in once and your saves stick around." Three-line pitch: 1) save your favorites 2) come back to them 3) we'll never spam you. Big "Sign in with Google" + small "Continue browsing" |
| 5 | Google SSO | Taps through | Quick + low friction | Clerk default |
| 6 | Returns to crafter profile | Sees heart filled, brief toast | Validation: "good, that stuck" | Toast: "Saved to your list →" with "list" as a tap-able link to /dashboard/saved |
| 7 | Saves 2 more crafters | Building a shortlist | Ownership feeling growing | Heart counter NOT shown publicly per §7.9 — but for the user, second + third save toast says "Saved (3 in your list →)" |
| 8 | After 3rd save, soft prompt | Sees subtle "View your saved list" banner appear at bottom of next profile | Curious, taps | One-time soft prompt (cookie-flagged); never repeated; introduces /dashboard/saved without a forced redirect |
| 9 | Lands on saved list | Sees her 3 crafters | Pride, ownership | `/dashboard/saved` opens in Crafters tab; warm empty-state of remaining tabs ("No saved stores yet — heart any store to save it here.") |

#### Storyboard C — Visitor in unsupported city (V1.5, deferred)

V1 ships Bengaluru-only per §7.2; an out-of-city visitor sees the Bengaluru homepage with no special handling. Storyboard for the V1.5 second-city launch will be drafted when that work is scoped.

These storyboards are design intent. They reflect current product hypotheses; revise after first user observations and metrics inform what the moment actually feels like.

---

## 9. Tech Stack & Architecture

### 9.1 Stack Overview

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Hosting & Runtime | **Replit** | All-in-one platform per founder preference; full-stack apps + DB + storage + custom domain |
| Frontend Framework | **Next.js 14 (App Router)** | SSR for SEO; React Server Components; API routes; deployed on Replit |
| Language | TypeScript | Type safety across stack |
| Backend / API | Next.js API routes + tRPC (or REST) | Type-safe end-to-end |
| Database | **Replit Postgres** (managed) | Relational, supports full-text search, JSON columns. Founder chose all-Replit per Decision 17. Eng review explicitly considered moving to Neon for SPOF mitigation but reverted: at ≤5K MAU the SPOF concern is theoretical; honors the founder premise. Migration playbook in `docs/runbook.md` triggered by sustained p95 query latency >200ms or any incident >15min. |
| ORM | Prisma | Schema-first, migrations, type-safe queries |
| Auth | **Clerk** | Google SSO, Microsoft SSO, email/password; user mgmt; webhooks |
| Object Storage | **Replit Object Storage** | Image uploads (profile, portfolio, covers) |
| Image Processing | `sharp` library + Replit edge resize | Compress + resize on upload; serve WebP |
| Email | **Resend** | Transactional only V1 |
| Search | Postgres full-text search (V1); Typesense (V2) | Cheap & sufficient for V1 scale |
| Analytics | GA4, GTM, PostHog, Microsoft Clarity, Meta Pixel, LinkedIn Pixel | Multi-source per founder requirements |
| Search Console | Google Search Console | Organic monitoring |
| Domain | **crafty.app** via Replit custom domain | Live from day one |
| CDN | Replit-provided | Static assets, images |
| Monitoring | Replit logs + Sentry (free tier) | Error tracking |
| Tooltip onboarding | Shepherd.js | "Nice to have" first-run walkthrough |
| Calendar export | `ics` npm library | Generate .ics for events |

### 9.2 Why this stack
- **Replit-only** keeps ops simple — one provider for compute, DB, storage, domain.
- **Next.js + SSR** is non-negotiable for SEO (city + category indexability is a P1 goal).
- **Clerk** removes 2–3 weeks of auth work; multi-provider SSO out-of-box.
- **Prisma + Postgres** is the most boring, reliable, hireable stack today.

### 9.3 Out-of-Stack (Deferred)
- Redis / caching layer — V2 if needed.
- Background job queue — V2; V1 uses serverless cron via Replit scheduled tasks.
- Notification service (push, SMS) — V2.
- Payment gateway — V2+.
- Customer.io — V2 stub for marketing automation.

---

## 10. System Architecture & Data Flow

### 10.1 High-Level Component Diagram

```
                      ┌──────────────────────────┐
                      │  Browser (Mobile / Web)  │
                      │  React (Next.js client)  │
                      └────────────┬─────────────┘
                                   │ HTTPS
                                   │
                ┌──────────────────▼──────────────────┐
                │   Next.js App on Replit             │
                │   ─ SSR pages (homepage, profiles)  │
                │   ─ Client components (dashboard)   │
                │   ─ API routes (REST/tRPC)          │
                └─────┬─────────┬─────────┬───────────┘
                      │         │         │
              ┌───────▼──┐ ┌────▼────┐ ┌─▼────────────┐
              │  Clerk   │ │ Postgres│ │ Replit Object│
              │  (auth)  │ │ (data)  │ │  Storage     │
              └───────┬──┘ └─────────┘ │  (images)    │
                      │                └──────────────┘
                      │ webhooks
                      ▼
              ┌────────────────┐
              │  user.created  │
              │  webhook → DB  │
              └────────────────┘

      Outbound:
      ─ Resend (transactional email)
      ─ GA4 / PostHog / Clarity / Meta / LinkedIn pixels
      ─ Google Search Console (no API call; verification meta tag)
```

### 10.2 Request Flow — Public Page Load (e.g., `/crafters?city=bengaluru`)

1. Browser → Replit edge → Next.js server.
2. Server reads `city` query param + cookie.
3. Server queries Postgres: `SELECT * FROM crafters WHERE city = 'bengaluru' AND is_published = true ORDER BY is_featured DESC, created_at DESC LIMIT 24 OFFSET 0`.
4. Server fetches signed URLs for crafter profile images from Object Storage.
5. Server renders HTML with embedded data; ships to client.
6. Client hydrates; lazy-loads more pages via API on infinite scroll.

### 10.3 Request Flow — Authenticated Action (e.g., Create Listing)

1. Creator submits form on `/dashboard/crafter/new`.
2. Client uploads images → POST to `/api/upload` → server validates (mime, size ≤5MB), processes via `sharp`, uploads to Object Storage, returns CDN URL.
3. Client POSTs form to `/api/crafters` with image URLs.
4. Server validates Clerk session (middleware), validates payload (Zod), creates DB record, returns slug.
5. Server triggers Resend email "Your Crafty profile is live."
6. Client redirects to `/crafters/[slug]`.

### 10.4 API Surface (V1)

Each entity type has a parallel REST surface. PATCH uses Zod-partial schemas; DELETE is a soft-delete (sets `status=DELETED` + `deleted_at = now()`).

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/crafters?city=&category=&page=` | List + filter (paginated, 24/page) | Public (only status=PUBLISHED) |
| POST | `/api/crafters` | Create profile (1-per-user enforced in app code per Issue 2.2) | Creator |
| GET | `/api/crafters/[id]` | Single crafter detail | Public |
| PATCH | `/api/crafters/[id]` | Update profile | Creator (own) / Admin |
| DELETE | `/api/crafters/[id]` | Soft-delete (status=DELETED) | Creator (own) / Admin |
| GET | `/api/stores?...` | List + filter | Public |
| POST | `/api/stores` | Create | Creator (1-per-user) / Admin |
| GET / PATCH / DELETE | `/api/stores/[id]` | Same pattern as crafter | Public / Creator (own) / Admin |
| GET / POST / PATCH / DELETE | `/api/studios[/...]` | Same pattern | Same |
| GET | `/api/events?city=&type=&page=` | List upcoming (filter past via `start_at >= now()`) | Public |
| POST | `/api/events` | Create (must be linked to creator's existing crafter/store/studio) | Creator |
| GET / PATCH / DELETE | `/api/events/[id]` | Same pattern; DELETE allowed up to event end_at | Creator (own) / Admin |
| POST | `/api/saves` | Toggle save (race-safe transaction per §20.3) | Authenticated |
| POST | `/api/flags` | Submit flag (entity existence validated) | Public + authenticated |
| POST | `/api/upload?folder=` | Image upload (Content-Length pre-checked) | Creator |
| GET | `/api/search?q=&city=` | Cross-entity FTS | Public |
| POST | `/api/city-requests` | Submit unsupported-city request (per §7.2.1) | Public |
| POST | `/api/cron/[job]` | Background job invocation (shared-secret auth) | Cron only |

All POST/PATCH bodies validated via Zod. All routes returning 4xx/5xx use a uniform shape `{ error: string, details?: any }`. PATCH semantics: omitted fields are unchanged; explicit `null` clears nullable fields. DELETE is idempotent (deleting an already-deleted entity returns 204).

### 10.5 Background Jobs (V1)
- **Daily**: cleanup orphaned object storage files (uploaded but not attached to a record after 24h).
- **Past-event hiding is a query filter**, not a cron — listing-page queries already filter `start_at >= now()` (or `end_at >= now()` for events in progress). No cron needed.
- Implemented via Replit scheduled tasks invoking `/api/cron/...` endpoints with a shared secret (`CRON_SHARED_SECRET` in Replit Secrets; rotated quarterly per ops runbook).
- **Cron health monitoring**: the orphan_cleanup handler writes a row to `CronRun` table on completion. Admin view `/admin/health` shows last-run timestamp + status; row older than 25h shows red. Catches Replit scheduled-task silent failures.

---

## 11. Data Model

### 11.1 Postgres Schema (Prisma)

```prisma
// Schema source of truth: [crafty-app/prisma/schema.prisma]. This block mirrors that file.
// 16 prior eng-review decisions are baked in (see "Issue X.Y" comments in code):
// — Issue 1.4: ListingStatus enum + deleted_at + hidden_by_user_id (lifecycle)
// — Issue 1.2: Event uses 3 nullable FKs (organizer_crafter_id, organizer_store_id,
//              organizer_studio_id) with a CHECK constraint enforcing exactly-one;
//              CHECK lives in raw migration prisma/raw-migrations/0001_fts_and_constraints.sql
// — Issue 1.5: SlugRedirect table from day one
// — Issue 2.2: dropped @unique on owner_user_id; cap of 1-per-type enforced in app code
// — Issue 2.3: search_vector triggers on parent + join tables (raw migration)

enum ListingStatus { PUBLISHED  UNPUBLISHED  HIDDEN  DELETED }
enum EventType     { WORKSHOP   FAIR  EXHIBITION  CLASS  POPUP  OTHER }

model User {
  id                String    @id @default(cuid())
  clerk_id          String?   @unique          // null in dev-stub mode
  email             String    @unique
  display_name      String?
  profile_photo_url String?
  is_admin          Boolean   @default(false)
  is_banned         Boolean   @default(false)
  email_bounced     Boolean   @default(false)  // Resend bounce flag
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  crafters Crafter[]
  stores   Store[]
  studios  Studio[]
  events   Event[]
  saves    Save[]
  flags    Flag[]    @relation("FlaggedBy")

  @@index([email])
}

model Crafter {
  id                String    @id @default(cuid())
  slug              String    @unique
  owner_user_id     String                                  // NOT @unique — cap enforced in app
  owner             User      @relation(fields: [owner_user_id], references: [id], onDelete: Cascade)
  name              String
  tagline           String?
  bio               String?
  city_id           String
  city              City      @relation(fields: [city_id], references: [id])
  profile_photo     String
  portfolio_photos  String[]  @default([])
  contact_whatsapp  String?
  contact_instagram String?
  contact_website   String?
  offers_classes    Boolean   @default(false)
  classes_json      Json?

  status            ListingStatus @default(PUBLISHED)
  deleted_at        DateTime?
  hidden_by_user_id String?
  is_featured       Boolean   @default(false)
  is_claimed        Boolean   @default(true)

  craft_categories  CraftCategoryOnCrafter[]
  events            Event[]   @relation("EventCrafter")
  flags             Flag[]    @relation("FlaggedCrafter")

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  // search_vector tsvector — added via raw migration; not in Prisma model

  @@index([city_id, status])
  @@index([owner_user_id])
}

// Store — same lifecycle/featured/claimed pattern as Crafter
model Store {
  id                String    @id @default(cuid())
  slug              String    @unique
  owner_user_id     String?
  owner             User?     @relation(fields: [owner_user_id], references: [id], onDelete: SetNull)
  name              String
  logo_photo        String
  city_id           String
  city              City      @relation(fields: [city_id], references: [id])
  address           String
  is_online_only    Boolean   @default(false)
  contact_phone     String?
  contact_whatsapp  String?
  contact_website   String?
  operating_hours   Json?

  status            ListingStatus @default(PUBLISHED)
  deleted_at        DateTime?
  hidden_by_user_id String?
  is_featured       Boolean   @default(false)
  is_claimed        Boolean   @default(true)

  supply_categories SupplyCategoryOnStore[]
  events            Event[]   @relation("EventStore")
  flags             Flag[]    @relation("FlaggedStore")

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@index([city_id, status])
  @@index([owner_user_id])
}

// Studio (Learn) — same pattern
model Studio {
  id                String    @id @default(cuid())
  slug              String    @unique
  owner_user_id     String?
  owner             User?     @relation(fields: [owner_user_id], references: [id], onDelete: SetNull)
  name              String
  logo_photo        String
  city_id           String
  city              City      @relation(fields: [city_id], references: [id])
  address           String
  is_online_only    Boolean   @default(false)
  age_group         String?
  contact_phone     String?
  contact_whatsapp  String?
  contact_website   String?
  operating_hours   Json?
  ongoing_courses   Json?

  status            ListingStatus @default(PUBLISHED)
  deleted_at        DateTime?
  hidden_by_user_id String?
  is_featured       Boolean   @default(false)
  is_claimed        Boolean   @default(true)

  craft_disciplines DisciplineOnStudio[]
  events            Event[]   @relation("EventStudio")
  flags             Flag[]    @relation("FlaggedStudio")

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@index([city_id, status])
  @@index([owner_user_id])
}

// Event — exactly-one organizer FK enforced by CHECK in raw migration
model Event {
  id                   String    @id @default(cuid())
  slug                 String    @unique
  organizer_user_id    String
  organizer            User      @relation(fields: [organizer_user_id], references: [id], onDelete: Cascade)

  organizer_crafter_id String?
  organizer_crafter    Crafter?  @relation("EventCrafter", fields: [organizer_crafter_id], references: [id], onDelete: SetNull)
  organizer_store_id   String?
  organizer_store      Store?    @relation("EventStore",   fields: [organizer_store_id],   references: [id], onDelete: SetNull)
  organizer_studio_id  String?
  organizer_studio     Studio?   @relation("EventStudio",  fields: [organizer_studio_id],  references: [id], onDelete: SetNull)
  // Raw SQL CHECK: exactly one of organizer_crafter_id/store_id/studio_id is non-null

  name              String
  description       String
  cover_image       String
  start_at          DateTime
  end_at            DateTime
  city_id           String
  city              City      @relation(fields: [city_id], references: [id])
  venue_name        String
  venue_address     String?
  is_online         Boolean   @default(false)
  event_type        EventType
  craft_category_id String?
  craft_category    CraftCategory? @relation(fields: [craft_category_id], references: [id])
  is_free           Boolean
  price_amount      Decimal?  @db.Decimal(10, 2)
  price_currency    String    @default("INR")
  registration_url  String

  status            ListingStatus @default(PUBLISHED)
  deleted_at        DateTime?
  hidden_by_user_id String?
  is_featured       Boolean   @default(false)

  flags             Flag[]    @relation("FlaggedEvent")

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@index([city_id, status, start_at])
  @@index([start_at])
}

model City {
  id              String   @id @default(cuid())
  slug            String   @unique         // "bengaluru"
  display_name    String                   // "Bengaluru"
  is_active       Boolean  @default(true)
  display_order   Int      @default(0)
  created_at      DateTime @default(now())
  crafters        Crafter[]
  stores          Store[]
  studios         Studio[]
  events          Event[]
}

model CraftCategory {
  id              String   @id @default(cuid())
  slug            String   @unique
  display_name    String
  display_order   Int      @default(0)
  is_active       Boolean  @default(true)
  crafters        CraftCategoryOnCrafter[]
  events          Event[]
}

model SupplyCategory {
  id              String   @id @default(cuid())
  slug            String   @unique
  display_name    String
  display_order   Int      @default(0)
  is_active       Boolean  @default(true)
  stores          SupplyCategoryOnStore[]
}

model Discipline {
  id              String   @id @default(cuid())
  slug            String   @unique
  display_name    String
  display_order   Int      @default(0)
  is_active       Boolean  @default(true)
  studios         DisciplineOnStudio[]
}

// Junction tables (many-to-many)
model CraftCategoryOnCrafter {
  crafter_id     String
  category_id    String
  crafter        Crafter @relation(fields: [crafter_id], references: [id])
  category       CraftCategory @relation(fields: [category_id], references: [id])
  @@id([crafter_id, category_id])
}

model SupplyCategoryOnStore {
  store_id       String
  category_id    String
  store          Store @relation(fields: [store_id], references: [id])
  category       SupplyCategory @relation(fields: [category_id], references: [id])
  @@id([store_id, category_id])
}

model DisciplineOnStudio {
  studio_id      String
  discipline_id  String
  studio         Studio @relation(fields: [studio_id], references: [id])
  discipline     Discipline @relation(fields: [discipline_id], references: [id])
  @@id([studio_id, discipline_id])
}

model Save {
  id          String          @id @default(cuid())
  user_id     String
  user        User            @relation(fields: [user_id], references: [id], onDelete: Cascade)
  entity_type SavedEntityType                                  // CRAFTER | STORE | STUDIO | EVENT
  entity_id   String
  created_at  DateTime        @default(now())
  @@unique([user_id, entity_type, entity_id])
  @@index([user_id, entity_type])                              // user's saved-list query (4 tabs in /dashboard/saved)
  @@index([entity_type, entity_id, created_at(sort: Desc)])    // dashboard activity strip "saves on X in last 7 days"
}

enum SavedEntityType {
  CRAFTER
  STORE
  STUDIO
  EVENT
}

model Flag {
  id              String   @id @default(cuid())
  reporter_user_id String?
  reporter        User?    @relation("FlaggedBy", fields: [reporter_user_id], references: [id])
  reporter_email  String?
  entity_type     FlagEntityType
  entity_id       String
  reason          FlagReason
  note            String?
  status          FlagStatus @default(PENDING)
  resolved_by     String?
  resolved_at     DateTime?
  created_at      DateTime @default(now())
}

enum FlagEntityType {
  CRAFTER
  STORE
  STUDIO
  EVENT
}

enum FlagReason {
  INAPPROPRIATE
  SPAM
  MISLEADING
  COPYRIGHT
  OTHER
}

enum FlagStatus {
  PENDING
  DISMISSED
  HIDDEN
  DELETED
}

model AuditLog {
  id            String   @id @default(cuid())
  actor_user_id String
  action        String                // "PROMOTE_ADMIN", "FEATURE_LISTING", "DELETE_LISTING", etc.
  entity_type   String?
  entity_id     String?
  metadata      Json?
  created_at    DateTime @default(now())
  @@index([actor_user_id])
  @@index([entity_type, entity_id])
}

// SlugRedirect — table exists from day one; UI/migration ships V1.5
model SlugRedirect {
  id          String   @id @default(cuid())
  entity_type String                 // "crafter" | "store" | "studio" | "event"
  old_slug    String
  new_slug    String
  created_at  DateTime @default(now())
  @@unique([entity_type, old_slug])
  @@index([new_slug])
}

// CronRun — monitor health of background jobs (§10.5)
// V1 jobs: orphan_cleanup (daily). hide_past_events is a query filter, not a cron.
// MaxMind refresh removed (no IP-geo in V1 per §7.2).
model CronRun {
  id              String    @id @default(cuid())
  job_name        String                    // "orphan_cleanup"
  started_at      DateTime  @default(now())
  completed_at    DateTime?
  status          String                    // "running" | "success" | "error"
  error_message   String?
  rows_affected   Int?
  @@index([job_name, started_at(sort: Desc)])
}

// CityRequest model deferred to V1.5 per §7.2.1.
```

### 11.2 Indexes
- `crafters.city_id`, `crafters.is_published`, `crafters.search_vector` (GIN)
- `stores.city_id`, `stores.is_published`, `stores.search_vector` (GIN)
- `studios.city_id`, `studios.is_published`, `studios.search_vector` (GIN)
- `events.city_id`, `events.start_at`, `events.is_published`, `events.search_vector` (GIN)
- `users.clerk_id`, `users.email`
- `flags.status`, `flags.created_at`
- `saves.(user_id, entity_type)` composite
- `saves.(entity_type, entity_id, created_at desc)` composite — required for dashboard activity strip per §7.10

### 11.3 Migration & Seed Strategy
- Prisma migrations versioned in repo.
- Seed script populates: 6 cities, ~12 craft categories, ~10 supply categories, ~10 disciplines, first admin user (founder email).

---

## 12. Authentication & Authorization

### 12.1 Clerk Setup
- Configure providers: Google, Microsoft, Email+Password.
- Webhook endpoint: `/api/clerk/webhook` listens for `user.created`, `user.updated`, `user.deleted` and syncs to local `User` table.
- Public metadata holds `role` ("visitor" | "creator" | "admin") and `is_admin` boolean.

### 12.2 Permission Matrix

| Action | Visitor | Creator | Admin |
|--------|---------|---------|-------|
| View public pages | ✅ | ✅ | ✅ |
| Heart/save | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ |
| Report a listing | ✅ (or anon) | ✅ | ✅ |
| Create crafter listing | ❌ | ✅ | ✅ |
| Create store listing | ❌ | ✅ | ✅ |
| Create studio listing | ❌ | ✅ | ✅ |
| Create event | ❌ | ✅ (must own a listing) | ✅ |
| Edit any listing | ❌ | ✅ (own only) | ✅ |
| Feature/unfeature | ❌ | ❌ | ✅ |
| Promote admin | ❌ | ❌ | ✅ |
| Hide / delete listing | ❌ | ✅ (own only, soft-delete) | ✅ |
| CSV export | ❌ | ❌ | ✅ |

### 12.3 Server-Side Enforcement
- Every API route runs Clerk session middleware.
- Admin routes additionally check `user.is_admin = true`.
- Listing ownership validated on every mutation (`crafter.owner_user_id === session.user.id`).

### 12.4 First Admin Bootstrap
- Hardcoded in seed migration: `pavithran7777@gmail.com` is granted `is_admin = true` on first deploy.
- Subsequent admins are promoted via `/admin/users`.

---

## 13. Object Storage & Media Pipeline

### 13.1 Buckets / Folders
- `profile-photos/` — crafter, store, studio profile images
- `portfolio/` — crafter portfolio images
- `event-covers/` — event cover images

### 13.2 Upload Flow
1. Client requests presigned upload URL: `POST /api/upload?type=profile`.
2. Server validates session, returns presigned URL + final asset URL.
3. Client uploads directly to Replit Object Storage.
4. Client POSTs final asset URL with form submit.
5. Server validates URL belongs to a permitted bucket, attaches to entity record.

### 13.3 Constraints
- **Max file size: 5MB** (enforced client-side + server-side via Object Storage policy).
- **Allowed types:** `image/jpeg`, `image/png`, `image/webp`.
- **Max counts:** 1 profile photo, 6 portfolio photos, 1 event cover.

### 13.4 Image Processing
- On upload completion, a server task uses `sharp` to:
  - Generate 3 sizes: thumbnail (160px), medium (640px), full (1280px max width).
  - Compress to WebP.
  - Store all variants alongside original.
- **Variant URLs are first-class on the schema.** Each entity's photo field stores JSON `{ thumb: string, medium: string, full: string, blurhash: string }` — NOT a single URL. The variants generated by `lib/image.ts` must be consumed by the listing/profile pages or the work is wasted. `next/image` derives the `srcset` from this JSON.
- **Sharp processing is moved off the request handler.** The upload route returns 202 with a draft asset ID; a background worker (Replit scheduled task tick + queue table, OR async via `setImmediate` for V1's low concurrency) processes the variants. Client polls or shows an optimistic placeholder. Reasoning: synchronous sharp blocks the Node process for 1–3s per image and exhausts memory on portfolios — see eng-review P1-3.
- Pages serve via Next.js `<Image>` component (which emits `<picture>` with WebP + AVIF fallback automatically).

### 13.5 Cleanup
- Orphan image cleanup job (daily) — deletes uploads >24h old not attached to any record.

---

## 14. Search

### 14.1 V1 Implementation
- Postgres `tsvector` columns on `crafters`, `stores`, `studios`, `events`.
- **STATEMENT-level triggers** update `search_vector` on insert/update of indexed fields. For category-rename fanout (one rename → many parent rebuilds), the trigger collects distinct affected parent IDs into a temp table and runs a single bulk UPDATE with the vector recomputation expression inline — avoids O(N) sequential rebuilds and eliminates row-level lock fanout.
- Query: `WHERE search_vector @@ plainto_tsquery('english', $query) AND city_id = $city LIMIT 6 PER ENTITY TYPE`.

### 14.2 Results Page
- Grouped by entity type with section headers.
- "See all matching crafters" link → filtered listing page.
- Empty state with suggestion text.

### 14.3 V2 Upgrade Path
- Move to Typesense or Meilisearch when result quality matters at scale (>10k records or user complaints).

---

## 15. Email (Transactional)

### 15.1 Provider
- **Resend** with custom domain (mail.crafty.app) configured with SPF, DKIM, DMARC.

### 15.2 V1 Email List
| Trigger | Template | To |
|---------|----------|----|
| Visitor signup | Welcome to Crafty | new visitor |
| Creator signup | Welcome — let's set up your profile | new creator |
| Crafter listing live | Your Crafter profile is live | crafter |
| Store listing live | Your Store is live on Crafty | store owner |
| Studio listing live | Your Studio is live on Crafty | studio owner |
| Event created | Your event is live | organizer |
| Event reminder (T-24h) | Your Crafty event is tomorrow | organizer |
| Listing claimed (admin assist) | Your Crafty listing is now under your control | new claimer |
| Account-level email change | Email verification | user |

### 15.3 No Marketing Emails in V1
- No onboarding drip, no weekly digests, no promotion. Customer.io stub is V2 work.

### 15.4 Email Design
- Plain HTML per Gumroad design system (Crafty logo, light theme, clear CTA button).
- All emails include unsubscribe link (transactional emails legally exempt, but good practice).

---

## 16. Analytics, Tracking & SEO

### 16.1 Analytics Tools
| Tool | Purpose | Implementation |
|------|---------|----------------|
| Google Tag Manager | Single tag-management entry | All other pixels via GTM |
| Google Analytics 4 | Audience + behavior | Through GTM |
| PostHog | Product analytics, funnels, feature flags | JS snippet (server-side `identify` for logged-in users) |
| Microsoft Clarity | Heatmaps + session recording | Direct script (low overhead) |
| Meta (Facebook) Pixel | Instagram retargeting | Through GTM |
| LinkedIn Pixel | LinkedIn retargeting | Through GTM |
| Google Search Console | Organic search monitoring | Verify via meta tag |

### 16.2 Key Events to Track (PostHog)

V1 events MUST cover the design-doc Day-90 gates (self-serve count, activation %, D30 retention, profile-CTR, second-page-views, direct-traffic %). The list below is therefore expanded from the original draft per outside-voice F5 review.

- `page_view` (auto)
- `session_start` { referrer, utm_source, utm_medium, utm_campaign, device } — derives the design-doc "direct-traffic %" gate by inspecting referrer + UTM
- `card_clicked` { entity_type, entity_id }
- `profile_view` { entity_type, entity_id, slug } — fires on detail-page load; powers second-page-views gate via session aggregation
- `heart_toggled` { entity_type, entity_id, action }
- `search_performed` { query, city, results_count }
- `signup_started` { role, **signup_source** } — `signup_source` = `organic | insta | whatsapp | curator-ping | other`, derived from a UTM parameter on the homepage CTA URL (Rahul's WhatsApp messages MUST use `?utm_source=whatsapp&utm_medium=curator`; Insta link-in-bio MUST use `?utm_source=insta`)
- `signup_completed` { role, signup_source }
- `profile_completed` { entity_type, crafter_id } — fires when a crafter has bio + profile photo + ≥1 contact + ≥1 product. The "activation" gate (≥60% of signups within 7 days) is defined as time-to-this-event < 7d.
- `listing_created` { entity_type }
- `event_created`
- `contact_clicked` { entity_type, entity_id, contact_method } — powers profile→contact CTR gate
- `flag_submitted` { entity_type, reason }

**Design-doc Day-90 metrics view** — `/admin/metrics` page computes the 5 gates from PostHog or directly from `analytics_events`-style aggregates:
1. Self-serve crafter count by week (segments `signup_source = organic | insta | whatsapp` separately from `curator-ping`)
2. Activation % = `profile_completed within 7d / signup_completed`, weekly cohort
3. D30 return % = `(crafter who fired ANY event in days 14-30) / activated crafters`, weekly cohort
4. Profile→contact CTR = `contact_clicked / profile_view`, broken out per crafter
5. Second-page-views per session = `% of sessions with profile_view count ≥ 2`
6. Direct-traffic % = `% of sessions with empty referrer or referrer NOT in (instagram, whatsapp, t.co, l.facebook)`

### 16.3 SEO Strategy
- **SSR all public pages** (Next.js `getServerSideProps` / RSC).
- **URL structure** is human-readable and city-aware (`/crafters?city=bengaluru&category=crochet`).
- **Meta tags** dynamically generated per page (Open Graph, Twitter Card with cover image).
- **Schema.org JSON-LD**:
  - Crafter → `LocalBusiness` + `Person`
  - Store → `LocalBusiness` + `Store`
  - Studio → `EducationalOrganization`
  - Event → `Event` (with location, organizer, offers, etc.)
- **Sitemaps & robots.txt** — post-launch.
- **Canonical URLs** to avoid duplicate content (city query param normalized).
- **Image alt text** — required field on profile/portfolio uploads.

---

## 17. Design System (Gumroad-Based)

### 17.1 Source
[Gumroad Design System Figma](https://www.figma.com/design/AjHo0U7QTdN4wVmqVyVb5E/Gumroad-Design-System?node-id=16631-33088&p=f)

The Figma file contains: Style page, Brand page, Icons page, Illustration page. **All Crafty design tokens, components, and patterns are pulled from this system without deviation in V1.**

### 17.2 What we adopt directly
- **Color palette** (light + dark mode) — primary, secondary, neutral, semantic. Resolved tokens already wired in [crafty-app/app/globals.css](crafty-app/app/globals.css): warm cream canvas (`--canvas: 255 251 245`), ink-dark text (`--ink: 23 22 20`), Gumroad pink accent (`--accent: 255 144 232`), with light + dark variants.
- **Typography** — Display: **ABC Maxi Round** (Gumroad's expressive display face). Body / UI: **ABC Diatype** (Gumroad's neutral sans). Self-hosted via Next.js font optimization (`@next/font/local`) per §19.2. **system-ui, -apple-system, and other default-stack fallbacks are FORBIDDEN as primary fonts** — they may appear only as the final terminal fallback in the font-stack array. License procurement is Open Question I (§28.2) and must resolve before launch.
- **Spacing scale** — 4/8 px grid
- **Radius / shadow / border tokens**
- **Buttons** (all states), **inputs**, **cards**, **chips**, **badges**, **modals**, **toasts**
- **Iconography** — **Lucide React** for V1 (already wired in [crafty-app/components/Cards.tsx](crafty-app/components/Cards.tsx); consistent open-source line set, 1500+ icons). Audit / replace with Gumroad icons in V1.5 only where Gumroad's brand-specific icons add measurable value.
- **Illustrations** — used for empty states, 404, 500
- **Error / empty / 404 / 500 page patterns**
- **Light + Dark Mode** — both supported, system preference auto-detect + manual toggle in user menu

### 17.3 Crafty Brand Layer (on top of Gumroad)
- **Logo (V1):** "Crafty" wordmark typeset in the chosen display face (ABC Maxi Round per §17.2, or licensed substitute per Open Q I). No separate brand mark for V1 — the typeface IS the identity. Mark / icon designed in V1.5 (deferred per Open Q F + H).
- **Logo (V1.5+):** Brand mark (designer to deliver) added alongside the wordmark in the AppHeader; favicon / app icon updated to use the mark.
- **Brand voice:** Warm, community-first, India-localized.
- **Photography:** Real crafter and product photos (no stock illustrations on listing pages). Hero anchor + community-moment photos sourced from Cubbon meetups + commissioned shoots per Open Q J.

### 17.4 Component Inventory (V1)
- AppHeader (logo, city selector, nav, profile menu)
- AppFooter
- CitySelectorPill / CitySelectorChipRow (V1: shows Bengaluru only; multi-city + "Add my city" pill deferred to V1.5 per §7.2.1)
- DiscoveryCardRow (horizontal scroll, mobile-first)
- CrafterCard (1:1 square, portrait-led; Featured top-left, Heart top-right, Teaches as inline chip)
- StoreCard (4:3 wide horizontal, logo + address-led)
- StudioCard (1:1 square, logo + discipline-led)
- EventCard (16:9 cover with date badge top-left, Heart top-right)
- CrossLinkCard (one-line "Also runs Aisha's Yarn Store →" with 32px circular thumbnail + chevron; appears on profile pages when same `owner_user_id` has multiple entity types)
- CommunityMomentSection (full-bleed editorial photo + 1-line caption, per §7.1 between rail 2 and 3)
- EmptyCityState (full-bleed editorial replacement when a city has 0 listings across all 4 entity types per §7.1)
- ListingGrid (paginated)
- ProfileHero
- ContactBlock (WhatsApp, Instagram, website CTAs)
- ProductCard (modal trigger)
- FlagModal
- CelebrationScreen (post-publish takeover per §8.3)
- SaveButton / Heart (heart toggle, optimistic per §23.5; 36×36 button in top-right of card photo region)
- DashboardSidebar
- DashboardActivityStrip (saves this week, latest listing)
- ListingForm (multi-step) with LivePreviewPane (desktop side, mobile accordion per §7.10)
- ImageUploader (drag-drop, progress, 5MB enforcement, per-file retry per §23.5)
- AdminTable (sortable, filterable)
- EmptyState (Gumroad illustration variants — see §23.2 mapping)
- Toast / Banner

### 17.4.1 Shared Type Constants

Cross-cutting type unions (entity types, save targets, flag targets) are centralized in [crafty-app/lib/types.ts](crafty-app/lib/types.ts):

```ts
export const ENTITY_TYPES = ['CRAFTER', 'STORE', 'STUDIO', 'EVENT'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const FLAG_REASONS = ['INAPPROPRIATE','SPAM','MISLEADING','COPYRIGHT','OTHER'] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];
```

Zod schemas in API routes import the constants: `z.enum(ENTITY_TYPES)`. Components import the types. Prisma enums in [crafty-app/prisma/schema.prisma] remain the DB truth and are kept in sync manually (a single line of comments above each Prisma enum points back at this file).

### 17.5 Content Hierarchy Per Surface

Each public + creator surface must specify what loads visually first, second, third. The table below is normative — engineers and designers build to it without asking.

| Surface | Primary (load first, dominant) | Secondary (do second) | Tertiary (scan/scroll) |
|---------|-------------------------------|-----------------------|-----------------------|
| Homepage (mobile) | Sticky header + city pill row + first rail "Crafters in [City]" | Stores rail, Learn rail, Events rail (in that order) | Hero CTA copy, footer |
| Homepage (desktop) | Sticky header + city pill row + first rail visible above 1080px fold | Same 3 secondary rails | Hero CTA, footer |
| Crafter profile (mobile) | Hero photo (16:9 at ~50% viewport height) + name + ContactBlock — **all above fold** at 414×600 | Tagline, bio, portfolio gallery (2-col) | Products, classes, cross-listing badge, report |
| Store / Studio detail | Hero photo + name + ContactBlock above fold | Address + Maps embed (skip if `is_online_only`), supply categories / disciplines | Operating hours, claim notice, cross-link, report |
| Event detail | Cover image + date/time + Register CTA + Add-to-Calendar — above fold | Description, venue + Maps, organizer card | Free/paid badge, report |
| Listing page (grid) | Filter chip row + top 3-6 cards | Remaining grid + pagination | Empty state if no results |
| Search results | Query echo + grouped sections (6 results each) | "See all" links per group | Empty state suggestion |
| Creator dashboard (visit ≥1) | Activity strip ("Your profile got 47 saves this week" + latest listing thumb) | Listing cards with edit/delete + per-type "Add" CTAs | Saved tab, settings, logout |
| Creator dashboard (empty / first visit) | Single "Create Crafter Profile" CTA + onboarding nudge | Sidebar nav | Help link |
| Admin /flags | Pending flag queue with reason + reporter + entity link | Resolved tail (today / yesterday / older) | Cross-links to listings/users |
| Admin /listings | Search bar + filters (type, city, claimed, featured) + table | Bulk action bar | Featured highlights, recently created |

**Above-fold contract:** "Above fold" means 414×600px (smallest mobile target) and 1280×720px (desktop baseline). If a surface's primary content does not fit, the design has failed.

**Card shape contract** — homepage rails use **different card shapes by entity type** so users can scan all four rails as visually distinct content categories:
- CrafterCard: 1:1 square (portrait-led, photo of person or hands-at-work).
- StoreCard: 4:3 wide horizontal (logo or storefront, address-led; reads like a small business card).
- StudioCard: 1:1 square (institute logo or studio shot, disciplines-led).
- EventCard: 16:9 cover with date badge top-left (poster feel; date is the primary signal).

This intentional variety is the scan-ability mechanism. Uniform card shapes across all four rails would collapse hierarchy and read as four copies of one rail.

### 17.6 Crafty Design Tokens (Resolved)

The PRD is the source of truth for design tokens. The values below match what is already wired in [crafty-app/app/globals.css](crafty-app/app/globals.css) and [crafty-app/tailwind.config.ts](crafty-app/tailwind.config.ts) as of 2026-05-02. Any future Gumroad-DS audit must reconcile to these values, not the other way around — these are warm-tone Crafty-specific overlays on Gumroad's broader system, deliberately chosen.

#### Color (light mode)
| Token | RGB | Hex | Usage |
|-------|-----|-----|-------|
| `--canvas` | 255 251 245 | #FFFBF5 | Page background (warm cream) |
| `--canvas-raised` | 255 255 255 | #FFFFFF | Cards, modals, dropdowns |
| `--canvas-sunken` | 246 240 230 | #F6F0E6 | Subtle backgrounds (chips, skeletons) |
| `--ink` | 23 22 20 | #171614 | Primary text |
| `--ink-muted` | 84 80 73 | #545049 | Secondary text |
| `--ink-subtle` | 134 128 118 | #868076 | Tertiary text, captions |
| `--line` | 230 222 208 | #E6DED0 | Borders, dividers |
| `--accent` | 255 144 232 | #FF90E8 | Primary accent (Gumroad pink) — used sparingly: primary buttons, featured badges, active state |
| `--accent-fg` | 23 22 20 | #171614 | Foreground on accent (always ink-dark) |
| `--accent-soft` | 255 224 246 | #FFE0F6 | Accent background tint (pill backgrounds, soft fills) |
| `--success` | 26 142 99 | #1A8E63 | Success toasts, confirmation |
| `--danger` | 211 64 74 | #D3404A | Error toasts, destructive actions |

#### Color (dark mode)
| Token | RGB | Hex | Usage |
|-------|-----|-----|-------|
| `--canvas` | 16 16 18 | #101012 | Page background |
| `--canvas-raised` | 24 24 28 | #18181C | Cards, modals |
| `--canvas-sunken` | 10 10 12 | #0A0A0C | Subtle backgrounds |
| `--ink` | 246 244 240 | #F6F4F0 | Primary text |
| `--ink-muted` | 178 174 167 | #B2AEA7 | Secondary text |
| `--ink-subtle` | 122 118 110 | #7A766E | Tertiary text |
| `--line` | 46 44 50 | #2E2C32 | Borders |
| `--accent` | 255 144 232 | #FF90E8 | Same pink (intentionally consistent across modes) |
| `--accent-fg` | 23 22 20 | #171614 | Ink on accent (legible on pink) |
| `--accent-soft` | 64 30 56 | #401E38 | Dark variant of accent-soft |

#### Radius scale
| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 6px | Small chips, inline tags |
| `rounded-md` | 10px | Buttons, inputs |
| `rounded-lg` | 16px | Cards, modals |
| `rounded-xl` | 22px | Hero containers, full-bleed sections with corner radius |

#### Spacing
- 4 / 8 px grid (Tailwind default scale).
- Card internal padding: 12px (mobile), 16px (desktop).
- Section vertical rhythm on homepage: 32px (mobile), 64px (desktop) between rails.

#### Shadow (Gumroad "stamp" pattern)
- `shadow-card`: `0 1px 0 rgb(var(--shadow-1) / 0.04), 0 4px 18px -4px rgb(var(--shadow-2) / 0.10)` — resting card.
- `shadow-pop`: `0 2px 0 rgb(var(--shadow-1) / 0.06), 0 12px 40px -8px rgb(var(--shadow-2) / 0.18)` — elevated (modals, hover).
- Card hover translates `-2px / -2px` and exposes a 4px ink-colored offset shadow ("stamped" feel) — 100ms ease.

#### Component states (normative — every interactive component must implement all)
| Component | default | hover | focus (kbd) | active | disabled | loading |
|-----------|---------|-------|-------------|--------|----------|---------|
| Button (primary) | accent fill, ink-dark text | translate -1/-1, ink-shadow 3px | 2px ring offset, color = ink | translate 0/0, no shadow | 50% opacity, no transform | inline spinner replaces label, button locked |
| Button (ghost) | transparent, ink-dark text | canvas-sunken bg | 2px ring | canvas-sunken | 50% opacity | spinner replaces label |
| Input | canvas-raised, line border 1.5px | line slightly darker | 2px accent ring + line transparent | n/a | 50% opacity, canvas-sunken bg | n/a (form-level loading) |
| Input (error) | line-color = danger | n/a | n/a | n/a | n/a | n/a |
| Card | canvas-raised, line border, shadow-card | translate -2/-2, 4px ink offset | 2px accent ring | translate 0 | n/a | skeleton variant |
| Heart toggle | outline ink-muted | scale 1.05 | 2px ring | scale 0.95 | n/a | n/a (optimistic) |

### 17.7 Motion Principles

**Principle:** Motion serves orientation, never decoration. If a motion does not help the user understand "what changed" or "where I am", remove it.

**Three patterns:**

1. **State changes (100-200ms ease-out)** — element-level transitions. Card hover translate, heart fill, button press, toggle flip. Snappy. Always reversible. Default Tailwind: `transition: all 100ms ease-out`.

2. **Layout changes (240ms ease-in-out with FLIP)** — list reorders, content swaps, modal entrance. Use `framer-motion` `<AnimatePresence>` + `<motion.div layout>` for list reorders. Modal entrance: 200ms slide-up (12px offset → 0) + fade-in (0 → 1).

3. **Page-level transitions (skeleton swaps, not fades)** — when navigating between routes or changing city, do NOT cross-fade pages. Instead, render skeleton placeholders immediately and swap content as it resolves. The skeleton is the transition.

**Specific moments:**
- **Heart fill (highest-stakes micro-interaction):** scale 1 → 1.15 → 1 over 240ms with spring easing (`stiffness: 400, damping: 20`); accent pink fills as a radial expand from tap point. Optimistic — fires before server response.
- **City switch:** No page fade. All 4 rails simultaneously swap to skeletons; each rail re-populates as its query resolves (per §23.5). City pill row's selected pill highlight slides 200ms ease-out from old → new pill.
- **Toast:** Slide-up + fade-in from bottom-right (desktop) / bottom-center (mobile), 240ms ease-out. Auto-dismiss fade after 4s.
- **Confetti (first-listing celebration only):** 60-particle burst, 1.5s duration, ease-out. Used exactly twice in the product: post-publish celebration screen + first paint of public profile with `?welcome=1`.
- **Page-route transitions:** None. Browser default. Reduces motion sickness, signals "Crafty respects your time."

**Reduced-motion compliance:** All motion above wraps in `@media (prefers-reduced-motion: reduce)` checks. Reduced-motion users see instant state changes, no slide-ups, no confetti, no scale bounces. Heart still optimistic-fills but instant.

---

## 18. Responsive Strategy

### 18.1 Mobile-First Discovery (buyers)
- All buyer-facing pages designed mobile-first (320–428px viewports), then progressively enhanced.
- Touch targets ≥44×44px.
- Horizontal card rows on homepage scrollable with snap-to-card behavior.
- Sticky header on mobile (logo + city selector); collapses on scroll-down, reappears on scroll-up.
- Mobile search opens fullscreen overlay.

### 18.2 Web-First Creator/Admin Dashboards
- Dashboard, listing editor, admin console designed at 1280px+, then made responsive down to 768px (tablet).
- On <768px, dashboard collapses to single column with stacked sections; full functionality preserved but visually denser.
- Listing form uses multi-step wizard on mobile (one section per screen) vs single long form on desktop.

### 18.3 Breakpoints (Tailwind defaults)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### 18.4 Per-Surface Responsive Spec (Normative)

| Surface | Mobile (<md, <768px) | Tablet (md-lg, 768-1023px) | Desktop (lg+, ≥1024px) |
|---------|----------------------|----------------------------|-------------------------|
| Homepage hero | 480px tall, type stacked, CTAs stacked | 560px tall, type left-aligned in left half, CTAs side-by-side | 640px tall, type left-aligned in left 60%, CTAs side-by-side |
| Discovery rails | Horizontal snap scroll, 2.2 cards visible | Horizontal snap scroll, 3.2 cards visible | Horizontal snap scroll, 4.5 cards visible (wider container, no overflow) |
| Listing grid | 2 cols | 3 cols | 4 cols |
| Crafter profile | Hero 16:9 + ContactBlock above fold per §17.5 | Hero 16:9 + ContactBlock right-side rail | Two-col: hero left 60%, ContactBlock + bio sticky right 40% |
| Crafter portfolio gallery | 2 cols | 3 cols | 3 cols (4 if image count is 6) |
| Event detail | Cover full-bleed, single-col content | Cover full-bleed, single-col content | Cover left 60%, register CTA + venue right 40% sticky |
| Search results | Stacked groups | Stacked groups | Stacked groups (no multi-col — readability priority) |
| Creator dashboard | Single column, sidebar collapses to hamburger | Two-col (240px sidebar + main) | Two-col (280px sidebar + main + 320px right preview pane in form view) |
| Listing form | Multi-step wizard (one section per screen, sticky "Next") | Multi-step wizard (one section per screen) | Single long form with sticky right preview pane |
| Admin tables | Cards (one row per card, key fields visible, secondary in expand) | Compact table | Full table with all columns |
| City pill row | Horizontal scroll snap, 5-6 visible | All 6+ visible | All visible, no scroll |

**Tablet philosophy:** Tablet is not "small desktop" — it's its own tier. Common tablet use in India (iPads, larger Android tablets) leans heavier toward studio operators (Anjali, §4.4) using the dashboard. Treat tablet UX with intent.

### 18.5 No PWA in V1
- V1 ships as a responsive web app only. No "Add to home screen" prompt, no service worker. Native app deferred to V3.

---

## 19. Performance Requirements

### 19.1 Core Web Vitals Targets
| Metric | Target (Mobile, 4G) | Target (Desktop) |
|--------|--------------------:|-----------------:|
| LCP (Largest Contentful Paint) | ≤2.5s | ≤1.8s |
| FID / INP | ≤200ms | ≤100ms |
| CLS | ≤0.1 | ≤0.1 |
| TTFB | ≤800ms | ≤500ms |

### 19.2 Implementation Practices
- SSR + streaming for above-the-fold content.
- **Images use Next.js `<Image>` exclusively** — never raw `<img>`. Required props: `width`, `height` (matching variant aspect to prevent CLS), `sizes="(max-width:768px) 50vw, 25vw"` for cards, `placeholder="blur"` with stored blurhash. Above-the-fold first-rail-first-card uses `priority` + `fetchPriority="high"` so it becomes the LCP candidate hint. AVIF + WebP via Next config `images.formats: ['image/avif','image/webp']`.
- Fonts: self-hosted via Next.js font optimization, preloaded.
- JS bundle: <150KB gzipped on landing page. **`ClerkProvider` is NOT mounted in root layout** — wraps only `/dashboard/*`, `/admin/*`, `/sign-in`, `/sign-up`, and the SaveButton component (via dynamic import). Saves ~80KB on the homepage bundle. CI bundle-size check enforces the budget.
- Code-splitting per route.
- HTTP caching: Cache-Control on static assets, ISR for listing pages (revalidate every 60s). Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` so the CDN edge holds cache between regens.
- Database: indexed queries; avoid N+1 with Prisma includes.
  - Listing pages use `select` to limit fields fetched (don't pull `bio`, `portfolio_photos`, `classes_json` for card rendering — only profile detail page).
  - `getCities()` and `getCityBySlug()` wrap in Next.js `unstable_cache` with `revalidate: 3600` — cities are admin-edited rarely, no need to query per ISR regen.
  - Detail pages run all dependent queries in a single `Promise.all` after the primary entity resolves; `loadCrafter` (and equivalent for store/studio/event) is wrapped in React `cache()` so `generateMetadata` and the page component share one round-trip.
- **FTS triggers are STATEMENT-level** (per eng review): join-table inserts/deletes collect distinct parent IDs into a temp set and bulk-update vectors once. Avoids O(N) lock on category rename.
- 24-card pagination prevents large payloads.

### 19.3 Test Stack (Normative)

V1 ships with a **real test pyramid**. No deferral; tests are part of every feature, not a follow-up.

| Layer | Tool | Scope | Where |
|-------|------|-------|-------|
| Unit | **Vitest** | Pure helpers ([crafty-app/lib/util.ts](crafty-app/lib/util.ts), [lib/auth.ts](crafty-app/lib/auth.ts), [lib/cities.ts](crafty-app/lib/cities.ts), [lib/image.ts](crafty-app/lib/image.ts)), Zod schemas, slug generation, deep-link builders | `crafty-app/__tests__/unit/` |
| Component | **Vitest + @testing-library/react + jsdom** | CrafterCard, CitySelector, DiscoveryRail, ContactBlock — render assertions and event handling | `crafty-app/__tests__/components/` |
| Integration | **Vitest** with a test Postgres (Docker compose locally; ephemeral DB on CI) | API route handlers (`/api/crafters`, `/api/saves`, `/api/upload`, `/api/flags`), Prisma queries, FTS triggers | `crafty-app/__tests__/api/` |
| E2E | **Playwright** | Critical user flows: visitor → save (sign-in flow), creator signup → publish → celebration, city switch with rail reload, search empty/results states, admin flag dismiss | `crafty-app/e2e/` |
| A11y | **axe-core** (in CI via `@axe-core/playwright`) + **vitest-axe** (component-level) | Every page in E2E suite + every component in component tests | inline in E2E + component files |
| Visual contrast | Custom Vitest test reading `globals.css` tokens, computing WCAG ratios per §22.4 audit table | Token regression guard | `crafty-app/__tests__/contrast.test.ts` (T2 in TODOS.md) |

**Critical user flows for E2E (must each have a test):**
1. Anonymous visitor lands homepage → city is Bengaluru → first rail loads cards (mocked DB)
2. Anonymous visitor taps heart → "Sign in to save" modal → mocks Clerk → save persists post-auth
3. Creator signup → onboarding photo upload → first listing form → publish → celebration screen → public profile
4. Crafter dashboard → activity strip with save count → edit listing → save → public profile reflects edit
5. City switch → all 4 rails replace with skeletons → re-render with new data, with one rail simulating fail+retry
6. Empty city: city with 0 listings shows "Be the first" editorial section, not 4 stacked empty states (§7.1 contract)
7. Admin: report listing → flag arrives in queue → admin dismisses with optimistic UI + 3s undo → flag stays dismissed after undo window
8. Image upload: 6 portfolio photos with 1 simulated failure → per-file retry succeeds → form submits

**CI wiring (Week 1):**
- `bun test` (or `npm test`) runs Vitest unit + component + integration suites.
- `bun test:e2e` runs Playwright (headless Chromium + Mobile Safari emulation for the mobile-first flows).
- GitHub Actions or Replit-equivalent CI runs both on every push to `main` + PR. axe-core failures gate the merge (no a11y regression to main).
- `bun test:contrast` runs the WCAG token guard (T2 from TODOS.md).

**Test data:** seed script `__tests__/seed-test-db.ts` populates 3 cities, 5 crafters, 3 stores, 2 studios, 4 events, 2 admin + 3 creator users. Reset between integration test runs via Prisma `db reset`.

**Coverage target (V1):** **All 47 paths from the eng-review test diagram covered before launch.** No "rolling-completion" or "post-launch follow-up" carve-outs. Specifically:
- 100% of API route paths (29 paths across `/api/crafters`, `/api/stores`, `/api/studios`, `/api/events`, `/api/saves`, `/api/upload`, `/api/flags`, `/api/search`, `/api/city-requests`, `/api/cron/*`).
- 100% of `lib/**` exported functions (slugify edge cases, formatINR boundaries, formatDateTime IST, ensureUniqueSlug collisions, auth dev-stub + Clerk lazy-upsert + admin gate).
- 8 critical E2E flows above.
- Integration tests against ephemeral Postgres for **FTS triggers**: each of the 4 entity vectors (crafter, store, studio, event) gets a test for parent-table updates AND join-table inserts/deletes — see the join-table trigger logic in [crafty-app/prisma/raw-migrations/0001_fts_and_constraints.sql].
- Visual contrast guard test reading `globals.css` token values against §22.4 audit table.

**REGRESSION TEST (mandatory, per IRON RULE):** Concurrent-tap test on `/api/saves` simulating optimistic-UI double-tap. Test arrangement: `Promise.all([POST /api/saves, POST /api/saves])` with identical `(user_id, entity_type, entity_id)`. Expected: both return 2xx (one `saved:true`, one no-op or also `saved:true`), no 5xx, exactly one `Save` row in DB after both resolve. This guards the §20.3 race-safety contract.

**Why this discipline:** the design review locked in 28 design decisions (optimistic UI, parallel rail loading, celebration screen, IP-geo banner, live preview pane, etc.). Each of these has a state machine. Without tests, regressions ship silently and the launch-week firefighting cost dwarfs the test-writing cost. With AI-assisted coding, each test costs minutes. Boil the lake.

**Why this discipline:** the design review locked in 28 design decisions (optimistic UI, parallel rail loading, celebration screen, IP-geo banner, live preview pane, etc.). Each of these has a state machine. Without tests, regressions ship silently and the launch-week firefighting cost dwarfs the test-writing cost. With AI-assisted coding, each test costs minutes. Boil the lake.

---

## 20. Security Requirements

### 20.1 Authentication
- All auth via Clerk (managed; SOC 2 compliant).
- Session tokens HTTP-only, Secure, SameSite=Lax.
- Magic links and SSO for safer flows than password where possible.

### 20.2 Transport
- HTTPS-only via Replit (Let's Encrypt).
- HSTS header (`max-age=31536000; includeSubDomains; preload`).

### 20.3 Application Security
- All inputs validated server-side via Zod schemas. `entity_id` fields bounded with `.max(30)` (cuid is 25 chars).
- Parameterized queries (Prisma) — no SQL injection surface.
- Output encoding to prevent XSS — React auto-escapes by default. Avoid raw HTML injection helpers; sanitize via DOMPurify if any rich text becomes necessary.
- File uploads:
  - MIME type allowlist (jpeg/png/webp).
  - **Content-Length pre-check at handler entry** — reject requests >6MB (1MB margin over 5MB cap) BEFORE parsing FormData. Prevents memory-pressure DoS from large body uploads.
  - Server-side `sharp` validation on the parsed buffer (catches MIME spoofing).
  - File-magic check via `sharp` metadata; virus scan via `clamav` deferred to V1.5 if abuse appears.
- CSRF protection on state-changing routes (Clerk + same-site cookies cover most).
- **Rate limiting** via `@upstash/ratelimit` (Upstash Redis free tier) at 30 req/min/IP across the following routes: `/api/saves` POST, `/api/flags` POST, `/api/crafters` POST + PATCH + DELETE, `/api/stores` + `/api/studios` + `/api/events` POST, `/api/upload` POST, `/api/search` GET. Implemented as a thin middleware wrapper applied to each route. Limit shared per IP across all rate-limited routes.
- **Entity-existence validation on flag submission** — `/api/flags` POST validates that the referenced entity exists in the matching table (`Crafter`/`Store`/`Studio`/`Event`) before insert. Returns 404 for non-existent IDs. Prevents flag-spam against fabricated IDs polluting moderation queue.
- **Save toggle race-safety** — `/api/saves` POST wraps toggle in a transaction: try `delete` (returns count), if 0 rows deleted, `create`. Catch P2002 unique-constraint violation as "already saved" and return `saved: true`. Required because optimistic UI (per §23.5) sends double-taps.
- Content Security Policy header restricting script sources to self + Clerk + GTM.
- Secrets in Replit Secrets Manager; never committed. `CRON_SHARED_SECRET` rotated quarterly per ops runbook.

### 20.4 Authorization
- Server-side ownership checks on every mutation.
- `is_admin` checks on all `/admin/*` routes.
- Soft-delete (set `is_published = false`) preferred over hard-delete for listings.

### 20.5 Bot / Spam Mitigation
- V1: Clerk + email verification handles ~95% of automated signups.
- Light reCAPTCHA v3 on signup + listing creation if abuse appears post-launch.
- Listing creation rate-limit: 1 listing per type per user per day.

### 20.6 Data Backup
- Postgres daily automated backups (Replit-managed) with 14-day retention.
- Object Storage versioning (if Replit supports) for image uploads.
- Admin CSV export available for self-managed backups.

---

## 21. Privacy, Legal & Compliance

### 21.1 Documents (V1 — REAL, not placeholder; launch-blocker)

Per outside-voice F15 review on 2026-05-02: placeholder ToS + Privacy is real DPDP Act 2023 exposure for Dealquick Labs Pvt Ltd. V1 ships with conservative self-drafted full text:

- `/terms` — Terms of Service. Founder-drafted, conservative posture: no warranties on listings, no purchase facilitation (transactions happen off-platform), explicit IP responsibility clause for uploaded content (DMCA-style), no liability for crafter/buyer disputes, age 13+ visitor / 18+ creator minimum, takedown SLA (24h per moderation policy), clear contact email (hello@crafty.app).
- `/privacy` — Privacy Policy. DPDP Act 2023-aware: enumerate PII collected (email, display name, profile photo, contact handles), legal basis (consent at signup), purpose limitation, retention (account lifetime + 30 days), data subject rights (deletion via support email, processed within 30 days), no cross-border data transfer (Replit India region or equivalent), data fiduciary contact = founder.
- **No external counsel review for V1.** Founder explicitly accepted this risk in the design implementation plan. Mitigation: keep both documents conservative; iterate post-launch if disputes arise.
- Both documents go live Week 1-2 alongside the moderation policy; treated as a launch-blocker per Definition of Done.

### 21.2 Consent
- Single click-through agreement at signup: "I agree to the Terms and Privacy Policy" — required.
- No per-listing checkbox.
- No cookie consent banner V1 (Indian law currently lighter-touch; GDPR not applicable as Crafty serves India). Reassess at scale or if expansion outside India is contemplated.

### 21.3 PII Handled
- Email (from Clerk)
- Display name
- Profile photo
- Public contact info (WhatsApp, Instagram, website) — explicitly chosen by user

### 21.4 PII Not Collected
- No phone numbers from buyers.
- No payment info.
- No precise geolocation (only city-level, user-selected).

### 21.5 Data Subject Rights
- Account deletion: user can request deletion via support email; admin processes within 30 days.
- Data export: V1 — admin-assisted via support email. V2 — self-serve.

### 21.6 Children
- Crafty is not directed at users under 13. ToS will state minimum age 13 (or 18 for creators).

---

## 22. Accessibility

### 22.1 Target
- **WCAG 2.1 AA** compliance.

### 22.2 Practices
- Semantic HTML.
- Color contrast: rely on Gumroad DS (assumed AA-compliant; verify in design QA).
- Keyboard navigation for all interactive elements; visible focus rings.
- Form labels properly associated.
- Alt text required on all uploaded images (form-enforced).
- Skip-to-content link.
- ARIA roles where semantic HTML is insufficient (modals, toasts).
- Mobile tap targets ≥44px.

### 22.3 Testing
- Automated: axe-core CI check.
- Manual: keyboard-only walkthrough + VoiceOver/TalkBack screen reader pass before launch.

### 22.4 Color Contrast Audit (token pairs)

All text-on-background combinations used in the design must meet WCAG 2.1 AA (≥4.5:1 for body text, ≥3:1 for large text 18pt+ / 14pt bold). The table below enumerates the combinations; engineer or designer must verify computed values during build using a contrast checker (e.g. Stark, WebAIM Contrast Checker).

| FG token | BG token | Use case | Computed (light) | AA target | Notes |
|---|---|---|---|---|---|
| `--ink` (#171614) | `--canvas` (#FFFBF5) | Body text on page | ~17:1 ✅ | ≥4.5:1 | Pass |
| `--ink-muted` (#545049) | `--canvas` (#FFFBF5) | Secondary text on page | ~7.5:1 ✅ | ≥4.5:1 | Pass |
| `--ink-subtle` (#868076) | `--canvas` (#FFFBF5) | Tertiary captions | ~3.6:1 ⚠️ | ≥4.5:1 (body), ≥3:1 (large) | **Fails AA for body — only use for large/decorative text or darken token** |
| `--ink` (#171614) | `--canvas-raised` (#FFFFFF) | Card text | ~18:1 ✅ | ≥4.5:1 | Pass |
| `--ink-muted` (#545049) | `--canvas-sunken` (#F6F0E6) | Chip text | ~7:1 ✅ | ≥4.5:1 | Pass |
| `--accent-fg` (#171614) | `--accent` (#FF90E8) | Primary button text | ~6.5:1 ✅ | ≥4.5:1 | Pass |
| `--ink` (#171614) | `--accent-soft` (#FFE0F6) | Pill text on accent-soft | ~16:1 ✅ | ≥4.5:1 | Pass |
| `--accent` (#FF90E8) | `--canvas` (#FFFBF5) | Accent text on cream | ~2.1:1 ❌ | ≥4.5:1 | **Fails AA — accent pink is NOT an acceptable text color on cream. Use only as fill/background** |
| `--success` (#1A8E63) | `--canvas` (#FFFBF5) | Success toast body | ~4.6:1 ✅ | ≥4.5:1 | Pass |
| `--danger` (#D3404A) | `--canvas` (#FFFBF5) | Error text | ~4.5:1 ✅ | ≥4.5:1 | Pass (borderline; engineer to verify) |

**Action items from audit:**
- `--ink-subtle` is below AA for body text on canvas. Use only for caption-size text (large per WCAG = 18pt+ / 14pt bold) or darken the token to ~#6E6960.
- `--accent` (pink) is text-illegible on cream. PRD already mandates "used sparingly: primary buttons, featured badges, active state" (§17.6) — never as body or link text.
- Re-run this audit for dark mode token pairs before launch.

### 22.5 Keyboard Navigation Spec (Normative)

**Tab order — Homepage:**
1. Skip-to-content link (visible on focus, jumps to `<main>`)
2. Logo (links home)
3. City pill row (single tab stop; arrow keys navigate between pills; Enter selects; Space scrolls horizontally)
4. Hamburger / nav (mobile expands menu; desktop shows full nav inline)
5. Login / profile menu
6. Hero primary CTA "Explore Crafters"
7. Hero secondary CTA "List Your Profile"
8. First card of "Crafters in [City]" rail (Tab moves to next card; arrow-keys also navigate within rail)
9. "See all crafters →" link
10. (repeat 8-9 for Stores, Community moment image link, Learn, Events)
11. Footer links

**Discovery rail interaction:**
- Tab cycles through cards in the rail in display order.
- Right-arrow / Left-arrow scrolls the rail by one card width within the rail (focus stays on card).
- Page-down / Page-up scrolls the page (browser default).

**Modal interaction:**
- When modal opens (sign-in, flag, claim, city-request, etc.):
  - Focus moves immediately to the first interactive element in the modal (typically the close button, then primary input).
  - Tab cycles within modal only (focus trap).
  - Shift+Tab cycles backward within modal.
  - Escape closes the modal.
  - On close, focus returns to the element that triggered the modal.

**Heart toggle (and all interactive icons):**
- Standard `<button>` element with `aria-pressed="true|false"` reflecting save state.
- Visible focus ring (`outline-2 outline-accent`) on focus.
- Enter / Space activates.
- Optimistic state change announces via `aria-live="polite"` region: "Saved [crafter name]" / "Removed [crafter name]".

**City pill row (ARIA):**
- `role="tablist"` with `aria-label="Choose a city"`.
- Each pill is `role="tab"` with `aria-selected="true"` for active.
- Selecting a pill announces "Showing [City]. 4 sections updated." via `aria-live="polite"`.

**Card a11y:**
- Each CrafterCard / StoreCard / StudioCard / EventCard wraps in a single `<a>` with full card click area (per existing [crafty-app/components/Cards.tsx](crafty-app/components/Cards.tsx)).
- Heart button inside card uses `event.stopPropagation()` so clicking heart does not navigate.
- Card image: alt text from user-supplied alt field (§16.3, required at upload).

### 22.6 A11y System Preferences

Crafty honors three `prefers-*` media queries:

1. **`prefers-reduced-motion: reduce`** — no confetti on first publish, no scale bounces on heart, no slide-up on modals (instant fade), no city-pill-slide animation. Skeleton swaps still occur (functional, not decorative). See §17.7.
2. **`prefers-color-scheme: dark`** — auto-applies dark mode tokens on first visit if user has not set a manual theme preference (manual ThemeToggle persists in cookie, overrides system pref).
3. **`prefers-contrast: more`** — V1.5: defer. V1: ensure no critical content depends on contrast-low decoration; the AA audit (§22.4) is sufficient for V1.

### 22.7 Progressive Enhancement

All public pages (homepage, listing pages, detail pages, search) **must render and remain functional with JavaScript disabled**:
- Server-rendered HTML displays full content + navigation.
- Forms (signup, listing creation, flag) require JS; show a `<noscript>` notice with instructions to enable JS or use an alternate path (e.g., email hello@crafty.app for support).
- Heart/save requires JS; degrades to a "Sign in to save" link that takes users through Clerk OAuth, then re-renders the page server-side with the heart filled.
- Search uses `<form action="/search" method="get">` — works without JS; results page renders SSR.

This protects screen-reader-with-slow-network users (a real Indian scenario) and SEO crawlers (which sometimes execute JS poorly).

---

## 23. Error Handling & Empty States

### 23.1 Error Pages
- **404** — Gumroad illustration + "Looks like this craft got lost. Try the homepage." → home CTA.
- **500** — Gumroad illustration + "Something broke at our end. We're on it." → home + contact CTAs.
- **Forbidden (403)** — "You don't have access to this page." → login CTA.

### 23.2 Empty States

Each empty state pairs warm copy with a specific Gumroad illustration (illustration names are provisional pending designer access to Gumroad's illustration page; designer to confirm and supply final SVGs):

| State | Illustration (provisional) | Copy | Primary action |
|-------|----------------------------|------|----------------|
| No crafters in city | "Empty Shelf" | "No crafters in [City] yet. Be the first." | "List your profile →" |
| No stores in city | "Empty Shelf" | "No supply stores in [City] yet." | "List your store →" |
| No studios in city | "Empty Shelf" | "No studios in [City] yet." | "List your studio →" |
| No events in city | "Calendar Open" | "No upcoming events in [City]. Host the first one." | "Add an event →" |
| Visitor saved list (empty) | "Heart Outline" | "Heart any crafter, store, studio, or event and they'll show up here." | "Discover →" (links to /crafters) |
| Search no results | "Searching" | "No matches for '[query]' in [City]." | "Try a different keyword" + secondary "Browse all crafters →" |
| Filter no results | "Funnel" | "No matches for these filters." | "Reset filters →" |
| Creator dashboard (first-time) | "Pencil + Paper" | "Welcome to Crafty. Let's get you discovered in [City]." | "Create Crafter Profile →" (per §17.5) |
| Admin flag queue (zero pending) | "Calm Sea" | "All clear. No flags need review." | (no CTA; show resolved tail) |

Illustrations render at 160px (mobile) / 200px (desktop). Always paired with copy below, primary CTA below copy. Centered vertically in the empty container, generous whitespace above and below.

### 23.3 Form Validation
- Inline field errors on blur + on submit.
- Server-side validation errors mapped back to fields.
- Failed image upload → toast: "Couldn't upload [file]. Try a smaller file (max 5MB)."

### 23.4 Toast Notifications
- Success: "Saved", "Listing published", "Event created", etc.
- Error: "Couldn't save. Try again."
- Info: city change confirmation, signup success.
- Auto-dismiss 4s; persistent for errors requiring action.

### 23.5 State Coverage Matrix (Normative)

Every interactive feature must implement all five states. UI without a defined state for a row is incomplete.

| Feature | Loading | Empty | Error | Success | Partial / Saving |
|---------|---------|-------|-------|---------|------------------|
| Heart / Save toggle | n/a (instant) | n/a | Heart un-fills + toast "Couldn't save. Try again." | Optimistic fill on tap; server reconciles in background. Toast "Saved to your list" on first save only. | Optimistic fill, server pending dot (not visible to user) |
| Image upload (single file) | Per-file progress bar 0-100%, filename + size shown | n/a | Inline error chip on the file: "Couldn't upload — too large / wrong type / network. **Retry**". File stays in slot until retried or dismissed. | Thumbnail replaces progress bar; checkmark briefly. | Single file at any state in a multi-file picker does not block other files. |
| Image upload (multi-file, e.g. 6 portfolio) | Parallel uploads, max 3 concurrent. Each file owns its row. | n/a | Failed files show retry button inline; successful files persist; user can submit when required slots filled. | All files thumbnailed in their slots. | Successful uploads are durable across retries. Form-level submit is gated on `≥1 required slot filled`. |
| Multi-step listing form | Step transition shows brief spinner (≤200ms); submit shows full-screen "Publishing your listing…" overlay until redirect | n/a | Field-level error inline on blur and on submit; server-validation errors mapped back to fields by name | Redirect to public profile + toast "Listing live" + email via Resend | Auto-save draft to localStorage every 30s within a step. On reload, prompt "Resume your draft?" |
| Search results | Skeleton list (6 placeholder rows per entity-type group) shown while query runs | "No matches in [City]. Try a different keyword." | Toast "Search hit a snag. Try again." + retain query in input | Grouped results render | n/a |
| City switch | All 4 rails replace cards with skeleton (6 card placeholders) — render in parallel as each query resolves | Per-rail empty state if that section has 0 listings in city; other rails unaffected | Per-rail error: "Couldn't load [Crafters] in [City]. **Retry**" — other 3 rails continue | URL + cookie update; rails populated; toast "Showing [City]" (3s, optional) | Independent per-rail. One rail loading does not block the others. |
| Discovery rails (initial homepage SSR) | SSR renders skeleton on cold cache; client hydrates and requests fresh data; rails settle in. ISR revalidate 60s (§19.2). | Per-rail empty state if no city listings | Per-rail retry; no full-page error | Cards visible, lazy-load images via blurhash | n/a |
| Save toggle when not signed in | n/a | n/a | n/a | Modal "Sign in to save" → Clerk SSO → resume save action on return | Pre-auth save intent persisted in sessionStorage; replays on auth return |
| Event registration click | n/a (external link) | n/a | If `registration_url` is empty, button is disabled with "Registration TBD" | Outbound link in new tab + analytics fire | n/a |
| Creator dashboard load | Sidebar renders immediately; main panel skeleton until data arrives | First-time empty state per §17.5 hierarchy | Toast "Couldn't load your listings" + retry CTA | Activity strip + listing cards | n/a |
| Admin flag action (Dismiss / Hide / Delete / Ban) | Action button shows inline spinner | n/a | Toast on failure; row stays in queue | Row collapses out of queue with 3s undo toast | Optimistic remove with 3s undo; rollback on user undo or server error |
| Admin CSV export | "Generating…" button state | n/a | Toast on server failure | Browser download triggered + toast "Exported N records" | n/a |

**Implementation notes:**
- Optimistic UI is required for heart/save — see §10.3 augmentation: client toggles heart immediately, fires POST /api/saves, rolls back on non-2xx with toast.
- Skeleton placeholders use Gumroad DS skeleton variant or `bg-canvas-sunken` gray blocks at the card aspect ratio. Avoid spinners for content-load.
- Auto-save draft for listing form uses localStorage keyed by `crafty_draft_{user_id}_{entity_type}`; cleared on successful publish.

---

## 24. Admin & Moderation (Detail)

### 24.1 Default Landing — `/admin/flags`
| Column | Description |
|--------|-------------|
| Flag ID | Short ID |
| Entity | Type + name + link to public page |
| Reason | INAPPROPRIATE / SPAM / etc. |
| Reporter | Email or "Anonymous" |
| Note | Optional text |
| Status | PENDING by default |
| Created | Relative time |
| Actions | Dismiss / Hide / Delete / Ban User |

### 24.2 Listings Management
- Combined table for crafters, stores, studios — filter by type, city, claimed status, featured status.
- Inline actions: Feature, Unfeature, Edit, Hide, Delete, Transfer Ownership.

### 24.3 Users Management
- Table: email, signup date, role, listing count, ban status.
- Actions: Promote to Admin, Demote, Ban, Unban, View linked listings.

### 24.4 CSV Export
- One-click downloads:
  - `crafty_users_YYYYMMDD.csv`
  - `crafty_crafters_YYYYMMDD.csv`
  - `crafty_stores_YYYYMMDD.csv`
  - `crafty_studios_YYYYMMDD.csv`
  - `crafty_events_YYYYMMDD.csv`
  - `crafty_flags_YYYYMMDD.csv`
- Generated on demand via streaming.

### 24.5 Cities & Categories Admin
- Add/edit/disable cities (controls homepage selector visibility).
- Add/edit/disable craft categories, supply categories, disciplines.
- Reorder via drag-drop (display_order).

---

## 25. Notifications

### 25.1 V1 Scope
- **In-dashboard notifications only** — no push, no SMS, no real-time.
- Admins: badge count on `/admin/flags` for pending flags.
- Creators: badge on dashboard for system-generated messages (e.g., "Your event is tomorrow").

### 25.2 Out of Scope (V2+)
- Email digests
- Push notifications
- Real-time updates (WebSocket-based heart count, etc.)

---

## 26. Release Plan & Roadmap

### 26.0 Schedule Risk Disclosure (Founder-Owned)

Team size is deferred per founder decision (see Implementation Plan §10.2 — superseded for stack/scope but preserved for this risk). Outside-voice review (eng review 2026-05-02) flagged that a solo engineer with this scope is a 20-24 week build, not 10. The founder has explicitly accepted this risk and will adjust either scope or schedule as build progresses. The schedule below assumes 2-3 engineers + designer + Rahul. With fewer, expect proportional slippage. **Re-evaluation gate:** end of Week 4. If Week 1-3 slipped >25% past plan, formally cut scope to Bengaluru-only Notion-grade per outside-voice F2 (drop activity strip, live preview pane, autosave, contrast CI, full test pyramid).

### 26.1 V1 Scope (Launch — target ~10 weeks from kickoff)

**Week 1–2: Foundation**
- Repo, Replit env, Postgres, Prisma schema (incl. `CityRequest` + `SlugRedirect`), raw FTS migration applied, Clerk integration, design system tokens.
- **Test stack wired (per §19.3):** Vitest + Playwright + axe-core + Prisma test-db scripts in CI.
- Custom domain verified end-to-end on Replit (per implementation plan precedent — hard launch-blocker, not soft check).

**Week 3–4: Public Pages**
- Homepage, listing pages (Crafters, Stores, Learn, Events), profile/detail pages, city selector, search.

**Week 5–6: Auth & Creator Flows**
- Signup, login, dashboard, listing CRUD, image upload pipeline.

**Week 7: Admin Console**
- Flags queue, listings management, users, CSV export, cities/categories.

**Week 8: Polish & QA**
- Email templates, error/empty states, dark mode, accessibility audit, performance pass.

**Week 9: SEO & Analytics**
- Meta tags, schema.org, GTM + all pixels, GSC verification.
- **Sitemap.xml + robots.txt live in V1** (moved from V1.5 per outside-voice F14). Generated via `app/sitemap.ts` from DB on every regen. Robots.txt allows everything except `/admin/*` and `/api/*`.

**Week 10: Soft Launch**
- Bengaluru-only soft launch with seeded content.
- Founder + community advocates onboard first 50 crafters.

### 26.2 V1.5 (4–8 weeks post-launch)
- Past events visibility toggle
- First-time tooltip walkthrough (Shepherd.js — initial build + polish; not built in V1)
- Refined search relevance
- Multi-city activation (per §7.2.1) — second city's `is_active=true` + city pill row + unsupported-city banner + CityRequest model + IP-geo (MaxMind self-hosted) — all gated on a designated curator owning the new city AND Day-90 metrics passing.
- Audit log UI
- Brand mark / logo icon design (alongside wordmark per §17.3)
- View counts on dashboard activity strip (saves are V1; views are V1.5 per §7.10)

### 26.3 V2 (3–6 months post-launch)
- Reviews & ratings
- Cross-city search
- Marketing email automation (Customer.io)
- Recurring events
- Per-product filtering on listing pages
- Self-serve claim workflow (UI + verification)
- Email/push notifications
- Background job queue

### 26.4 V3 (6–12 months post-launch)
- Native mobile apps
- On-platform messaging
- On-platform transactions / payment escrow
- Community/forums
- Public APIs
- PWA install prompt
- Multi-language (Hindi, Kannada)

---

## 27. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Replit limits (compute, DB, image storage) at scale | Medium | High | Monitor; migration playbook in `docs/runbook.md`. Triggers: p95 query latency >200ms sustained → Postgres → Neon. Storage costs >₹2k/mo → image storage → Cloudflare R2. Compute incident >15min or >5K MAU sustained → compute → Vercel. |
| Image storage costs balloon | Medium | Medium | 5MB cap + WebP compression + lifecycle deletion of orphans |
| Spam listings flood the platform | Medium | High | Rate limits + admin moderation queue + reCAPTCHA fallback |
| SEO underperforms | Medium | High | SSR, schema.org, structured URLs, GSC monitoring; iterate on copy |
| Crafters don't self-onboard | High | High | Founder-led concierge onboarding for first 50; admin pre-population for stores/studios |
| Design DS gaps cause inconsistency | Medium | Medium | Strict adherence to Gumroad DS; design review checkpoint |
| Single-admin operational bottleneck | Medium | Medium | Promote 1–2 community-trusted admins early; clear runbook |
| Clerk pricing at scale | Low | Medium | Free tier covers 10k MAU; budget for paid plan at scale |
| Legal/IP from copyrighted craft images | Medium | Medium | DMCA process via flag system; ToS clearly assigns IP responsibility to uploader |

---

## 28. Open Questions & Decisions Log

### 28.1 Resolved (in conversation, captured for record)
| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Crafters = sellers only, no showcase-only | Cleaner V1 product; hobbyists can join the community without listing |
| 2 | Stores: simple directory; no "ships to my city" filter | Defer until store coverage is dense |
| 3 | Learn includes online studios in V1 | Online courses are increasingly the default |
| 4 | Events: single-instance only | Recurring is V2 |
| 5 | Default city Bengaluru | Founder's home city + densest community |
| 6 | No big "Add" CTAs on homepage; sections have own CTAs | Buyer-first homepage |
| 7 | Search scoped to selected city | Simpler V1 UX |
| 8 | Cross-link multi-listings on profile pages | Community-friendly; rewards creators with multiple offerings |
| 9 | Saved/hearted = local list, no notifications | Avoid noise; rebuild engagement around real signal in V2 |
| 10 | Transactional email only via Resend | Marketing automation deferred |
| 11 | Reports flagged for admin review (not auto-removed) | Avoids over-moderation; admin in the loop |
| 12 | Admin can feature/unfeature; flagged at top | Low-overhead curation |
| 13 | Events: all attributes required, off-platform registration | Reduces V1 scope |
| 14 | Craft categories at crafter level (not per product) | Per-product filtering deferred to V2 |
| 15 | Store supply categories: broad (yarn, fabric, tools) | Not per-product |
| 16 | Claim via email; unclaimed listings detailed | Hands-on but scalable to ~200 listings |
| 17 | Replit for everything (compute, DB, storage, domain) | Founder preference; one provider |
| 18 | Mobile-first discovery, web-first creators/admins | Matches user behavior |
| 19 | Gumroad Design System as the design source of truth | High-quality, well-built, dual mode |
| 20 | English only V1; i18n-ready strings for V2 | Reduces translation overhead |
| 21 | Clerk for auth (Google/Microsoft SSO + email/password) | Saves weeks; multi-provider out-of-box |
| 22 | All transactional emails via Resend | Single email vendor |
| 23 | Analytics: GA, GTM, PostHog, Clarity, GSC, Meta Pixel, LinkedIn Pixel | Multi-source coverage for retargeting + product insight |
| 24 | Image upload limit 5MB, jpg/png/webp | Balance quality & cost |
| 25 | Date format DD/MM/YY, IST | Indian convention |
| 26 | Privacy + Terms = placeholder pages V1 | Founder will provide final copy pre-launch |
| 27 | Profile photos collected during onboarding (post-auth) | Better UX than at sign-up form |
| 28 | Search: simple "search all of Crafty" (within city) | Iterate later |
| 29 | First admin hardcoded; subsequent admins promoted via dashboard | Standard bootstrap |
| 30 | Visitors log in via Clerk only when needed (heart/save trigger) | Reduces friction |
| 31 | 404, 500, empty states use Gumroad illustrations | Brand consistency |
| 32 | No PWA, no native app for V1 | Browser only |
| 33 | Admin notifications: dashboard only | No email noise V1 |
| 34 | CSV export for admins | Backup + audit |
| 35 | Terms agreed at signup, no per-listing checkbox | Lower friction |
| 36 | Sitemap & robots.txt: post-launch | Not blocking V1 |
| 37 | Footer "Contact" page with support email link | Standard pattern |
| 38 | No public API in V1 | Future state |
| 39 | Both light and dark mode (Gumroad covers both) | User preference |
| 40 | No real-time updates V1 | Refresh-based is fine |
| 41 | No bot mitigation V1 (reCAPTCHA on demand) | Add only if abuse seen |

### 28.2 Open / Pending
| # | Question | Owner | Status |
|---|----------|-------|--------|
| A | Final initial city list (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Chennai, Pune?) | Founder | Confirm pre-launch |
| B | Final list of craft categories at launch | Founder | Confirm pre-launch (proposal: Crochet, Knitting, Embroidery, Macrame, Pottery, Painting, Jewellery, Paper Craft, Resin Art, Wood Craft, Fiber Art, Other) |
| C | Final list of supply categories at launch | Founder | Confirm pre-launch (proposal: Yarn, Fabric, Beads, Tools, Paper, Paint, Clay, Embroidery Supplies, Wood, Other) |
| D | Final list of disciplines for Learn at launch | Founder | Confirm pre-launch |
| E | Support email — `hello@crafty.app`? | Founder | Confirm |
| F | Crafty logo + brand mark (designer needed) | Founder | Confirm timing |
| G | Privacy policy + ToS final copy | Founder | Pre-launch |
| H | Designer to translate Gumroad DS into Crafty branded screens | Founder | Confirm timing |
| I | Type license: ABC Diatype + ABC Maxi Round (Gumroad's typefaces) — purchase, or substitute with free pairing (e.g., Fraunces + Inter) before launch. system-ui fallback is forbidden as primary. | Founder | Pre-launch |
| J | Source / commission real Indian craft photography for hero anchor, community moment section, and homepage. Pavithran to share existing Cubbon meetup photos; commission gaps. | Founder | Pre-launch |

---

## 29. Appendix

### 29.1 Glossary
- **Crafter** — Person who makes and sells handmade goods (V1 = sellers only).
- **Store** — Shop selling craft supplies (physical or online).
- **Learn (Studio)** — Established studio/school/academy teaching art and craft.
- **Event** — Single-instance workshop, fair, exhibition, pop-up, or class.
- **Visitor** — Logged-in or anonymous user who browses (no listing).
- **Creator** — Logged-in user who owns one or more listings.
- **Admin** — Internal user with platform-wide moderation rights.
- **Listing** — A crafter, store, or studio public profile.
- **Featured** — Admin-set flag that surfaces a listing higher in city listings.
- **Claimed** — A listing whose `owner_user_id` is set (i.e., creator manages it).

### 29.2 Reference Links
- [Gumroad Design System Figma](https://www.figma.com/design/AjHo0U7QTdN4wVmqVyVb5E/Gumroad-Design-System?node-id=16631-33088&p=f)
- [Clerk Documentation](https://clerk.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Replit Database / Object Storage](https://docs.replit.com)
- [Next.js App Router](https://nextjs.org/docs/app)

### 29.3 Page-by-Page Wireframe Notes (for design handoff)

**Homepage (mobile, top to bottom):**
1. App header (sticky, 56px) — logo (left), city pill (center), hamburger (right)
2. Hero — **480px tall**, editorial composition: full-bleed real Indian craft photo with warm cream scrim at bottom 40%, display headline + subhead + 2 CTAs overlaid on scrim. CTAs stacked on mobile, side-by-side on desktop.
3. City selector — horizontally scrollable chip row, 48px tall, trailing `+ Add my city →` ghost pill
4. "Crafters in Bengaluru" h2 + horizontal card row (CrafterCards 1:1 square, 240px wide × 240px image + 80px text region, snap scroll) + "See all crafters →"
5. "Stores in Bengaluru" h2 + StoreCards (4:3 wide horizontal, 280px × 210px) — same scroll pattern
6. **Community moment** (editorial) — full-bleed photo (16:9 mobile / 21:9 desktop) + single-line caption beneath in display typography. NOT a card or rail.
7. "Learn in Bengaluru" h2 + StudioCards (1:1 square, 240px × 240px) — same scroll pattern
8. "Events in Bengaluru" h2 + EventCards (16:9 cover with date badge top-left, 280px wide × 158px image + 100px text region)
9. Footer

**Crafter Profile (mobile):**
1. Hero photo full-bleed (16:9)
2. Name, city, categories, save button, share button
3. Tagline
4. Contact CTA row (WhatsApp, Instagram, Website — large tap targets)
5. Bio
6. Portfolio grid (2 cols mobile, 3 cols desktop)
7. Products list (cards with photo, name, price)
8. Classes/Workshops (if applicable)
9. Cross-listing badge ("Also runs Aisha's Yarn Store →")
10. Report link (footer)

**Creator Dashboard (desktop):**
- Two-column layout: sidebar (240px) + main panel.
- Sidebar: avatar + name, links (Listings, Events, Saved, Settings, Logout).
- Main: per-listing cards with cover image, status, edit/view/delete actions, "Add new listing" CTA at top.

### 29.4 Email Template Snippets (V1 starter copy)

**Subject: Welcome to Crafty 🌻**
> Hey [Name],
> You're in! Your Crafty account is live. Start by adding your first listing — it takes about 5 minutes and you'll be discoverable by [City]'s craft community right away.
> [Create your profile →]
> If you have questions, just reply to this email.
> — The Crafty team

**Subject: Your Crafty profile is live**
> Your profile is now live at crafty.app/crafters/[slug]. Share the link with your community and start getting discovered.
> [View your profile →] [Edit your profile →]

**Subject: Your event is live on Crafty**
> [Event Name] is now visible to everyone in [City]. Share the link to drive registrations.
> [View event →]

---

**END OF DOCUMENT**

*Crafty — PRD v1.0 | Confidential | © Dealquick Labs Pvt Ltd, 2026*

---

## Eng Review Outputs (2026-05-02)

### NOT in scope (V1)
Considered and explicitly deferred during eng review:
- **Multi-city activation** — schema supports it; only Bengaluru is_active=true at launch; second city gated on curator + Day-90 metrics (per §7.2.1).
- **Unsupported-city banner + IP geolocation (MaxMind) + CityRequest model** — deferred to V1.5 when multi-city unblocks.
- **Neon Postgres migration** — stays on Replit Postgres at V1; documented migration playbook in `docs/runbook.md`.
- **External legal counsel review of ToS / Privacy** — founder self-drafts conservatively for V1; iterate post-launch.
- **Automated counsel-grade DPDP Act compliance review** — V1.5+; conservative self-drafted policy is the V1 line.
- **First-time tooltip walkthrough (Shepherd.js)** — V1.5.
- **Brand mark / logo icon** — V1 ships wordmark-only (per §17.3); mark in V1.5.
- **View counts on dashboard activity strip** — saves are V1, views require additional tracking infra → V1.5.
- **External cron caller (GitHub Actions / cron-job.org)** — Replit scheduled tasks + CronRun monitoring sufficient at V1; revisit if reliability issues observed.
- **Tooltip / Shepherd.js onboarding walkthroughs** — V1.5.
- **Reviews & ratings, on-platform messaging, transactions** — V2+ (already in PRD §2.5).

### What already exists
Existing code in [crafty-app/](crafty-app/) the engineer should reuse, not rebuild:
- **Token system in [crafty-app/app/globals.css:6-37](crafty-app/app/globals.css#L6-L37)** — warm cream + ink-dark + Gumroad pink; light + dark; matches PRD §17.6.
- **Card primitive in [globals.css:71-82](crafty-app/app/globals.css#L71-L82)** — card-hover stamp pattern at 100ms ease.
- **Component shells in [crafty-app/components/](crafty-app/components/)** — `AppHeader`, `AppFooter`, `CitySelector`, `DiscoveryRail`, `Cards.tsx` (CrafterCard already has Featured top-left badge per §7.3 Pass-7 fix), `Logo.tsx`, `ThemeToggle.tsx`, `CrafterForm.tsx`.
- **Auth abstraction in [crafty-app/lib/auth.ts](crafty-app/lib/auth.ts)** — dev-stub + Clerk lazy-upsert pattern (Issue 2.1 implemented). PRD §12 spec aligns.
- **Slug generator in [crafty-app/lib/util.ts](crafty-app/lib/util.ts)** — `slugify` + `ensureUniqueSlug` with reserved-word list. Needs CQ7 fix (Unicode escape + length-bound suffix).
- **Cities query in [crafty-app/lib/cities.ts](crafty-app/lib/cities.ts)** — React `cache()` wrapper. Needs §19.2 fix (`unstable_cache` + 1h TTL).
- **Prisma schema in [crafty-app/prisma/schema.prisma](crafty-app/prisma/schema.prisma)** — 16 prior eng-review decisions baked in. PRD §11 now mirrors this.
- **Raw FTS migration in [crafty-app/prisma/raw-migrations/0001_fts_and_constraints.sql](crafty-app/prisma/raw-migrations/0001_fts_and_constraints.sql)** — tsvector triggers + Event 3-FK CHECK. Needs §14.1 fix (statement-level triggers).
- **API surface skeleton** — `POST /api/crafters`, `POST /api/saves`, `POST /api/upload`, `POST /api/flags` exist. PATCH/DELETE handlers + entity/[id] routes still TODO per §10.4.
- **Middleware in [crafty-app/middleware.ts](crafty-app/middleware.ts)** — Clerk gate with dev-bypass. Aligned with PRD.

### Failure Modes (per critical codepath)

| Codepath | Realistic failure | Test? | Error handling? | User experience |
|----------|-------------------|-------|-----------------|-----------------|
| Heart save under double-tap | Race → unique-constraint 5xx | YES (T3 IRON RULE regression test) | YES (race-safe transaction) | Optimistic fill, no error visible |
| Image upload 5MB+ | Memory exhaustion / blocked event loop | YES (P1-3 fix) | YES (Content-Length pre-check + 413) | Inline retry button per file |
| Sharp processing inline | Request handler blocks 1-3s, possible OOM | YES (integration test for handler timing) | PARTIAL (background worker per §13.4) | 202 + polling or optimistic placeholder |
| Empty city / no listings | Page renders 4 stacked empty states | YES (E2E #6 in §19.3) | YES (single editorial section per §7.1) | "Be the first" CTA per entity type |
| FTS trigger drops on schema change | Search silently returns stale | YES (FTS integration test per §19.3) | NO | Stale results visible to user |
| Replit cron stops firing | Orphan files accumulate; storage bill grows | YES (CronRun + admin/health) | PARTIAL (admin sees red row) | Admin alerted; not user-visible |
| Custom domain SSL renewal fails | HTTPS-only → site unreachable | NO | NO (Replit-managed) | **CRITICAL GAP**: no monitor; could go undetected |

**Critical gap flagged: Custom domain SSL renewal monitoring.** No test, no error handling, silent if Let's Encrypt renewal fails (Replit edge handles it but doesn't alert if it fails). Mitigation: add an external uptime check (UptimeRobot free tier) hitting `https://crafty.app` every 5 min; SMS the founder on cert error.

### Worktree Parallelization Strategy

The 10-week plan has natural parallelization (assuming team ≥2):

| Step | Modules | Depends on |
|------|---------|------------|
| W1-Foundation | `prisma/`, `lib/db.ts`, `lib/auth.ts`, middleware, test stack | — |
| W1-DesignTokens | `app/globals.css`, `tailwind.config.ts`, `lib/types.ts`, `components/` (skeleton) | — (parallel with Foundation) |
| W2-VettingPolicy | `docs/moderation-policy.md`, ToS + Privacy, `app/admin/flags/`, `lib/auth.ts` admin gate | W1 |
| W2-CustomDomain | Replit deploy config, DNS | — (parallel with Vetting) |
| W3-Search | `app/search/page.tsx`, `lib/search.ts`, FTS triggers | W1 |
| W3-Filters | `components/FilterPanel.tsx`, listing pages | W1 |
| W4-SiC + Content | Operations doc, hero crafter onboarding | — (parallel with W3) |
| W5-Stores+Studios | `app/stores/`, `app/learn/`, admin CRUD, seed scripts | W2 (admin role) |
| W5-Events | `app/events/`, community submission flow | W5-Stores (admin shared) |
| W7-HeroOnboarding | Content, photoshoots, SEO | W5 |
| W8-SEO+Analytics | `sitemap.ts`, `robots.ts`, schema.org, GTM, PostHog wiring | W7 |

**Parallel lanes:**
- Lane A (Foundation + DesignTokens): W1 split into engineer-A on stack + engineer-B on tokens. Sequential into W2.
- Lane B (Vetting + CustomDomain): parallel within W2.
- Lane C (Search + Filters): parallel within W3.

**Conflict flags:**
- Lane A1 (`prisma/`) and Lane A2 (`tailwind.config.ts`) touch different files → no conflict.
- Lane B1 (`docs/`, ToS) and Lane B2 (Replit deploy) → no shared code.
- W5 Stores and W5 Events both touch `app/admin/` → sequential within W5.

### Completion Summary

```
+====================================================================+
|         ENG PLAN REVIEW — COMPLETION SUMMARY                       |
+====================================================================+
| Plan file                | Crafty-PRD-v1.md (2010 → ~2300 lines)   |
| Step 0 — Scope challenge | 4 issues; SCOPE REDUCED (multi-city dropped per X1) |
| Section 1 — Architecture | 7 issues, all resolved                  |
| Section 2 — Code Quality | 7 issues, all resolved                  |
| Section 3 — Test Coverage | 47 paths diagrammed, all gapped, plan adds full pyramid + 1 IRON RULE regression test |
| Section 4 — Performance  | 8 issues from agent, all surfaced       |
| Outside Voice            | Claude subagent ran (no codex available); 15 findings; 4 critical cross-model tensions surfaced |
+--------------------------+-----------------------------------------+
| NOT in scope             | written (10 items)                       |
| What already exists      | written (8 modules)                     |
| TODOS.md updates         | 7 items (T1-T7); T1+T5+T7 launch-blockers |
| Failure modes            | 7 codepaths analyzed; 1 critical gap (SSL renewal monitor) |
| Outside voice            | run (Claude subagent — codex unavailable) |
| Parallelization          | 3 parallel lanes identified, 0 conflicts |
| Lake Score               | Test pyramid: COMPLETE (47/47 paths planned). Multi-city: REDUCED (per outside voice). Net: pragmatic boil-the-lake within Bengaluru-only scope. |
+====================================================================+

UNRESOLVED DECISIONS: 0 — every AskUserQuestion answered.
CRITICAL GAPS: 1 — custom-domain SSL renewal monitoring.
```

### Cross-Model Findings That STILL Stand After User Decision

The user accepted some outside-voice recommendations and rejected others. The rejected ones are intentional, but they remain risks the founder owns:

- **F2 (REJECTED):** User chose to keep full design-review polish (activity strip, celebration screen, live preview, etc.). Outside voice said cut it for V1. Founder choice: ship the polish even if it costs ~2 weeks. Risk: schedule slip.
- **F3 (DEFERRED):** User chose to defer the team-size question. §26.0 added with Week-4 re-evaluation gate. Risk: schedule slip if solo-engineer reality.
- **F8 (REJECTED):** User chose full test pyramid (47 paths, Vitest+Playwright+axe-core+contrast CI). Outside voice said cut it. Founder choice: boil the lake, AI makes coverage cheap.
- **F11 (REJECTED implicitly):** Save-toggle race regression test stays per IRON RULE.
- **F13 (PARTIALLY ACCEPTED):** Storyboards softened to "design intent, revise after first observations" in PRD §8.9 closing line.

The 4 accepted outside-voice findings (F1, F4, F5, F14, F15) are now reflected in PRD edits + TODOs.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | not run (codex unavailable) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 22 issues found across 4 sections, all resolved; 1 critical gap (SSL monitoring) flagged; outside-voice cross-model tensions surfaced and decided by user |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (FULL) | score: 5/10 → 9.4/10, 28 decisions added |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | not run |
| Outside Voice | (Claude subagent fallback) | Cross-model challenge | 1 | DELIVERED | 15 findings; 4 critical cross-model tensions; user decided each |

- **CROSS-MODEL:** Outside voice (Claude subagent) raised 4 critical tensions; user rejected 3 (kept design polish, kept full test pyramid, deferred team) and accepted 1 (Bengaluru-only V1 + revert Postgres host). The PRD now reflects the user's decisions, not silent agreement with either reviewer.
- **UNRESOLVED:** 0 — every AskUserQuestion answered.
- **VERDICT:** ENG + DESIGN CLEARED — ready to implement, with 1 known critical gap (SSL renewal monitor → add UptimeRobot before launch) and 7 TODOs (3 launch-shapers).

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | not run |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (PLAN) | score: 5/10 → 9.4/10, 28 decisions added across 7 passes; 4 TODOs filed |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | not run |

**UNRESOLVED:** 0 (all 28 design decisions resolved with user). Three open dependencies remain in PRD §28.2 — H (designer hire), I (font license), J (photography). These are TODOs not unresolved decisions.

**VERDICT:** DESIGN CLEARED — eng review required before implementation can begin. Recommend `/plan-eng-review` next to validate architectural implications of new decisions (CityRequest model, optimistic UI patterns, parallel rail loading, live-preview pane, celebration screen, IP geolocation, contrast CI hook).
