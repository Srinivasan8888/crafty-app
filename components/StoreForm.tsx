"use client";

// PRD §7.4 — Store create form. Single-page (not multi-step) for V1; the
// CrafterForm's 4-step wizard is the only one that warrants the stepper
// because of photo upload complexity. Stores are leaner.

import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-error";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { track } from "@/lib/analytics";
import { useFormDraft } from "@/lib/useFormDraft";
import { DraftBanner } from "@/components/DraftBanner";
import { looksLikePhone, sanitizePhoneInput } from "@/lib/phone";

// "myshop.com" passes the type=url input (and the submit gate) but is rejected by
// the server z.string().url(). Prepend https:// when the user omitted a scheme so
// the client and server agree.
function normalizeWebsite(v: string) {
  const s = v.trim();
  if (!s || s.includes("://")) return s;
  return `https://${s}`;
}

// Mirror the server z.string().url() — after normalizing a missing scheme.
function looksLikeUrl(v: string) {
  try {
    new URL(normalizeWebsite(v));
    return true;
  } catch {
    return false;
  }
}

type Option = { id: string; display_name: string; slug: string };
type CrafterOption = { id: string; name: string };
type StoreFormValues = {
  name: string;
  logo_photo: string;
  logo_photo_blurhash: string;
  city_id: string;
  address: string;
  is_online_only: boolean;
  contact_phone: string;
  contact_whatsapp: string;
  contact_website: string;
  category_ids: string[];
  crafter_ids: string[];
};
type Props = {
  cities: Option[];
  categories: Option[];
  // storefront-completeness — taggable crafters (edit flow only; omitted → the
  // tag selector is hidden, e.g. on the create page before a city exists).
  crafters?: CrafterOption[];
  entityId?: string;
  initialValues?: Partial<StoreFormValues>;
};

