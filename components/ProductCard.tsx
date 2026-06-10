// V3 — Product card. Server-rendered, matches the rounded-lg + hover-translate
// shape of CrafterCard et al. Uses next/image via SafeImage so missing photos
// render the branded "no photo yet" fallback.

import { SafeImage } from "@/components/SafeImage";
import { formatINR } from "@/lib/util";
import { AddToCartButton } from "@/components/AddToCartButton";

const CARD_SIZES = "(max-width:768px) 50vw, 25vw";

export type ProductCardProps = {
  id: string;
  name: string;
  price_inr: number;
  photo: string | null;
  photo_blurhash?: string | null;
  inventory: number;
  ownerIsViewer?: boolean;
};

export function ProductCard({
  id, name, price_inr, photo, photo_blurhash, inventory, ownerIsViewer,
}: ProductCardProps) {
  const outOfStock = inventory === 0;
  return (
    <div className="card block">
      <div className="img relative aspect-square">
        <SafeImage
          src={photo}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          {...(photo_blurhash
            ? { placeholder: "blur" as const, blurDataURL: photo_blurhash }
            : {})}
        />
        {inventory === -1 && (
          <div className="badge-row">
            <span className="badge classes">Made to order</span>
          </div>
        )}
        {outOfStock && (
          <div className="badge-row">
            <span className="badge claim">Out of stock</span>
          </div>
        )}
      </div>
      <div className="body">
        <div className="title">{name}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink">{formatINR(price_inr)}</span>
          {ownerIsViewer ? (
            <span className="text-xs text-ink-subtle">Your product</span>
          ) : outOfStock ? (
            <span className="text-xs text-ink-subtle">Unavailable</span>
          ) : (
            <AddToCartButton productId={id} compact />
          )}
        </div>
      </div>
    </div>
  );
}
