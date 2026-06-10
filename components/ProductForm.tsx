"use client";

// V3 — Single-page product form. Used for both create and edit.
//
// Fields: name, description, price, inventory (-1 = made-to-order),
// photos (1–6), parent listing (which of the seller's listings owns this).
// Reuses the same /api/upload?folder=product-photos flow as CrafterForm.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";

export type OwnedListing = {
  id: string;
  name: string;
  kind: "CRAFTER" | "STORE" | "STUDIO";
};

export type ProductFormValues = {
  name: string;
  description: string;
  price_inr: number;
  inventory: number; // -1 = made-to-order
  photos: string[];
  photo_blurhashes: string[];
  parent_listing: { kind: "CRAFTER" | "STORE" | "STUDIO"; id: string } | null;
};

type Props = {
  ownedListings: OwnedListing[];
  /** If set, the form runs in EDIT mode and submits PATCH /api/products/[id]. */
  entityId?: string;
  initialValues?: Partial<ProductFormValues>;
};

export function ProductForm({ ownedListings, entityId, initialValues }: Props) {
  const router = useRouter();
  const isEdit = Boolean(entityId);

  const [form, setForm] = useState<ProductFormValues>({
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    price_inr: initialValues?.price_inr ?? 0,
    inventory: initialValues?.inventory ?? -1,
    photos: initialValues?.photos ?? [],
    photo_blurhashes: initialValues?.photo_blurhashes ?? [],
    parent_listing:
      initialValues?.parent_listing ??
      (ownedListings[0] ? { kind: ownedListings[0].kind, id: ownedListings[0].id } : null),
  });

  const [photosBusy, setPhotosBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  async function uploadPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 6 - form.photos.length;
    if (remaining <= 0) return;
    setPhotosBusy(true);
    try {
      const results = await Promise.all(
        files.slice(0, remaining).map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(`/api/upload?folder=product-photos`, { method: "POST", body: fd });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error ?? "upload_failed");
          }
          const j = (await res.json()) as { full: string; medium: string; thumb: string; blurhash: string };
          return { url: j.medium, blurhash: j.blurhash ?? "" };
        })
      );
      set("photos", [...form.photos, ...results.map((r) => r.url)]);
      set("photo_blurhashes", [...form.photo_blurhashes, ...results.map((r) => r.blurhash)]);
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setPhotosBusy(false);
    }
  }

  function removePhoto(i: number) {
    set("photos", form.photos.filter((_, idx) => idx !== i));
    set("photo_blurhashes", form.photo_blurhashes.filter((_, idx) => idx !== i));
  }

  const valid =
    form.name.trim().length >= 3 &&
    form.price_inr > 0 &&
    form.photos.length >= 1 &&
    form.parent_listing !== null;

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        description: form.description || null,
        price_inr: form.price_inr,
        inventory: form.inventory,
        photos: form.photos,
        photo_blurhashes: form.photo_blurhashes,
        // parent_listing is fixed on create; we omit it on edit.
        ...(isEdit ? {} : { parent_listing: form.parent_listing }),
      };
      const res = await fetch(isEdit ? `/api/products/${entityId}` : "/api/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? (isEdit ? "update_failed" : "create_failed"));
      }
      router.push("/dashboard/products");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (ownedListings.length === 0 && !isEdit) {
    return (
      <div className="card p-6">
        <p className="text-ink-muted">
          You need an active crafter, store, or studio listing before adding products.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {error && (
        <div role="alert" className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!isEdit && (
        <div>
          <label className="label" htmlFor="parent">Sell as *</label>
          <select
            id="parent"
            className="input"
            value={form.parent_listing ? `${form.parent_listing.kind}:${form.parent_listing.id}` : ""}
            onChange={(e) => {
              const [kind, id] = e.target.value.split(":") as ["CRAFTER" | "STORE" | "STUDIO", string];
              set("parent_listing", { kind, id });
            }}
          >
            {ownedListings.map((l) => (
              <option key={`${l.kind}:${l.id}`} value={`${l.kind}:${l.id}`}>
                {l.name} ({l.kind.toLowerCase()})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="pname">Product name *</label>
        <input
          id="pname"
          className="input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Hand-crocheted heirloom shawl"
          maxLength={80}
        />
      </div>

      <div>
        <label className="label" htmlFor="pdesc">Description</label>
        <textarea
          id="pdesc"
          className="input min-h-[120px]"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Materials, dimensions, care instructions, lead time…"
          maxLength={4000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pprice">Price (₹) *</label>
          <input
            id="pprice"
            type="number"
            inputMode="numeric"
            min={1}
            className="input"
            value={form.price_inr || ""}
            onChange={(e) => set("price_inr", Math.max(0, Number(e.target.value) | 0))}
            placeholder="1499"
          />
        </div>
        <div>
          <label className="label" htmlFor="pinv">Inventory</label>
          <label className="flex items-center gap-2 py-2" htmlFor="pmto">
            <input
              id="pmto"
              type="checkbox"
              checked={form.inventory === -1}
              onChange={(e) => set("inventory", e.target.checked ? -1 : 1)}
            />
            <span className="text-sm">Made to order</span>
          </label>
          {form.inventory !== -1 && (
            <input
              id="pinv"
              type="number"
              inputMode="numeric"
              min={0}
              className="input"
              value={form.inventory}
              onChange={(e) => set("inventory", Math.max(0, Number(e.target.value) | 0))}
            />
          )}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="pphotos">Photos * <span className="text-ink-subtle">(1–6)</span></label>
        <label
          htmlFor="pphotos"
          className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-canvas-raised p-4 hover:border-ink"
        >
          {photosBusy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          <span className="text-sm text-ink-muted">
            {photosBusy ? "Uploading…" : "Click to add images (≤5MB each)"}
          </span>
          <input
            id="pphotos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            multiple
            disabled={photosBusy || form.photos.length >= 6}
            onChange={uploadPhotos}
          />
        </label>
        {form.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {form.photos.map((u, i) => (
              <div key={u} className="relative h-24 w-full">
                <Image src={u} alt={`Product photo ${i + 1}`} fill sizes="160px" className="rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-canvas/90 p-0.5 text-ink-muted hover:text-danger"
                  aria-label="Remove photo"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={!valid || submitting}
        >
          {submitting
            ? (isEdit ? "Saving…" : "Publishing…")
            : (isEdit ? "Save changes" : "Publish product")}
        </button>
      </div>
    </div>
  );
}
