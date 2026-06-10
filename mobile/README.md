# Crafty mobile — scaffold notes

The web app already ships as a PWA (manifest + service worker + install prompt),
which gives ~80% of native mobile UX on a 1-day spend. The remaining 20% — push
notifications, App Store presence, deeper-link routing, app-store discovery —
is what this scaffold is for.

**Status:** Not built. This directory exists as a planning artifact and the
landing pad for the Expo project when V3 Tier 2 mobile-native work begins.

## When to actually build this

PRD §26.2 puts native mobile in V3 (6-12 months post-launch). Trigger the
build only when at least two of these are true:

- ≥20% of /admin/metrics shows mobile traffic that bounces because PWA install
  conversion is too low
- iOS organic discovery is materially below Android (Google Play indexes
  PWAs reasonably; App Store does not)
- A specific feature (e.g. crafter taking studio photos in-app, push for new
  message arrivals during commute) needs native capability the PWA can't give

Don't do this for "we should have an app" reasons. The PWA is already
installable, push-enabled (via Web Push, FCM-compatible), and offline-capable
for read paths. Native is a multi-week investment with App Store maintenance
overhead.

## Recommended stack (when the time comes)

**Expo SDK 51+** with EAS Build/Submit. Rationale:

- Single codebase ships to iOS + Android + (optionally) the web.
- File-based routing via Expo Router mirrors our Next.js App Router muscle memory.
- Over-the-air updates via EAS Update — patch bugs without an App Store
  re-submit. Critical for a 2-person founder team.
- Native modules for the ones we actually need: notifications, camera,
  share-sheet, deep linking, biometric unlock.

**Initial scope (build week 1):**

```
mobile/
├── app.json                       # Expo config
├── eas.json                       # EAS Build profiles
├── tsconfig.json                  # Match the web project
├── package.json                   # Sibling to ../package.json (separate node_modules)
├── app/
│   ├── _layout.tsx                # Root layout with AuthProvider (Descope SDK)
│   ├── (tabs)/
│   │   ├── _layout.tsx            # Bottom tabs: Discover / Saved / Messages / Profile
│   │   ├── index.tsx              # Discover (rails — mirror /[city] from web)
│   │   ├── saved.tsx              # Saved list
│   │   ├── messages.tsx           # Inbox
│   │   └── profile.tsx            # Own profile + settings
│   ├── city/[city]/[entity]/[slug].tsx  # Universal detail page
│   └── (modals)/
│       ├── message-compose.tsx
│       └── product-buy.tsx
├── lib/
│   ├── api.ts                     # Thin client over the existing Open API at /api/public/v1/*
│   ├── auth.ts                    # Descope React Native SDK init
│   ├── push.ts                    # expo-notifications + FCM registration
│   └── deeplink.ts                # URL → screen mapper
└── assets/
    ├── icon.png                   # 1024×1024 source
    └── splash.png
```

Key dependencies (Expo SDK 51 versions):

- `expo`, `expo-router`, `expo-notifications`, `expo-image`, `expo-secure-store`
- `@descope/react-native-sdk` (Descope native SDK)
- `@tanstack/react-query` (mirrors the web's data-fetching ergonomics)

## Auth strategy

**DO NOT roll your own auth.** Use the Descope React Native SDK with the same
`NEXT_PUBLIC_DESCOPE_PROJECT_ID` — Descope handles SSO + magic links + biometric
prompts on device. The mobile client gets a session JWT that the existing
`/api/public/v1/*` and `/api/*` endpoints accept once we add a `Bearer <jwt>`
fallback to `lib/auth.ts` alongside the cookie path.

Mobile-specific add: store the refresh token in `expo-secure-store` (Keychain
on iOS, EncryptedSharedPreferences on Android).

## Push notifications

Wire `expo-notifications` → FCM (Android) + APNs (iOS). On token registration,
POST to a new `/api/users/me/push-tokens` endpoint (V3 Tier 2 backend work to
add). Server-side: when a message-digest cron would normally email, also push.
Reuse the daily-cap idempotency we already have.

**Schema we'll need (V3 Tier 2 add):**
```prisma
model PushToken {
  id          String   @id @default(cuid())
  user_id     String
  token       String   @unique  // FCM or APNs token
  platform    String   // "ios" | "android"
  enabled     Boolean  @default(true)
  created_at  DateTime @default(now())
  last_seen_at DateTime @default(now())
}
```

## Deep linking

Universal Links (iOS) + App Links (Android) so a tap on `crafty.app/bengaluru/crafters/aisha-crochet`
from WhatsApp opens the native app at that screen instead of the browser. Needs:

- `apple-app-site-association` file on the web at `/.well-known/apple-app-site-association`
- `assetlinks.json` at `/.well-known/assetlinks.json`
- Both reference the bundle/package IDs from `app.json`

Add these as static files in `public/.well-known/` on the web side when shipping
the mobile app.

## Build + ship checklist (for future-you)

1. `cd mobile && bunx create-expo-app@latest .` (or `pnpm dlx`)
2. Configure `app.json` — bundleIdentifier `app.crafty.crafty`, name "Crafty"
3. Implement the 4 tabs + 1 universal detail screen using `/api/public/v1/*` endpoints
4. EAS Build: `eas build --platform all --profile preview` → install via QR
5. Iterate via EAS Update push (no re-submit) until UX feels right
6. EAS Submit: `eas submit --platform ios` + `eas submit --platform android`
7. Add `apple-app-site-association` + `assetlinks.json` to web for deep links
8. Wire push tokens after store approval

## What I'm NOT recommending

- **React Native CLI bare workflow** — Expo's managed workflow handles 95% of
  what we need with 5% the maintenance cost. Eject only when forced.
- **Capacitor / Cordova / Ionic** — wrapping the existing web in a WebView is
  tempting but the App Store rejection rate for "just a website in a shell"
  is real. Expo is the safer path.
- **A separate brand identity for the app.** Same logo, same colors, same flow
  IDs in Descope. Users should feel they're in one Crafty across surfaces.

## V3.1 scope (after the basic app ships)

- Crafter-side: list new product with on-device camera capture, upload while
  walking through the studio
- Buyer-side: AR placement of a product in a room (saw it in a meetup; high
  effort, low V3 priority)
- Background location: notify of pottery studios within 1km — privacy-fraught,
  skip until clear demand
