"use client";

// PRD §7.6 — Event create form. The trick here is the 3-FK organizer:
// exactly one of (organizer_crafter_id, organizer_store_id, organizer_studio_id)
// must be set. We pre-fetch the user's own listings and force a choice.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { track } from "@/lib/analytics";
import { useFormDraft } from "@/lib/useFormDraft";
import { DraftBanner } from "@/components/DraftBanner";
import { previewOccurrences } from "@/lib/rrule";

type Option = { id: string; display_name: string; slug: string };
type OwnedListing = { id: string; name: string; kind: "CRAFTER" | "STORE" | "STUDIO" };
type EventFormValues = {
  name: string;
  description: string;
  cover_image: string;
  cover_image_blurhash: string;
  organizer: string;
  start_at: string;
  end_at: string;
  city_id: string;
  venue_name: string;
  venue_address: string;
  is_online: boolean;
  event_type: "WORKSHOP" | "FAIR" | "EXHIBITION" | "CLASS" | "POPUP" | "OTHER";
  craft_category_id: string;
  is_free: boolean;
  price_amount: string;
  registration_url: string;
  recurrence_rule: string;
};

type Freq = "DAILY" | "WEEKLY" | "MONTHLY";
type Weekday = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";
const WEEKDAYS: Weekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WEEKDAY_LABEL: Record<Weekday, string> = {
  SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat",
};

function buildRrule(freq: Freq, byday: Weekday[], count: number): string {
  const parts = [`FREQ=${freq}`];
  if (freq === "WEEKLY" && byday.length > 0) parts.push(`BYDAY=${byday.join(",")}`);
  parts.push(`COUNT=${count}`);
  return parts.join(";");
}

function parseInitialRrule(s: string | undefined | null): { freq: Freq; byday: Weekday[]; count: number } {
  if (!s) return { freq: "WEEKLY", byday: [], count: 8 };
  let freq: Freq = "WEEKLY"; let byday: Weekday[] = []; let count = 8;
  for (const p of s.split(";")) {
    const [k, v] = p.split("=");
    const key = k?.toUpperCase(); const val = v?.toUpperCase();
    if (key === "FREQ" && (val === "DAILY" || val === "WEEKLY" || val === "MONTHLY")) freq = val;
    else if (key === "BYDAY" && val) byday = val.split(",").filter((d) => WEEKDAYS.includes(d as Weekday)) as Weekday[];
    else if (key === "COUNT" && val) count = Math.max(1, Math.min(52, parseInt(val, 10) || 8));
  }
  return { freq, byday, count };
}
type Props = {
  cities: Option[];
  categories: Option[];
  ownedListings: OwnedListing[];
  entityId?: string;
  initialValues?: Partial<EventFormValues>;
};

const EVENT_TYPES = [
  ["WORKSHOP", "Workshop"],
  ["FAIR", "Fair"],
  ["EXHIBITION", "Exhibition"],
  ["CLASS", "Class"],
  ["POPUP", "Pop-up"],
  ["OTHER", "Other"],
] as const;

