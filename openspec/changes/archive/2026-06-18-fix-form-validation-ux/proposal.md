## Why

Creators cannot complete the listing forms. After filling in every step and clicking "Next" / submitting, they are blocked by validation errors that are impossible to satisfy or impossible to understand:

- **"profile photo blurhash: string must contain at most 500 character(s)"** and **"portfolio blurhashes: string must contain at most 500 character(s)"** — these are generated automatically by the app, not typed by the user, so there is nothing the user can do to fix them. The form is a dead end.
- **"WhatsApp number: enter a valid phone number"** — the phone field accepts any character (letters, symbols), so users type something that silently fails server validation.
- All of these errors appear **only after the user clicks "Next" and lands on a later step (or submits the whole form)** rather than inline while typing, so the user can't tell which field is wrong or fix it in context.

This blocks the core onboarding flow (creating a crafter/store/studio/event/product listing) right before launch, and the previous "fix" made it worse by adding stricter validation without fixing the underlying mismatch.

## What Changes

- **Fix the blurhash length limit (root cause).** `lib/image.ts` stores a base64 data-URL placeholder (`data:image/jpeg;base64,…`, typically 400–1090 chars) in the `*_blurhash` fields, but every Zod schema caps these fields at `.max(500)`. The DB columns are unconstrained `text`, so the cap is purely an arbitrary, too-small schema limit. Raise the cap to a safe bound that always fits the generated placeholder (e.g. 4000), across **all** listing routes — crafters, stores, studios, events, products. This eliminates the blurhash errors entirely.
- **Restrict the phone/WhatsApp inputs to valid characters as the user types.** Sanitize input on change to allow only digits and standard phone punctuation (`+`, space, `-`, `(`, `)`), so the user physically cannot enter an invalid phone number. Apply to every phone/WhatsApp input (CrafterForm, StoreForm, StudioForm).
- **Show validation errors inline, while typing, on the field that is wrong** — instead of only disabling the "Next" button or surfacing a generic banner after navigation/submit. Each step validates its own fields on blur/change and renders the message under the offending field.
- **Audit the other listing forms for the same class of mistakes** and apply the fixes consistently (blurhash caps, phone input restriction, inline error messaging, required-field/URL feedback). Document what was found.

## Capabilities

### New Capabilities
- `listing-form-validation`: Defines how the listing creation/edit forms validate input — generated placeholder fields (blurhash) must never block submission, contact fields must be constrained at input time, and validation feedback must be shown inline on the relevant field as the user fills it out rather than deferred to a later step or final submit.

### Modified Capabilities
<!-- None — no existing spec governs listing form validation. -->

## Impact

- **Validation schemas (raise blurhash cap):** `app/api/crafters/route.ts`, `app/api/crafters/[id]/route.ts`, `app/api/stores/route.ts`, `app/api/stores/[id]/route.ts`, `app/api/studios/route.ts`, `app/api/studios/[id]/route.ts`, `app/api/events/route.ts`, `app/api/events/[id]/route.ts`, `app/api/products/route.ts`, `app/api/products/[id]/route.ts`.
- **Phone input + inline validation:** `components/CrafterForm.tsx` (4-step wizard), `components/StoreForm.tsx`, `components/StudioForm.tsx`, `components/EventForm.tsx`, `components/ProductForm.tsx`.
- **Shared helpers:** `lib/phone.ts` (add a `sanitizePhoneInput` helper), possibly a small shared input-sanitizer; `lib/image.ts` (blurhash generation — no behavior change required, but documents the expected length bound).
- **No database migration required** — columns are unconstrained `text` / `text[]`.
- **No breaking changes** — limits are loosened and feedback is additive.