export function StoreForm({ cities, categories, crafters, entityId, initialValues }: Props) {
  const router = useRouter();
  const isEdit = Boolean(entityId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const [form, setForm] = useState<StoreFormValues>({
    name: initialValues?.name ?? "",
    logo_photo: initialValues?.logo_photo ?? "",
    logo_photo_blurhash: initialValues?.logo_photo_blurhash ?? "",
    city_id: initialValues?.city_id ?? cities[0]?.id ?? "",
    address: initialValues?.address ?? "",
    is_online_only: initialValues?.is_online_only ?? false,
    contact_phone: initialValues?.contact_phone ?? "",
    contact_whatsapp: initialValues?.contact_whatsapp ?? "",
    contact_website: initialValues?.contact_website ?? "",
    category_ids: initialValues?.category_ids ?? [],
    crafter_ids: initialValues?.crafter_ids ?? [],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const draft = useFormDraft(isEdit ? `store:edit:${entityId}` : "store:new", form, { skip: isEdit });

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?folder=profile-photos", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(j, "Upload failed. Try a smaller image (5MB max)."));
      }
      const j = (await res.json()) as { medium: string; blurhash: string };
      set("logo_photo", j.medium);
      set("logo_photo_blurhash", j.blurhash ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  function toggleCat(id: string) {
    if (form.category_ids.includes(id)) {
      set("category_ids", form.category_ids.filter((x) => x !== id));
    } else if (form.category_ids.length < 5) {
      set("category_ids", [...form.category_ids, id]);
    }
  }

  function toggleCrafter(id: string) {
    if (form.crafter_ids.includes(id)) {
      set("crafter_ids", form.crafter_ids.filter((x) => x !== id));
    } else if (form.crafter_ids.length < 20) {
      set("crafter_ids", [...form.crafter_ids, id]);
    }
  }

  const valid =
    form.name.trim().length >= 3 &&
    form.logo_photo &&
    form.city_id &&
    (form.is_online_only || form.address.trim().length > 0) &&
    form.category_ids.length > 0 &&
    // Mirror the server: a contact method only counts if it's plausibly valid
    // (phone/whatsapp >=7 digits, website a URL) so invalid input doesn't pass
    // the gate then fail at Publish.
    Boolean(
      (form.contact_phone.trim() && looksLikePhone(form.contact_phone)) ||
      (form.contact_whatsapp.trim() && looksLikePhone(form.contact_whatsapp)) ||
      (form.contact_website.trim() && looksLikeUrl(form.contact_website)),
    );

  // When Publish is disabled, say why — derived from the same conditions above so
  // a greyed button always has an honest reason.
  const unmet: string[] = [];
  if (form.name.trim().length < 3) unmet.push("Store name needs 3+ characters");
  if (!form.logo_photo) unmet.push("Add a logo / storefront photo");
  if (!form.is_online_only && form.address.trim().length === 0) unmet.push("Add an address");
  if (form.category_ids.length === 0) unmet.push("Pick at least one supply category");
  if (
    !(
      (form.contact_phone.trim() && looksLikePhone(form.contact_phone)) ||
      (form.contact_whatsapp.trim() && looksLikePhone(form.contact_whatsapp)) ||
      (form.contact_website.trim() && looksLikeUrl(form.contact_website))
    )
  )
    unmet.push("Add one valid contact (phone, WhatsApp, or website)");

  // Field-level inline errors for a11y, mirroring CrafterForm. Each entry is
  // only populated once the field is non-empty (touched), so empty optional
  // contact fields don't shout before the user has typed anything.
  const errors: Partial<Record<"contact_phone" | "contact_whatsapp" | "contact_website", string>> = {};
  if (form.contact_phone.trim() && !looksLikePhone(form.contact_phone)) {
    errors.contact_phone = "Enter a valid phone number.";
  }
  if (form.contact_whatsapp.trim() && !looksLikePhone(form.contact_whatsapp)) {
    errors.contact_whatsapp = "Enter a valid phone number.";
  }
  if (form.contact_website.trim() && !looksLikeUrl(form.contact_website)) {
    errors.contact_website = "Enter a valid URL (e.g. https://example.com).";
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        address: form.address || "",
        contact_phone: form.contact_phone || null,
        contact_whatsapp: form.contact_whatsapp || null,
        contact_website: normalizeWebsite(form.contact_website) || null,
      };
      const res = await fetch(isEdit ? `/api/stores/${entityId}` : "/api/stores", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(j, isEdit ? "Could not save your changes. Please try again." : "Could not publish. Please check the form and try again."));
      }
      const j = (await res.json()) as { slug: string; city: string };
      if (!isEdit) {
        track("profile_completed", { entity_type: "STORE", slug: j.slug, city: j.city });
      }
      draft.clear();
      router.push(`/${j.city}/stores/${j.slug}${isEdit ? "" : "?welcome=1"}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {draft.restored && (
        <DraftBanner
          onRestore={() => { setForm(draft.restored as typeof form); draft.dismiss(); }}
          onDismiss={() => { draft.clear(); }}
        />
      )}
      {error && (
        <div role="alert" className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Field label="Store name *" htmlFor="store-name">
        <input
          id="store-name"
          className="input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Krishnan Yarns"
          maxLength={80}
        />
      </Field>

      <Field label="Logo / storefront photo *" htmlFor="store-logo">
        <label
          htmlFor="store-logo"
          className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-canvas-raised p-4 hover:border-ink"
        >
          {logoBusy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          <span className="text-sm text-ink-muted">{logoBusy ? "Uploading…" : "Click to upload (≤5MB)"}</span>
          <input
            id="store-logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onLogo}
            disabled={logoBusy}
          />
        </label>
        {form.logo_photo && (
          <Image
            src={form.logo_photo}
            alt="Logo preview"
            width={96}
            height={96}
            className="mt-3 h-24 w-24 rounded-md object-cover"
          />
        )}
      </Field>

      <Field label="City *" htmlFor="store-city">
        <select id="store-city" className="input" value={form.city_id} onChange={(e) => set("city_id", e.target.value)}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_online_only}
          onChange={(e) => set("is_online_only", e.target.checked)}
        />
        <span className="text-sm">Online-only (no physical address)</span>
      </label>

      {!form.is_online_only && (
        <Field label="Address *" htmlFor="store-address">
          <input
            id="store-address"
            className="input"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="12 Commercial Street, Bengaluru"
            maxLength={200}
          />
        </Field>
      )}

      <Field label="Supply categories *" hint="Pick at least one (up to 5)">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const selected = form.category_ids.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`pill sm${selected ? " active" : ""}`}
                aria-pressed={selected}
                onClick={() => toggleCat(c.id)}
              >
                {c.display_name}
              </button>
            );
          })}
        </div>
      </Field>

      {crafters && crafters.length > 0 && (
        <Field label="Crafters sourced here" hint="Optional — tag crafters whose work you stock or source (up to 20). Shown on your public page.">
          <div className="flex flex-wrap gap-2">
            {crafters.map((c) => {
              const selected = form.crafter_ids.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`pill sm${selected ? " active" : ""}`}
                  aria-pressed={selected}
                  onClick={() => toggleCrafter(c.id)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Contact" hint="At least one is required.">
        <div className="space-y-3">
          <div>
            <input
              id="store-phone"
              type="tel"
              inputMode="tel"
              className="input"
              aria-label="Phone number"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", sanitizePhoneInput(e.target.value))}
              placeholder="Phone — +91-98xxx-xxxxx"
              maxLength={40}
              aria-invalid={!!errors.contact_phone}
              aria-describedby={errors.contact_phone ? "store-phone-error" : undefined}
            />
            {errors.contact_phone && (
              <p id="store-phone-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.contact_phone}
              </p>
            )}
          </div>
          <div>
            <input
              id="store-whatsapp"
              type="tel"
              inputMode="tel"
              className="input"
              aria-label="WhatsApp number"
              value={form.contact_whatsapp}
              onChange={(e) => set("contact_whatsapp", sanitizePhoneInput(e.target.value))}
              placeholder="WhatsApp — +91-98xxx-xxxxx"
              maxLength={40}
              aria-invalid={!!errors.contact_whatsapp}
              aria-describedby={errors.contact_whatsapp ? "store-whatsapp-error" : undefined}
            />
            {errors.contact_whatsapp && (
              <p id="store-whatsapp-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.contact_whatsapp}
              </p>
            )}
          </div>
          <div>
            <input
              id="store-website"
              type="url"
              inputMode="url"
              className="input"
              aria-label="Website"
              value={form.contact_website}
              onChange={(e) => set("contact_website", e.target.value)}
              onBlur={(e) => set("contact_website", normalizeWebsite(e.target.value))}
              placeholder="Website — https://example.com"
              maxLength={500}
              aria-invalid={!!errors.contact_website}
              aria-describedby={errors.contact_website ? "store-website-error" : undefined}
            />
            {errors.contact_website && (
              <p id="store-website-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.contact_website}
              </p>
            )}
          </div>
        </div>
      </Field>

      <div className="flex flex-col items-end gap-2 pt-2">
        {!valid && unmet.length > 0 && (
          <p className="text-sm text-ink-muted">{unmet.join(" · ")}</p>
        )}
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={submit}
          disabled={!valid || submitting}
        >
          {submitting ? (isEdit ? "Saving…" : "Publishing…") : isEdit ? "Save changes" : "Publish store"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {hint && <p className="mb-1.5 text-xs text-ink-subtle">{hint}</p>}
      {children}
    </div>
  );
}