export function EventForm({ cities, categories, ownedListings, entityId, initialValues }: Props) {
  const router = useRouter();
  const isEdit = Boolean(entityId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);

  const firstOrganizer = ownedListings[0];

  const [form, setForm] = useState<EventFormValues>({
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    cover_image: initialValues?.cover_image ?? "",
    cover_image_blurhash: initialValues?.cover_image_blurhash ?? "",
    organizer: initialValues?.organizer ?? (firstOrganizer ? `${firstOrganizer.kind}:${firstOrganizer.id}` : ""),
    start_at: initialValues?.start_at ?? "",
    end_at: initialValues?.end_at ?? "",
    city_id: initialValues?.city_id ?? cities[0]?.id ?? "",
    venue_name: initialValues?.venue_name ?? "",
    venue_address: initialValues?.venue_address ?? "",
    is_online: initialValues?.is_online ?? false,
    event_type: initialValues?.event_type ?? "WORKSHOP",
    craft_category_id: initialValues?.craft_category_id ?? "",
    is_free: initialValues?.is_free ?? true,
    price_amount: initialValues?.price_amount ?? "",
    registration_url: initialValues?.registration_url ?? "",
    recurrence_rule: initialValues?.recurrence_rule ?? "",
  });

  // Local UI state for the Repeats? section. The persisted rule is built from
  // these on every change.
  const initialRrule = parseInitialRrule(initialValues?.recurrence_rule);
  const [repeats, setRepeats] = useState<boolean>(!!initialValues?.recurrence_rule);
  const [freq, setFreq] = useState<Freq>(initialRrule.freq);
  const [byday, setByday] = useState<Weekday[]>(initialRrule.byday);
  const [count, setCount] = useState<number>(initialRrule.count);

  const recurrencePreview = useMemo(() => {
    if (!repeats || !form.start_at) return [] as string[];
    const rrule = buildRrule(freq, byday, count);
    return previewOccurrences(rrule, new Date(form.start_at), 5);
  }, [repeats, freq, byday, count, form.start_at]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const draft = useFormDraft(isEdit ? `event:edit:${entityId}` : "event:new", form, { skip: isEdit });

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?folder=event-covers", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "upload_failed");
      }
      const j = (await res.json()) as { medium: string; blurhash: string };
      set("cover_image", j.medium);
      set("cover_image_blurhash", j.blurhash ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCoverBusy(false);
    }
  }

  const valid =
    form.name.trim().length >= 3 &&
    form.description.trim().length >= 20 &&
    form.cover_image &&
    form.organizer &&
    form.start_at &&
    form.end_at &&
    new Date(form.end_at) > new Date(form.start_at) &&
    form.city_id &&
    form.venue_name.trim().length > 0 &&
    form.event_type &&
    form.registration_url &&
    (form.is_free || Number(form.price_amount) > 0);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const [orgKind, orgId] = form.organizer.split(":") as [
        "CRAFTER" | "STORE" | "STUDIO",
        string,
      ];
      const payload = {
        name: form.name,
        description: form.description,
        cover_image: form.cover_image,
        organizer_kind: orgKind,
        organizer_id: orgId,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        city_id: form.city_id,
        venue_name: form.venue_name,
        venue_address: form.venue_address || null,
        is_online: form.is_online,
        event_type: form.event_type,
        craft_category_id: form.craft_category_id || null,
        is_free: form.is_free,
        price_amount: form.is_free ? null : Number(form.price_amount),
        registration_url: form.registration_url,
        recurrence_rule: repeats ? buildRrule(freq, byday, count) : null,
      };
      // In edit mode the PATCH route doesn't accept organizer changes (the
      // 3-FK CHECK is set at creation). Strip those fields if editing.
      const patchPayload = isEdit
        ? { ...payload, organizer_kind: undefined, organizer_id: undefined }
        : payload;
      const res = await fetch(isEdit ? `/api/events/${entityId}` : "/api/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? (isEdit ? "update_failed" : "create_failed"));
      }
      const j = (await res.json()) as { slug: string; city: string };
      if (!isEdit) {
        track("profile_completed", { entity_type: "EVENT", slug: j.slug, city: j.city });
      }
      draft.clear();
      router.push(`/${j.city}/events/${j.slug}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (ownedListings.length === 0) {
    return (
      <div className="card mx-auto max-w-2xl p-6">
        <h2 className="font-semibold">You need a crafter, store, or studio listing first.</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Events must be organized by an existing listing (PRD §7.6). Create one of those first,
          then come back to host your event.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn btn-primary btn-sm" href="/dashboard/crafter/new">Create crafter profile</a>
          <a className="btn btn-ghost btn-sm" href="/dashboard/store/new">List a store</a>
          <a className="btn btn-ghost btn-sm" href="/dashboard/studio/new">List a studio</a>
        </div>
      </div>
    );
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

      <Field label="Organizer *" hint="Which of your listings is hosting this?">
        <select className="input" value={form.organizer} onChange={(e) => set("organizer", e.target.value)}>
          {ownedListings.map((o) => (
            <option key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>
              {o.name} ({o.kind.toLowerCase()})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Event name *" htmlFor="event-name">
        <input
          id="event-name"
          className="input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Sunday Cubbon Crochet Meetup"
          maxLength={100}
        />
      </Field>

      <Field label="Description *" htmlFor="event-desc" hint="20+ characters">
        <textarea
          id="event-desc"
          className="input min-h-[120px]"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What is the event, who is it for, what to expect…"
          maxLength={2000}
        />
      </Field>

      <Field label="Cover image *" htmlFor="event-cover">
        <label
          htmlFor="event-cover"
          className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-canvas-raised p-4 hover:border-ink"
        >
          {coverBusy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          <span className="text-sm text-ink-muted">{coverBusy ? "Uploading…" : "Click to upload (≤5MB, 16:9 looks best)"}</span>
          <input
            id="event-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onCover}
            disabled={coverBusy}
          />
        </label>
        {form.cover_image && (
          <Image
            src={form.cover_image}
            alt="Cover preview"
            width={320}
            height={180}
            className="mt-3 h-auto w-full max-w-xs rounded-md object-cover"
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts *" htmlFor="event-start">
          <input
            id="event-start"
            type="datetime-local"
            className="input"
            value={form.start_at}
            onChange={(e) => set("start_at", e.target.value)}
          />
        </Field>
        <Field label="Ends *" htmlFor="event-end">
          <input
            id="event-end"
            type="datetime-local"
            className="input"
            value={form.end_at}
            onChange={(e) => set("end_at", e.target.value)}
          />
        </Field>
      </div>

      <Field label="City *" htmlFor="event-city">
        <select id="event-city" className="input" value={form.city_id} onChange={(e) => set("city_id", e.target.value)}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      </Field>

      <Field label="Venue *" htmlFor="event-venue">
        <input
          id="event-venue"
          className="input"
          value={form.venue_name}
          onChange={(e) => set("venue_name", e.target.value)}
          placeholder="Cubbon Park / Studio name / Zoom"
          maxLength={120}
        />
      </Field>

      <Field label="Venue address" htmlFor="event-venue-addr" hint="Optional. Skip if online.">
        <input
          id="event-venue-addr"
          className="input"
          value={form.venue_address}
          onChange={(e) => set("venue_address", e.target.value)}
          placeholder="Cubbon Park, near band stand"
          maxLength={200}
        />
      </Field>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.is_online} onChange={(e) => set("is_online", e.target.checked)} />
        <span className="text-sm">Online event</span>
      </label>

      <Field label="Type *">
        <select className="input" value={form.event_type} onChange={(e) => set("event_type", e.target.value as any)}>
          {EVENT_TYPES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>

      <Field label="Craft category" hint="Optional. Helps filtering.">
        <select className="input" value={form.craft_category_id} onChange={(e) => set("craft_category_id", e.target.value)}>
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.is_free} onChange={(e) => set("is_free", e.target.checked)} />
        <span className="text-sm">Free entry</span>
      </label>

      {!form.is_free && (
        <Field label="Price (INR) *" htmlFor="event-price">
          <input
            id="event-price"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            className="input"
            value={form.price_amount}
            onChange={(e) => set("price_amount", e.target.value)}
            placeholder="500"
          />
        </Field>
      )}

      <div className="rounded-md border border-line bg-canvas-raised p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={repeats}
            onChange={(e) => setRepeats(e.target.checked)}
          />
          <span className="text-sm font-semibold text-ink">Repeats?</span>
        </label>
        {repeats && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="rep-freq">Frequency</label>
              <select
                id="rep-freq"
                className="input"
                value={freq}
                onChange={(e) => setFreq(e.target.value as Freq)}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            {freq === "WEEKLY" && (
              <div>
                <p className="label">On these days</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const active = byday.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() =>
                          setByday((bd) => active ? bd.filter((x) => x !== d) : [...bd, d])
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-magenta bg-magenta/10 text-magenta"
                            : "border-line bg-canvas text-ink-muted hover:border-ink"
                        }`}
                        aria-pressed={active}
                      >
                        {WEEKDAY_LABEL[d]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-ink-subtle">
                  Leave empty to use the start date&apos;s weekday.
                </p>
              </div>
            )}

            <div>
              <label className="label" htmlFor="rep-count">How many occurrences</label>
              <input
                id="rep-count"
                type="number"
                min={1}
                max={52}
                className="input"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(52, parseInt(e.target.value, 10) || 1)))}
              />
            </div>

            {recurrencePreview.length > 0 && (
              <div className="rounded-md bg-canvas-sunken px-3 py-2 text-xs text-ink-muted">
                <p className="font-semibold text-ink">Next {recurrencePreview.length} dates:</p>
                <p className="mt-1">
                  {recurrencePreview.map((iso) =>
                    new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                  ).join(" · ")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Field label="Registration URL *" htmlFor="event-reg" hint="Where do attendees sign up?">
        <input
          id="event-reg"
          type="url"
          className="input"
          value={form.registration_url}
          onChange={(e) => set("registration_url", e.target.value)}
          placeholder="https://example.com/register"
          maxLength={500}
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={submit}
          disabled={!valid || submitting}
        >
          {submitting ? (isEdit ? "Saving…" : "Publishing…") : isEdit ? "Save changes" : "Publish event"}
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
