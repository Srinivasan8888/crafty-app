---
name: Crafty
description: City-localized discovery for India's handmade-craft community, dressed as a Sunday bazaar.
colors:
  khadi-cream: "#FFF6E5"
  cream-tint: "#FBEBC8"
  cream-deep: "#F4E5C0"
  bazaar-rose: "#B5365B"
  rose-deep: "#8E2A48"
  banana-leaf: "#1F5F3C"
  banana-leaf-deep: "#163E27"
  marigold: "#E6A817"
  marigold-deep: "#B98712"
  indigo-block: "#3D4A8C"
  ink: "#1A1A1A"
  muted-walnut: "#6B5A3E"
  subtle-walnut: "#6E5C41"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.625rem, 6vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.bazaar-rose}"
    textColor: "{colors.khadi-cream}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.rose-deep}"
  button-ghost:
    backgroundColor: "{colors.cream-tint}"
    textColor: "{colors.banana-leaf}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.khadi-cream}"
    rounded: "{rounded.lg}"
    padding: "12px 14px 16px"
  city-pill:
    backgroundColor: "{colors.cream-tint}"
    textColor: "{colors.banana-leaf}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  chip:
    backgroundColor: "{colors.cream-tint}"
    textColor: "{colors.muted-walnut}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  input:
    backgroundColor: "{colors.khadi-cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Crafty

## 1. Overview

**Creative North Star: "The Sunday Bazaar"**

