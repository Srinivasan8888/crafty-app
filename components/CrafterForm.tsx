"use client";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-error";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { useFormDraft } from "@/lib/useFormDraft";
import { DraftBanner } from "@/components/DraftBanner";

// "myshop.com" passes the type=url input (and step gates) but is rejected by the
// server z.string().url(). Prepend https:// when the user omitted a scheme so the
// client and server agree.
function normalizeWebsite(v: string) {
  const s = v.trim();
  if (!s || s.includes("://")) return s;
  return `https://${s}`;
}

// Mirror the server phone rule (>=7 digits) for a gentle client-side gate.
function looksLikePhone(v: string) {
  return v.replace(/\D/g, "").length >= 7;
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
type CrafterFormValues = {
  name: string;
  tagline: string;
  bio: string;
  city_id: string;
  profile_photo: string;
  profile_photo_blurhash: string;
  portfolio_photos: string[];
  portfolio_blurhashes: string[];
  contact_whatsapp: string;
  contact_instagram: string;
  contact_website: string;
  offers_classes: boolean;
  category_ids: string[];
};
type Props = {
  cities: Option[];
  categories: Option[];
  /** If set, the form runs in EDIT mode: PATCH /api/crafters/[entityId] on submit. */
  entityId?: string;
  initialValues?: Partial<CrafterFormValues>;
};

export function CrafterForm({ cities, categories, entityId, initialValues }: Props) {
  const router = useRouter();
  const isEdit = Boolean(entityId);
  // In edit mode skip the wizard and jump straight to the last step (Review)
  // so all the existing data is visible; users can still flip back to earlier
  // steps to edit individual fields.
  const [step, setStep] = useState<1 | 2 | 3 | 4>(isEdit ? 4 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [portfolioBusy, setPortfolioBusy] = useState(false);

  const [form, setForm] = useState<CrafterFormValues>({
    name: initialValues?.name ?? "",
    tagline: initialValues?.tagline ?? "",
    bio: initialValues?.bio ?? "",
    city_id: initialValues?.city_id ?? cities[0]?.id ?? "",
    profile_photo: initialValues?.profile_photo ?? "",
    profile_photo_blurhash: initialValues?.profile_photo_blurhash ?? "",
    portfolio_photos: initialValues?.portfolio_photos ?? [],
    portfolio_blurhashes: initialValues?.portfolio_blurhashes ?? [],
    contact_whatsapp: initialValues?.contact_whatsapp ?? "",
    contact_instagram: initialValues?.contact_instagram ?? "",
    contact_website: initialValues?.contact_website ?? "",
    offers_classes: initialValues?.offers_classes ?? false,
    category_ids: initialValues?.category_ids ?? [],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Draft auto-save (PRD §23.5). Skipped in edit mode — editing already-published
  // data through a stale draft would be confusing.
  const draft = useFormDraft(isEdit ? `crafter:edit:${entityId}` : "crafter:new", form, { skip: isEdit });

  async function uploadOne(file: File, folder: "profile-photos" | "portfolio") {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/upload?folder=${folder}`, { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(apiErrorMessage(j, "Upload failed. Try a smaller image (5MB max)."));
    }
    const j = (await res.json()) as { full: string; medium: string; thumb: string; blurhash: string };
    return { url: j.medium, blurhash: j.blurhash ?? "" };
  }

  async function onProfile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileBusy(true);
    try {
      const { url, blurhash } = await uploadOne(file, "profile-photos");
      set("profile_photo", url);
      set("profile_photo_blurhash", blurhash);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function onPortfolio(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 6 - form.portfolio_photos.length;
    setPortfolioBusy(true);
    try {
      const uploads = await Promise.all(files.slice(0, remaining).map((f) => uploadOne(f, "portfolio")));
      set("portfolio_photos", [...form.portfolio_photos, ...uploads.map((u) => u.url)]);
      set("portfolio_blurhashes", [...form.portfolio_blurhashes, ...uploads.map((u) => u.blurhash)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPortfolioBusy(false);
    }
  }

  function toggleCat(id: string) {
    if (form.category_ids.includes(id)) {
      set("category_ids", form.category_ids.filter((x) => x !== id));
    } else if (form.category_ids.length < 3) {
      set("category_ids", [...form.category_ids, id]);
    } else {
      // At the limit: drop the oldest selection to make room for the new one.
      // Feels less hostile than ignoring the click.
      set("category_ids", [...form.category_ids.slice(1), id]);
    }
  }

  function step1Valid() { return form.name.trim().length >= 3 && form.category_ids.length > 0 && form.city_id; }
  function step2Valid() { return Boolean(form.profile_photo); }
  function step3Valid() {
    // Mirror the server: a contact method only counts if it's plausibly valid
    // (whatsapp >=7 digits, website a URL) so invalid input doesn't pass every
    // step then fail at Publish. Instagram is a free-text handle (max 40).
    const whatsappOk = form.contact_whatsapp.trim() !== "" && looksLikePhone(form.contact_whatsapp);
    const instagramOk = form.contact_instagram.trim() !== "";
    const websiteOk = form.contact_website.trim() !== "" && looksLikeUrl(form.contact_website);
    return whatsappOk || instagramOk || websiteOk;
  }

  // Field-level error wiring for a11y. Errors only show after the user has
  // touched the field (typed something) so they don't shout at empty fields.
  const errors: Partial<Record<
    | "name"
    | "profile_photo"
    | "contact"
    , string
  >> = {};
  if (form.name.length > 0 && form.name.trim().length < 3) {
    errors.name = "Name must be at least 3 characters.";
  }
  if (step === 2 && !form.profile_photo) {
    errors.profile_photo = "A profile photo is required.";
  }
  const anyContactTouched =
    form.contact_whatsapp.length > 0 ||
    form.contact_instagram.length > 0 ||
    form.contact_website.length > 0;
  if (step === 3 && !anyContactTouched) {
    // Only treat as error after the user has tried to advance — keep silent here.
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        contact_whatsapp: form.contact_whatsapp || null,
        contact_instagram: form.contact_instagram || null,
        contact_website: normalizeWebsite(form.contact_website) || null,
        tagline: form.tagline || null,
        bio: form.bio || null,
      };
      const res = await fetch(isEdit ? `/api/crafters/${entityId}` : "/api/crafters", {
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
        track("profile_completed", { entity_type: "CRAFTER", slug: j.slug, city: j.city });
      }
      draft.clear();
      router.push(`/${j.city}/crafters/${j.slug}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper step={step} />

      {draft.restored && (
        <DraftBanner
          onRestore={() => { setForm(draft.restored as typeof form); draft.dismiss(); }}
          onDismiss={() => { draft.clear(); }}
        />
      )}
      {error && <div className="mb-4 rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="name">Crafter / shop name *</label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Aisha Crochet"
              maxLength={60}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="tagline">Tagline</label>
            <input id="tagline" className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Hand-crocheted heirlooms from Indiranagar" maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="city">City *</label>
            <select id="city" className="input" value={form.city_id} onChange={(e) => set("city_id", e.target.value)}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" id="categories-label">Craft categories * <span className="text-ink-subtle">(pick 1–3)</span></label>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="categories-label">
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
            <CategoryCounter count={form.category_ids.length} />
          </div>
          <Nav onNext={() => setStep(2)} disabled={!step1Valid()} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="step2-profile-photo">Profile photo *</label>
            <UploadField
              id="step2-profile-photo"
              busy={profileBusy}
              onChange={onProfile}
              ariaInvalid={!!errors.profile_photo}
              ariaDescribedBy={errors.profile_photo ? "step2-profile-photo-error" : undefined}
            />
            {errors.profile_photo && (
              <p id="step2-profile-photo-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.profile_photo}
              </p>
            )}
            {form.profile_photo && (
              <Image
                src={form.profile_photo}
                alt="Profile photo preview"
                width={96}
                height={96}
                className="mt-3 h-24 w-24 rounded-md object-cover"
              />
            )}
          </div>
          <div>
            <label className="label" htmlFor="step2-portfolio-photos">Portfolio photos <span className="text-ink-subtle">(up to 6)</span></label>
            <UploadField id="step2-portfolio-photos" busy={portfolioBusy} multiple onChange={onPortfolio} />
            {form.portfolio_photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {form.portfolio_photos.map((u, i) => (
                  <div key={u} className="relative h-24 w-full">
                    <Image
                      src={u}
                      alt={`Portfolio photo ${i + 1}`}
                      fill
                      sizes="(max-width:640px) 33vw, 200px"
                      className="rounded-md object-cover"
                    />
                    <button type="button" onClick={() => set("portfolio_photos", form.portfolio_photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-canvas/90 p-0.5 text-ink-muted hover:text-danger" aria-label="Remove">
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!step2Valid()} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <p id="step3-contact-help" className="text-sm text-ink-muted">Add at least one way for buyers to reach you.</p>
          <div>
            <label className="label" htmlFor="step3-whatsapp">WhatsApp number</label>
            <input
              id="step3-whatsapp"
              type="tel"
              inputMode="tel"
              className="input"
              value={form.contact_whatsapp}
              onChange={(e) => set("contact_whatsapp", e.target.value)}
              placeholder="+91-98865-44321"
              maxLength={40}
              aria-describedby="step3-contact-help"
            />
          </div>
          <div>
            <label className="label" htmlFor="step3-instagram">Instagram handle</label>
            <input
              id="step3-instagram"
              type="text"
              className="input"
              value={form.contact_instagram}
              onChange={(e) => set("contact_instagram", e.target.value)}
              placeholder="@aishacrochet"
              maxLength={40}
              aria-describedby="step3-contact-help"
            />
          </div>
          <div>
            <label className="label" htmlFor="step3-website">Website</label>
            <input
              id="step3-website"
              type="url"
              inputMode="url"
              className="input"
              value={form.contact_website}
              onChange={(e) => set("contact_website", e.target.value)}
              onBlur={(e) => set("contact_website", normalizeWebsite(e.target.value))}
              placeholder="https://example.com"
              maxLength={500}
              aria-describedby="step3-contact-help"
            />
          </div>
          <div>
            <label className="label" htmlFor="step3-bio">Bio</label>
            <textarea
              id="step3-bio"
              className="input min-h-[100px]"
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Tell buyers about your craft, materials, lead times…"
              maxLength={2000}
            />
          </div>
          <label className="flex items-center gap-2" htmlFor="step3-offers-classes">
            <input
              id="step3-offers-classes"
              type="checkbox"
              checked={form.offers_classes}
              onChange={(e) => set("offers_classes", e.target.checked)}
            />
            <span className="text-sm">I offer classes / workshops</span>
          </label>
          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} disabled={!step3Valid()} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Review</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Name" v={form.name} />
              <Row k="Tagline" v={form.tagline || "—"} />
              <Row k="City" v={cities.find((c) => c.id === form.city_id)?.display_name ?? ""} />
              <Row k="Categories" v={form.category_ids.map((id) => categories.find((c) => c.id === id)?.display_name).join(", ")} />
              <Row k="Profile photo" v={form.profile_photo ? "✓ uploaded" : "—"} />
              <Row k="Portfolio" v={`${form.portfolio_photos.length} photo(s)`} />
              <Row k="Contact" v={[form.contact_whatsapp, form.contact_instagram, form.contact_website].filter(Boolean).join(" · ") || "—"} />
              <Row k="Teaches?" v={form.offers_classes ? "Yes" : "No"} />
            </dl>
          </div>
          <Nav
            onBack={() => setStep(3)}
            onNext={submit}
            nextLabel={
              submitting
                ? isEdit ? "Saving…" : "Publishing…"
                : isEdit ? "Save changes" : "Publish profile"
            }
            disabled={submitting}
          />
        </div>
      )}
    </div>
  );
}

function UploadField({
  id,
  busy,
  multiple,
  onChange,
  ariaInvalid,
  ariaDescribedBy,
}: {
  id?: string;
  busy: boolean;
  multiple?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-canvas-raised p-4 hover:border-ink"
    >
      {busy ? (
        <Loader2 className="animate-spin" size={18} aria-hidden="true" />
      ) : (
        <Upload size={18} aria-hidden="true" />
      )}
      <span className="text-sm text-ink-muted">{busy ? "Uploading…" : (multiple ? "Click to add images (≤5MB each)" : "Click to upload (≤5MB)")}</span>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        multiple={multiple}
        onChange={onChange}
        disabled={busy}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
      />
    </label>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-8 flex items-center justify-between gap-2 text-xs font-semibold">
      {["Basics", "Photos", "Contact", "Review"].map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-success text-white" : active ? "bg-ink text-canvas" : "bg-canvas-sunken text-ink-subtle"}`}>{n}</span>
            <span className={done || active ? "text-ink" : "text-ink-subtle"}>{label}</span>
            {n < 4 && <span className={`mx-1 h-px flex-1 ${done ? "bg-success" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function Nav({ onBack, onNext, nextLabel = "Next", disabled }: { onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      {onBack ? <button type="button" className="btn" onClick={onBack}>Back</button> : <span />}
      <button type="button" className="btn btn-primary" onClick={onNext} disabled={disabled}>{nextLabel}</button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-ink-muted">{k}</dt><dd className="text-right">{v}</dd></div>;
}

function CategoryCounter({ count }: { count: number }) {
  const messages = [
    "Pick 1–3 categories.",
    "Picked 1 of 3 — pick 2 more (optional).",
    "Picked 2 of 3 — pick 1 more (optional).",
    "Picked 3 of 3 — at the limit.",
  ] as const;
  const msg = messages[Math.min(count, 3)];
  const atLimit = count >= 3;
  return (
    <p
      aria-live="polite"
      className={`mt-2 text-xs italic font-display ${atLimit ? "text-magenta" : "text-ink-muted"}`}
    >
      {msg}
    </p>
  );
}
