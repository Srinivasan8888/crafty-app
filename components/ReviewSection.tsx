// V2.0 / V3 — review widget rendered server-side at the bottom of entity
// detail pages. Lists existing reviews + an inline write/edit form for the
// current user (if signed in and not the owner).
//
// V3 Tier 2 additions:
//   - Photo strip below each review body.
//   - "Verified purchase" pill when verified_purchase_order_id is set.
//   - Owner-side response thread (Respond form + nested reply card).
//   - Hidden responses are dropped server-side from the public view.

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Star, Sparkles } from "lucide-react";
import { ReviewForm } from "./ReviewForm";
import { CreatorResponseForm } from "./CreatorResponseForm";

type Props = {
  entityType: "CRAFTER" | "STORE" | "STUDIO";
  entityId: string;
  ownerUserId: string;
};

export async function ReviewSection({ entityType, entityId, ownerUserId }: Props) {
  const [reviews, viewer] = await Promise.all([
    prisma.review.findMany({
      where: { entity_type: entityType, entity_id: entityId, hidden: false },
      orderBy: { created_at: "desc" },
      take: 20,
      include: { author: { select: { id: true, display_name: true, email: true } } },
    }),
    getCurrentUser(),
  ]);

  const avg = reviews.length === 0 ? null
    : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const myReview = viewer
    ? reviews.find((r) => r.author_user_id === viewer.id) ?? null
    : null;
  const canReview = !!viewer && viewer.id !== ownerUserId;
  const viewerIsOwner = !!viewer && viewer.id === ownerUserId;
  const viewerIsAdmin = viewer?.role === "ADMIN";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8" aria-labelledby="reviews-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="reviews-heading" className="font-display text-2xl text-ink">Reviews</h2>
        {avg !== null && (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Stars value={avg} />
            <span>{avg.toFixed(1)} from {reviews.length}</span>
          </div>
        )}
      </div>

      {canReview && (
        <div className="mt-5">
          <ReviewForm
            entityType={entityType}
            entityId={entityId}
            initialRating={myReview?.rating ?? 0}
            initialBody={myReview?.body ?? ""}
            initialPhotos={myReview?.photos ?? []}
            initialPhotoBlurhashes={myReview?.photo_blurhashes ?? []}
            existingId={myReview?.id ?? null}
          />
        </div>
      )}

      <ul className="mt-6 grid gap-3">
        {reviews.map((r) => {
          const isVerified = !!r.verified_purchase_order_id;
          const showResponse =
            r.creator_response &&
            (viewerIsAdmin || !r.creator_response_hidden);
          return (
            <li key={r.id} className="card p-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="font-semibold text-ink">{r.author.display_name ?? r.author.email}</p>
                <Stars value={r.rating} />
                {isVerified && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-canvas-sunken px-2 py-0.5 text-[11px] font-semibold text-forest"
                    title="This reviewer bought from this listing on Crafty"
                  >
                    <Sparkles size={11} aria-hidden /> Verified purchase
                  </span>
                )}
                <p className="ml-auto text-xs text-ink-subtle">
                  {r.created_at.toISOString().slice(0, 10)}
                </p>
              </div>
              {r.body && <p className="mt-2 text-sm text-ink-muted whitespace-pre-wrap">{r.body}</p>}

              {r.photos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {r.photos.map((u, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <a
                      key={u + i}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 overflow-hidden rounded-md border border-line bg-canvas-sunken"
                      aria-label={`Photo ${i + 1} from this review`}
                    >
                      {/* Plain <img> so existing /uploads/... served files work
                          without next/image domain config. */}
                      <img
                        src={u}
                        alt={`Photo ${i + 1} from review by ${r.author.display_name ?? r.author.email}`}
                        className="h-20 w-20 object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* Owner inline Respond form — only when viewer owns the listing AND no response yet */}
              {viewerIsOwner && !r.creator_response && (
                <div className="mt-3 border-t border-line pt-3">
                  <CreatorResponseForm reviewId={r.id} />
                </div>
              )}

              {/* Existing response — render as nested card */}
              {showResponse && (
                <div className="mt-3 ml-4 rounded-md border-l-2 border-forest/40 bg-canvas-sunken/40 p-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-xs font-semibold uppercase tracking-wider text-forest">
                      Response from the owner
                    </p>
                    {r.creator_response_hidden && (
                      <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-semibold text-danger">
                        Hidden (admin only)
                      </span>
                    )}
                    {r.creator_response_at && (
                      <p className="ml-auto text-xs text-ink-subtle">
                        {r.creator_response_at.toISOString().slice(0, 10)}
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink whitespace-pre-wrap">{r.creator_response}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {reviews.length === 0 && !canReview && (
        <p className="mt-4 text-sm text-ink-muted">No reviews yet.</p>
      )}
    </section>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          fill={n <= full ? "rgb(var(--mustard))" : "none"}
          stroke="rgb(var(--mustard))"
        />
      ))}
    </span>
  );
}
