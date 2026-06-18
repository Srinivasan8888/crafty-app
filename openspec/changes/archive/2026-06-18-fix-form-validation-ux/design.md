## Context

The listing forms (CrafterForm 4-step wizard + single-page StoreForm/StudioForm/EventForm/ProductForm) block creators at submit with errors they can't act on. Three distinct root causes, all confirmed in code:

1. **Blurhash cap mismatch.** `lib/image.ts` `processAndStoreImage()` builds the "blurhash" as a base64 data-URL of a 16×16 JPEG: `` `data:image/jpeg;base64,${tiny.toString("base64")}` ``. That string is typically 400–1090 chars. Every API schema validates `*_blurhash` with `z.string().max(500)` (and `z.array(z.string().max(500))` for arrays). The Prisma columns are plain `String?` / `String[]` → Postgres `text`, with **no length constraint**. So the only thing rejecting a perfectly good upload is an arbitrary, too-small Zod cap. → `"profile photo blurhash: string must contain at most 500 character(s)"`.

2. **Phone input not restricted + client/server validation mismatch.** The WhatsApp/phone `<input type="tel">` calls `set("contact_whatsapp", e.target.value)` with no sanitization, so letters and symbols enter the field. Worse, CrafterForm's local gate `looksLikePhone(v)` (lines 22–24) only checks `v.replace(/\D/g,"").length >= 7` — it ignores the leading-character rule the **server** enforces (`lib/phone.ts`: `/^\+?[\d][\d\s().-]*$/`). So `"abc 1234567"` passes the client step-gate but the server rejects it → the error appears only at final submit.

3. **Server errors surface only on the Review step / final submit.** CrafterForm already has an inline `errors` map (lines 166–190) for name/categories/profile_photo, but **not** for the WhatsApp field, and the blurhash/phone server errors come back from the POST/PATCH on step 4 and render in the generic top banner (line 255). The user fills steps 1–3, advances to Review, clicks Publish, and only then sees the failure — on a different page from the field that caused it.

Constraints: pre-launch, no DB migration desired, changes must be additive (loosen limits, add feedback) with no breaking changes. The fix must be applied uniformly so the same bug class doesn't survive in a sibling form.

## Goals / Non-Goals

**Goals:**
- A successful image upload can never cause a blurhash length error on submit (any listing type).
- Phone/WhatsApp fields physically cannot contain invalid characters; the client gate matches the server rule exactly.
- Field errors appear inline, on the field, while the user is on the step that contains it — not after navigation/submit.
- The same three fixes are applied consistently across crafters, stores, studios, events, products.

**Non-Goals:**
- Replacing the data-URL placeholder with a "real" blurhash (e.g. the `blurhash` npm encoding). That's a separate optimization; raising the cap fully resolves the reported bug.
- Migrating to react-hook-form / a form library. We keep the existing manual `useState` validation pattern and extend it.
- Changing the contact-method business rule (at least one of WhatsApp/Instagram/Website required) or DB schema.
- Full i18n of new error strings beyond following the existing pattern.

## Decisions

### Decision 1: Raise the blurhash cap to 4000 chars across all routes (don't remove it)
Set `*_blurhash` string caps to `.max(4000)` everywhere: crafters, stores, studios, events, products — POST and PATCH. A 16×16 JPEG data-URL tops out ~1.1k chars, so 4000 is comfortable headroom while still rejecting a pathological multi-megabyte payload (defense against a client sending a full-resolution data-URL).
- **Alternative — remove the cap:** rejected; keeping a sane upper bound guards the DB/API from abuse.
- **Alternative — generate a compact blurhash (~30 chars) and keep `.max(500)`:** better long-term (smaller payloads, faster pages) but a larger change touching image processing + all render sites and their fallbacks; out of scope for a launch-blocking bugfix. Note as a follow-up.

### Decision 2: Sanitize phone input at the point of entry, and unify the client gate with the server rule
Add `sanitizePhoneInput(value)` to `lib/phone.ts` that keeps only `[0-9+()\-.\s]` (and collapses to a single leading `+`). Wire every phone/WhatsApp `onChange` through it so disallowed characters never appear. Replace CrafterForm's local lenient `looksLikePhone` with the shared `looksLikePhone` from `lib/phone.ts` so the client gate and server `refine` are identical — no more "passes client, fails server".
- **Alternative — input-mask library:** rejected; adds a dependency for a rule a 1-line regex covers. Sanitize-on-change gives the same "can't type junk" UX.
- Keep `type="tel"` + `inputMode="tel"` for the mobile numeric keypad.

### Decision 3: Show per-field errors inline, validated on blur/touch, on the current step
Extend the existing `errors` map pattern in CrafterForm to include the WhatsApp field (e.g. "Enter a valid phone number" once the field is non-empty and fails `looksLikePhone`), and render the error block under the WhatsApp input — mirroring how `name`/`profile_photo` already render. For the single-page forms, add the same inline-under-field error rendering for phone/URL/required fields using their existing local state. The generic top banner remains as a last-resort fallback for true server/network errors, but expected validation failures should be caught and shown inline before submit.
- Use a "touched" notion (field non-empty, or blurred) so we don't shout at empty fields, consistent with the existing comment at lines 164–165.
- **Alternative — validate the whole form on every keystroke:** rejected; noisy. Touch/blur-scoped is the established pattern here.

### Decision 4: Audit sibling forms and fix uniformly
StoreForm and StudioForm each have phone + whatsapp inputs and blurhash fields; EventForm/ProductForm have blurhash fields. Apply: (a) raised blurhash cap in their routes, (b) `sanitizePhoneInput` on their phone inputs, (c) inline error rendering. Record findings (e.g. website fields with `type="url"` but no inline error, any other lenient local mirrors of server rules) in tasks so nothing is silently skipped.

## Risks / Trade-offs

- **[A client could POST a huge data-URL up to 4000 chars]** → Bounded and far smaller than the 5MB image limit already enforced at upload; negligible row-size impact on a `text` column.
- **[Sanitizing pasted input could surprise a user pasting a formatted number]** → We keep all standard phone punctuation (`+ ( ) - . space`), so realistic pasted numbers survive; only letters/emoji/etc. are stripped.
- **[Unifying CrafterForm's gate with the stricter server rule could newly-disable "Next" for inputs that previously passed the lenient gate]** → That's the intended correctness fix; combined with input sanitization the user can no longer produce such input, and the inline error explains why.
- **[Touching 10 route files + 5 components risks inconsistency]** → Mitigated by the audit task + a shared helper, plus a typecheck/build at the end.

## Migration Plan

No data migration. Pure code change. Rollout: ship together; verify by creating one listing of each type with (a) a large photo that previously triggered the 500 error, and (b) a phone number typed with junk characters. Rollback = revert the commit; no persisted-state implications since caps only widen and columns are already `text`.

## Open Questions

- Should the long-term compact-blurhash optimization (Decision 1 alternative) be filed as a separate follow-up change now? (Recommend: yes, note it; not part of this change.)
- Exact phone-character policy: keep `.` and `()` as allowed, or trim to `+`, digits, space, `-` only? (Default: keep all standard punctuation to match the existing `looksLikePhone` separators.)
