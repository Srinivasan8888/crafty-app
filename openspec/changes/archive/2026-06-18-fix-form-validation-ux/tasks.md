## 1. Fix blurhash length cap (root cause of the reported errors)

- [x] 1.1 In `app/api/crafters/route.ts`, change `profile_photo_blurhash` and the `portfolio_blurhashes` element to `.max(4000)`
- [x] 1.2 In `app/api/crafters/[id]/route.ts`, change `profile_photo_blurhash` and `portfolio_blurhashes` element to `.max(4000)`
- [x] 1.3 In `app/api/stores/route.ts` and `app/api/stores/[id]/route.ts`, change `logo_photo_blurhash` to `.max(4000)`
- [x] 1.4 In `app/api/studios/route.ts` and `app/api/studios/[id]/route.ts`, change `logo_photo_blurhash` to `.max(4000)`
- [x] 1.5 In `app/api/events/route.ts` and `app/api/events/[id]/route.ts`, change `cover_image_blurhash` to `.max(4000)`
- [x] 1.6 In `app/api/products/route.ts` and `app/api/products/[id]/route.ts`, change the `photo_blurhashes` element to `.max(4000)`
- [x] 1.7 Grepped `app/api` for `max(500)` on blurhash fields — zero remain; added a one-line comment near each cap. (`reviews/route.ts` was already `.max(2000)`, left as-is.)

## 2. Phone/WhatsApp input restriction + client/server parity

- [x] 2.1 In `lib/phone.ts`, added and exported `sanitizePhoneInput(value)` keeping only digits and `+ ( ) - . space`, with `+` allowed only as the leading character
- [x] 2.2 In `components/CrafterForm.tsx`, removed the local lenient `looksLikePhone` and imported the shared strict one so the client gate matches the server `refine`
- [x] 2.3 In `components/CrafterForm.tsx`, routed the WhatsApp `onChange` through `sanitizePhoneInput`
- [x] 2.4 In `components/StoreForm.tsx`, routed `contact_phone` and `contact_whatsapp` through `sanitizePhoneInput`; confirmed it uses the shared `looksLikePhone`
- [x] 2.5 In `components/StudioForm.tsx`, same as StoreForm

## 3. Inline, while-typing validation feedback

- [x] 3.1 In `components/CrafterForm.tsx`, extended the `errors` map with `contact_whatsapp` → "Enter a valid phone number." (touched-only)
- [x] 3.2 In `components/CrafterForm.tsx` step 3, rendered an inline error under the WhatsApp input with `aria-invalid` + `aria-describedby` + `role="alert"`
- [x] 3.3 Errors render on the step that owns the field (gated by `step === 3`), so they no longer defer to a later step
- [x] 3.4 Added inline under-field errors (on blur/touch) in `StoreForm`, `StudioForm`, `EventForm`, `ProductForm` for phone, website/URL, and required fields

## 4. Sibling-form audit ("other silly mistakes like this")

- [x] 4.1 Audited Store/Studio/Event/Product forms; dupes (blurhash cap, phone) confirmed and fixed. New findings captured in §6.
- [x] 4.2 Audited website/URL fields: `registration_url` already client-normalizes before send (no bug); added inline URL errors to Store/Studio contact website fields
- [x] 4.3 Unified the only lenient local mirror (CrafterForm `looksLikePhone`) with the shared `lib/phone.ts` helper

## 5. Verify

- [x] 5.1 `npm run typecheck` (`tsc --noEmit`) passes clean after all edits
- [ ] 5.2 MANUAL QA (not yet run): create one listing of each type, upload a large photo that previously triggered the 500 error, confirm it publishes
- [ ] 5.3 MANUAL QA (not yet run): in a phone field, confirm letters/symbols can't be typed; a valid number submits without error
- [ ] 5.4 MANUAL QA (not yet run): confirm the inline error appears on the current step while typing/on blur, not after Next/Publish
- [ ] 5.5 (Follow-up) File a separate change to replace the base64 data-URL placeholder with a compact blurhash encoding to shrink payloads

## 6. Additional findings fixed this pass (discovered during the audit)

- [x] 6.1 Numeric input foot-guns: `ProductForm` price/inventory and `EventForm` price now reject negative & fractional input (sanitize-to-non-negative-integer on change + `min`/`step`/`inputMode`), matching the server `.int()`/`.positive()`/`.nonnegative()` rules
- [x] 6.2 Late errors in `EventForm`/`ProductForm`: added inline per-field errors (name, description, venue, price, photos) on blur/touch instead of only a bottom summary list shown at submit
- [x] 6.3 Event free-price consistency (was finding "D", a FALSE POSITIVE): the form already has a "Free entry" checkbox, so free events are expressed that way. Kept the rule that a non-free event needs a real price (≥ ₹1) and removed the workflow's mid-pass change that allowed `is_free=false` + `price=0` (which would render "Paid" on the public pages). Added an inline price error.
- [x] 6.4 events POST/PATCH description parity: verified — PATCH already enforces `.min(20).max(2000)` (the suspected asymmetry did not exist in current code)

## 7. Out of this change's scope but fixed in the same pass (login/signup)

> Tracked here for the record; consider a dedicated `redesign-auth-pages` change if a spec is wanted.

- [x] 7.1 Fixed the "white box" bug: `lib/descopeTheme.ts` `light.background.paper` `#FFFFFF` → cream tint `#FBEBC8`; `primary.contrast` `#FFFFFF` → cream `#FFF6E5` (DESIGN.md Cream-Not-White rule)
- [x] 7.2 Redesigned `sign-in` and `sign-up` into a warm two-pane "market stall" layout (brand panel + carded auth content, leaf hairline + soft shadow, responsive, styled DEV fallback)
- [ ] 7.3 (Follow-up) Drive the Descope `theme` prop from the app's `.dark` class via a small client island so dark mode applies to the widget (left `theme="light"` for now to avoid a new module; paper fix already removes the white box)
