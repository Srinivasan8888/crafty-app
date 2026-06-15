## 1. Fix blurhash length cap (root cause of the reported errors)

- [ ] 1.1 In `app/api/crafters/route.ts`, change `profile_photo_blurhash` and the `portfolio_blurhashes` element to `.max(4000)`
- [ ] 1.2 In `app/api/crafters/[id]/route.ts`, change `profile_photo_blurhash` and `portfolio_blurhashes` element to `.max(4000)`
- [ ] 1.3 In `app/api/stores/route.ts` and `app/api/stores/[id]/route.ts`, change `logo_photo_blurhash` to `.max(4000)`
- [ ] 1.4 In `app/api/studios/route.ts` and `app/api/studios/[id]/route.ts`, change `logo_photo_blurhash` to `.max(4000)`
- [ ] 1.5 In `app/api/events/route.ts` and `app/api/events/[id]/route.ts`, change `cover_image_blurhash` to `.max(4000)`
- [ ] 1.6 In `app/api/products/route.ts` and `app/api/products/[id]/route.ts`, change the `photo_blurhashes` element to `.max(4000)`
- [ ] 1.7 Grep the repo for `max(500)` on any `blurhash`/placeholder field to confirm none were missed; add a one-line comment near each cap noting it must exceed the data-URL placeholder length from `lib/image.ts`

## 2. Phone/WhatsApp input restriction + client/server parity

- [ ] 2.1 In `lib/phone.ts`, add and export `sanitizePhoneInput(value: string): string` that keeps only digits and `+ ( ) - . space`, allowing at most one leading `+`
- [ ] 2.2 In `components/CrafterForm.tsx`, remove the local lenient `looksLikePhone` (lines ~21–24) and import the shared `looksLikePhone` from `lib/phone.ts` so the client gate matches the server `refine` exactly
- [ ] 2.3 In `components/CrafterForm.tsx`, route the WhatsApp `onChange` through `sanitizePhoneInput` so invalid characters never enter the field
- [ ] 2.4 In `components/StoreForm.tsx`, route `contact_phone` and `contact_whatsapp` `onChange` through `sanitizePhoneInput` and ensure any local phone gate uses the shared `looksLikePhone`
- [ ] 2.5 In `components/StudioForm.tsx`, do the same for `contact_phone` and `contact_whatsapp`

## 3. Inline, while-typing validation feedback

- [ ] 3.1 In `components/CrafterForm.tsx`, extend the `errors` map to include a `contact_whatsapp` entry: when the field is non-empty and fails `looksLikePhone`, set "Enter a valid phone number"
- [ ] 3.2 In `components/CrafterForm.tsx` step 3, render an inline error block under the WhatsApp input (mirroring the `name`/`profile_photo` pattern with `aria-invalid` + `aria-describedby` + `role="alert"`)
- [ ] 3.3 In `components/CrafterForm.tsx`, ensure required-field/contact errors render on the step that owns the field so clicking "Next" never defers the error to a later step
- [ ] 3.4 In `components/StoreForm.tsx`, `components/StudioForm.tsx`, `components/EventForm.tsx`, `components/ProductForm.tsx`, add inline under-field error rendering (on blur/touch) for phone, website/URL, and required fields using existing local state

## 4. Sibling-form audit ("other silly mistakes like this")

- [ ] 4.1 Audit StoreForm/StudioForm/EventForm/ProductForm for the same three issues (blurhash caps, unrestricted phone input, errors only on submit) and list each finding in this file before fixing
- [ ] 4.2 Audit website/URL fields across all forms: confirm `normalizeWebsite`-style scheme handling and an inline error when the value fails `z.string().url()`, so the user isn't rejected at submit
- [ ] 4.3 Audit for any other local helpers that mirror a server rule more leniently than the server (like the old CrafterForm `looksLikePhone`) and unify them with the shared `lib/` helpers

## 5. Verify

- [ ] 5.1 Run typecheck/build (`npm run build` or `tsc --noEmit`) and lint; fix any breakage from the edits
- [ ] 5.2 Manually create one listing of each type: upload a large photo that previously triggered the 500 error and confirm it now publishes
- [ ] 5.3 In a phone field, attempt to type letters/symbols and confirm they don't appear; enter a valid number and confirm no "enter a valid phone number" error at submit
- [ ] 5.4 Enter an invalid phone/URL and confirm the inline error appears on the current step (while typing/on blur), not after clicking "Next" or "Publish"
- [ ] 5.5 (Follow-up note) File a separate change to replace the base64 data-URL placeholder with a compact blurhash encoding to shrink payloads — out of scope here
