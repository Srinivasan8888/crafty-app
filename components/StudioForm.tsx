"use client";

// PRD §7.5 — Studio create form. Same single-page pattern as StoreForm
// but with disciplines (instead of supply categories) and an optional
// age-group field.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { track } from "@/lib/analytics";
import { useFormDraft } from "@/lib/useFormDraft";
import { DraftBanner } from "@/components/DraftBanner";

type Option = { id: string; display_name: string; slug: string };
type StudioFormValues = {
  name: string;
  logo_photo: string;
  logo_photo_blurhash: string;
  city_id: string;
  address: string;
  is_online_only: boolean;
  age_group: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_website: string;
  discipline_ids: string[];
};
type Props = {
  cities: Option[];
  disciplines: Option[];
  entityId?: string;
  initialValues?: Partial<StudioFormValues>;
};

export function StudioForm({ cities, disciplines, entityId, initialValues }: Props) {
  const router = useRouter();
  const isEdit = Boolean(entityId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const [form, setForm] = useState<StudioFormValues>({
    name: initialValues?.name ?? "",
    logo_photo: initialValues?.logo_photo ?? "",
    logo_photo_blurhash: initialValues?.logo_photo_blurhash ?? "",
    city_id: initialValues?.city_id ?? cities[0]?.id ?? "",
    address: initialValues?.address ?? "",
    is_online_only: initialValues?.is_online_only ?? false,
    age_group: initialValues?.age_group ?? "",
    contact_phone: initialValues?.contact_phone ?? "",
    contact_whatsapp: initialValues?.contact_whatsapp ?? "",
    contact_website: initialValues?.contact_website ?? "",
    discipline_ids: initialValues?.discipline_ids ?? [],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const draft = useFormDraft(isEdit ? `studio:edit:${entityId}` : "studio:new", form, { skip: isEdit });

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
        throw new Error(j.error ?? "upload_failed");
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

  function toggleDisc(id: string) {
    if (form.discipline_ids.includes(id)) {
      set("discipline_ids", form.discipline_ids.filter((x) => x !== id));
    } else if (form.discipline_ids.length < 5) {
      set("discipline_ids", [...form.discipline_ids, id]);
    }
  }

  const valid =
    form.name.trim().length >= 3 &&
    form.logo_photo &&
    form.city_id &&
    (form.is_online_only || form.address.trim().length > 0) &&
    form.discipline_ids.length > 0 &&
    (form.contact_phone || form.contact_whatsapp || form.contact_website);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        address: form.address || "",
        age_group: form.age_group || null,
        contact_phone: form.contact_phone || null,
        contact_whatsapp: form.contact_whatsapp || null,
        contact_website: form.contact_website || null,
      };
      const res = await fetch(isEdit ? `/api/studios/${entityId}` : "/api/studios", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? (isEdit ? "update_failed" : "create_failed"));
      }
      const j = (await res.json()) as { slug: string; city: string };
      if (!isEdit) {
        track("profile_completed", { entity_type: "STUDIO", slug: j.slug, city: j.city });
      }
      draft.clear();
      router.push(`/${j.city}/learn/${j.slug}`);
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

      <Field label="Studio name *" htmlFor="studio-name">
        <input
          id="studio-name"
          className="input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Anjali's Pottery Studio"
          maxLength={80}
        />
      </Field>

      <Field label="Logo / studio photo *" htmlFor="studio-logo">
        <label
          htmlFor="studio-logo"
          className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-canvas-raised p-4 hover:border-ink"
        >
          {logoBusy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          <span className="text-sm text-ink-muted">{logoBusy ? "Uploading…" : "Click to upload (≤5MB)"}</span>
          <input
            id="studio-logo"
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

      <Field label="City *" htmlFor="studio-city">
        <select id="studio-city" className="input" value={form.city_id} onChange={(e) => set("city_id", e.target.value)}>
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
        <Field label="Address *" htmlFor="studio-address">
          <input
            id="studio-address"
            className="input"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Whitefield, Bengaluru"
            maxLength={200}
          />
        </Field>
      )}

      <Field label="Age group" htmlFor="studio-age" hint="Optional. E.g. Kids 6–12, Teens, Adults, All ages.">
        <input
          id="studio-age"
          className="input"
          value={form.age_group}
          onChange={(e) => set("age_group", e.target.value)}
          placeholder="All ages"
          maxLength={40}
        />
      </Field>

      <Field label="Disciplines *" hint="Pick at least one (up to 5)">
        <div className="flex flex-wrap gap-2">
          {disciplines.map((d) => {
            const selected = form.discipline_ids.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                className={`pill sm${selected ? " active" : ""}`}
                aria-pressed={selected}
                onClick={() => toggleDisc(d.id)}
              >
                {d.display_name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Contact" hint="At least one is required.">
        <div className="space-y-3">
          <input
            type="tel"
            className="input"
            value={form.contact_phone}
            onChange={(e) => set("contact_phone", e.target.value)}
            placeholder="Phone — +91-98xxx-xxxxx"
          />
          <input
            type="tel"
            className="input"
            value={form.contact_whatsapp}
            onChange={(e) => set("contact_whatsapp", e.target.value)}
            placeholder="WhatsApp — +91-98xxx-xxxxx"
          />
          <input
            type="url"
            className="input"
            value={form.contact_website}
            onChange={(e) => set("contact_website", e.target.value)}
            placeholder="Website — https://example.com"
          />
        </div>
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={submit}
          disabled={!valid || submitting}
        >
          {submitting ? (isEdit ? "Saving…" : "Publishing…") : isEdit ? "Save changes" : "Publish studio"}
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