Crafty looks like a weekend craft market at golden hour, not a software product. The whole system is built on warm khadi cream (#FFF6E5) rather than white, lit by four named market colours: a deep rose for action, banana-leaf green for structure, marigold for accents, and indigo as a rare cool note. Type is editorial, with Fraunces carrying display and titles like hand-set signage above each stall, and Inter handling the calm, readable body. Depth is soft and terracotta-tinted, never the cold grey drop-shadow of a 2014 dashboard. The defining gesture is a printer's "stamp": cards lift two pixels up and left on hover and cast a hard ink-coloured offset, like a block print pressed into paper.

The register is product (the bulk of Crafty is dashboards, admin, and listing wizards), but the discovery surfaces are dressed with brand warmth so buyers feel they are browsing a neighbourhood, not querying a database. Density is generous and unhurried: varied spacing, breathing room around photography, real faces and finished work doing the persuading.

This system explicitly rejects the generic AI-SaaS reflex. No gradient-text heroes, no hero-metric number grids, no glassmorphism, no neon-on-dark tool aesthetic, no grey Justdial rows. If the page could belong to any startup, it is wrong.

**Key Characteristics:**
- Warm cream canvas, never pure white or pure black.
- A four-colour market palette (rose, leaf, marigold, indigo) over cream.
- Editorial serif (Fraunces) for voice, humanist sans (Inter) for reading.
- Block-print "stamp" hover instead of soft float.
- Entity cards intentionally vary in shape so the eye reads four distinct rails.

## 2. Colors

A warm, hand-dyed palette pulled from a craft market: marigold, rose, and banana-leaf green laid over undyed khadi cream.

### Primary
- **Bazaar Rose** (#B5365B): the action colour. Primary buttons, the saved-heart fill, active nav, featured emphasis. Unlike a hot pink, it is dark enough to read as text on cream (about 5.4:1), so it doubles as inline emphasis, not only as a fill.

### Secondary
- **Banana-Leaf Green** (#1F5F3C): the structural colour. Borders and hairlines (at 18 to 30% alpha), the footer field, section eyebrows, success states, and the city-pill stroke. It is the quiet green that holds the layout together.

### Tertiary
- **Marigold** (#E6A817): the festive accent and warning hue. Decorative motifs, badges, tints, "feature this listing" energy. Used as fill or large type only, never small body text on cream.
- **Indigo Block** (#3D4A8C): the rare cool note, for the occasional category or data accent. Used sparingly so the palette stays warm.

### Neutral
- **Khadi Cream** (#FFF6E5): the page canvas and card surface. The whole system sits on this, never on white.
- **Cream Tint** (#FBEBC8) and **Cream Deep** (#F4E5C0): sunken backgrounds, chips, skeletons, pill fills.
- **Ink** (#1A1A1A): primary text. A soft near-black, never #000.
- **Muted Walnut** (#6B5A3E) and **Subtle Walnut** (#6E5C41): secondary and tertiary text, a warm brown rather than a cold grey, so even the captions feel hand-made.

### Named Rules
**The Cream-Not-White Rule.** Every surface is khadi cream or a cream tint. Pure #FFFFFF and pure #000000 are forbidden. Neutrals are warm walnut browns, not greys.

**The Four-Stall Rule.** Rose, leaf, marigold, indigo each have one job (action, structure, festive accent, rare cool note). Do not let a second colour creep into another's role, and never introduce a fifth hue.

## 3. Typography

**Display Font:** Fraunces (with Georgia, serif as terminal fallback)
**Body Font:** Inter (with system-ui, sans-serif as terminal fallback)

**Character:** Fraunces is a soft, old-style serif with optical warmth: it reads like hand-set market signage, expressive without being precious. Inter is the quiet, highly legible counterweight for body and UI. The pairing is editorial-magazine, not corporate.

### Hierarchy
- **Display** (Fraunces 700, clamp 42 to 56px, line-height 1.05): hero headlines and the one big statement per page.
- **Headline** (Fraunces 700, 34px, line-height 1.2): page and major-section titles.
- **Title** (Fraunces 700, 18 to 22px, line-height 1.2): card names, subsection heads, the editorial "Issue 01" eyebrow.
- **Body** (Inter 400, 14px, line-height 1.55): all reading text. Cap measure at 65 to 75ch.
- **Label** (Inter 600, 10.5 to 12px, letter-spacing 0.04em): chips, badges, metadata, uppercase eyebrows.

### Named Rules
**The Loaded-Font Rule.** Fraunces and Inter must actually load (via next/font). system-ui and Georgia may appear only as terminal fallbacks in the stack, never as the primary face. A page rendering in Georgia or system sans is a bug, not a fallback.

**The Serif-Voice Rule.** Fraunces carries identity (display, titles, names, eyebrows). Inter carries information (body, labels, forms). Do not set long body copy in Fraunces or headlines in Inter.

## 4. Elevation

The system is soft and warm, not flat and not floaty. Resting elevation is a single diffuse terracotta-tinted shadow; the signature interaction is a hard block-print offset on hover. Depth is conveyed mostly through the cream-tint tonal layering (cream, cream-tint, cream-deep), with shadow used sparingly.

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 4px 12px rgba(180, 80, 40, 0.10)`): resting cards and raised surfaces. The tint is warm terracotta, never neutral grey.
- **Soft-Large** (`box-shadow: 0 8px 24px rgba(180, 80, 40, 0.14)`): modals, popovers, elevated sheets.
- **Stamp** (`transform: translate(-2px, -2px); box-shadow: 2px 2px 0 #1A1A1A`): the card hover. A hard ink offset, like a block print pressed into the page.

### Named Rules
**The Block-Print Rule.** Interactive cards do not float on hover, they stamp: lift two pixels up and left, drop a hard ink offset shadow, 100ms ease. No soft glow, no scale, no neutral-grey lift. Wrap it in a `prefers-reduced-motion` guard.

**The Warm-Shadow Rule.** Every shadow is terracotta-tinted (rgba(180,80,40,...)) in light mode, deep black in dark mode. A cold grey `rgba(0,0,0,0.1)` resting shadow is a 2014 tell and is forbidden.

## 5. Components

### Buttons
- **Shape:** gently rounded (10px, `rounded.md`).
- **Primary:** bazaar-rose fill, cream text, 12px by 20px padding. The single highest-intent action per surface.
- **Hover / Focus:** darken to rose-deep (#8E2A48); focus shows a visible ring, never `outline: 0` alone.
- **Ghost / Secondary:** cream-tint fill or transparent with a banana-leaf hairline and leaf text. For "List your profile" and lower-intent actions.

### Chips and Pills
- **Style:** cream-tint background, walnut or leaf text, pill radius (999px), 4 to 10px padding. Used for categories, filters, and metadata.
- **City pill:** the signature control. Cream-tint fill, banana-leaf hairline and text, Fraunces, at least 44px tall. It announces the city the whole page is scoped to.
- **State:** selected filters carry a leaf or rose fill; unselected stay cream-tint.

### Cards / Containers
- **Corner Style:** 16px (`rounded.lg`).
- **Background:** khadi cream, with a banana-leaf hairline border (`line-strong`, leaf at 30% alpha).
- **Shadow Strategy:** resting Soft shadow, Stamp on hover (see Elevation).
- **Shape variety (signature):** card shapes differ by entity type so four rails read as four categories, not one repeated grid. CrafterCard 1:1, StoreCard 4:3, StudioCard 1:1, EventCard 16:9 with a date badge. This variety is the scan mechanism; never flatten it to a uniform grid.
- **Internal Padding:** 12 to 16px (`spacing.sm` to `spacing.md`).

### Inputs / Fields
- **Style:** khadi-cream fill, banana-leaf hairline, 10px radius, ink text.
- **Focus:** border shifts toward leaf or rose plus a 3px soft ring; keep a transparent `outline` so focus survives forced-colors mode.
- **Error:** rose (#B5365B) border and message text.

### Navigation
- **Style:** sticky cream header with a leaf hairline beneath. Logo left, city pill centre, actions right.
- **Typography:** Fraunces for nav links; active and hover states shift toward bazaar-rose.
- **Mobile:** hamburger opens a focus-trapped drawer; a bottom nav with safe-area insets carries the primary destinations. Primary "List your profile" CTA must remain reachable on mobile, not desktop-only.

### Heart / Save (signature)
- A circular ink-on-cream button in the card's top-right corner, bazaar-rose icon, optimistic fill on tap. Visual badge stays small (32 to 36px) but the tap target must reach 44px via a transparent overlay.

## 6. Do's and Don'ts

### Do:
- **Do** sit everything on khadi cream (#FFF6E5); use warm walnut browns (#6B5A3E) for muted text, never grey.
- **Do** load Fraunces and Inter through next/font; treat Georgia and system-ui as terminal fallbacks only.
- **Do** use the block-print Stamp hover on cards (translate -2/-2 + hard ink offset, 100ms), wrapped in a reduced-motion guard.
- **Do** keep terracotta-tinted shadows (rgba(180,80,40,...)) in light mode.
- **Do** vary card shape by entity type so each rail reads as its own category.
- **Do** give bazaar-rose double duty: primary fills and inline emphasis text (it clears AA on cream at about 5.4:1).
- **Do** keep heart counts and popularity private; show the maker and the work, not the metric.

### Don't:
- **Don't** use `#fff` or `#000`, or any cold neutral grey for text or surfaces.
- **Don't** ship the page in Georgia or system-ui; a missing Fraunces or Inter is a bug.
- **Don't** use gradient text (`background-clip: text` on a gradient), ever.
- **Don't** use a `border-left` or `border-right` greater than 1px as a coloured accent stripe; use a full hairline, a tint, or a leading icon instead.
- **Don't** use decorative glassmorphism (`backdrop-filter: blur`) as a default surface treatment.
- **Don't** build a hero-metric block (big number, small label, supporting stats) or an identical icon-card grid. Those are the AI-SaaS reflex Crafty rejects.
- **Don't** reach for a modal first; exhaust inline and progressive disclosure (the report flow lives on a page, not a popup).
- **Don't** write em dashes in UI copy; use commas, colons, or parentheses.
- **Don't** look like Etsy, Instagram, or Justdial: no global storefront pressure, no infinite feed, no grey directory rows.
