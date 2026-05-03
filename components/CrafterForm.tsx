"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";

type Option = { id: string; display_name: string; slug: string };
type Props = { cities: Option[]; categories: Option[] };

export function CrafterForm({ cities, categories }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [portfolioBusy, setPortfolioBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    bio: "",
    city_id: cities[0]?.id ?? "",
    profile_photo: "",
    portfolio_photos: [] as string[],
    contact_whatsapp: "",
    contact_instagram: "",
    contact_website: "",
    offers_classes: false,
    category_ids: [] as string[],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  async function uploadOne(file: File, folder: "profile-photos" | "portfolio") {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/upload?folder=${folder}`, { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "upload_failed");
    }
    const j = (await res.json()) as { full: string; medium: string; thumb: string };
    return j.medium; // store medium for cards/profile; full/thumb regenerable
  }

  async function onProfile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileBusy(true);
    try {
      const url = await uploadOne(file, "profile-photos");
      set("profile_photo", url);
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
      const urls = await Promise.all(files.slice(0, remaining).map((f) => uploadOne(f, "portfolio")));
      set("portfolio_photos", [...form.portfolio_photos, ...urls]);
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
    }
  }

  function step1Valid() { return form.name.trim().length >= 3 && form.category_ids.length > 0 && form.city_id; }
  function step2Valid() { return Boolean(form.profile_photo); }
  function step3Valid() { return Boolean(form.contact_whatsapp || form.contact_instagram || form.contact_website); }

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
        contact_website: form.contact_website || null,
        tagline: form.tagline || null,
        bio: form.bio || null,
      };
      const res = await fetch("/api/crafters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "create_failed");
      }
      const j = (await res.json()) as { slug: string; city: string };
      router.push(`/${j.city}/crafters/${j.slug}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper step={step} />

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
                    className="chip"
                    data-active={selected}
                    aria-pressed={selected}
                    onClick={() => toggleCat(c.id)}
                  >
                    {c.display_name}
                  </button>
                );
              })}
            </div>
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
              placeholder="https://example.com"
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
            nextLabel={submitting ? "Publishing…" : "Publish profile"}
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
