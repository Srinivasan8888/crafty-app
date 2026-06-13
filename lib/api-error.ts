// Turn an /api error JSON response into a human-readable message. For Zod
// validation failures (j.details from .flatten()) it lists the field-level
// messages so users see WHICH field is wrong, instead of the opaque "validation".

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  tagline: "Tagline",
  bio: "Bio",
  city_id: "City",
  profile_photo: "Profile photo",
  logo_photo: "Logo",
  cover_image: "Cover image",
  portfolio_photos: "Portfolio photos",
  photos: "Photos",
  contact_whatsapp: "WhatsApp number",
  contact_phone: "Phone number",
  contact_instagram: "Instagram",
  contact_website: "Website",
  category_ids: "Categories",
  discipline_ids: "Disciplines",
  supply_category_ids: "Supply categories",
  registration_url: "Registration link",
  start_at: "Start time",
  end_at: "End time",
  venue_name: "Venue",
  price_amount: "Price",
  address: "Address",
  claimant_phone: "Phone number",
  shipping_phone: "Phone number",
};

const CODE_MESSAGES: Record<string, string> = {
  forbidden_origin: "Your session looks stale. Refresh the page and try again.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
  not_a_creator: "Your account can't create listings yet.",
  unauthenticated: "Please sign in and try again.",
  FILE_TOO_LARGE: "That file is too large (5MB max).",
  invalid_form: "Something was off with the submission. Try again.",
  cap_reached: "You've reached the limit for this listing type.",
  already_exists: "You already have a listing of this type.",
  already_claimed: "This listing is already claimed.",
  already_responded: "You've already replied to this review.",
  forbidden_not_owner: "You can only do that on your own listing.",
  not_found: "That item could not be found.",
  entity_not_found: "That listing could not be found.",
};

function label(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

export function apiErrorMessage(j: unknown, fallback = "Something went wrong. Please try again."): string {
  if (j && typeof j === "object") {
    const o = j as { error?: string; message?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } };
    if ((o.error === "validation" || o.error === "invalid") && o.details) {
      const fe = o.details.fieldErrors ?? {};
      const fieldMsgs = Object.entries(fe).flatMap(([f, errs]) =>
        (Array.isArray(errs) ? errs : []).slice(0, 1).map((m) => `${label(f)}: ${String(m).toLowerCase()}`),
      );
      const formMsgs = Array.isArray(o.details.formErrors) ? o.details.formErrors : [];
      const all = [...formMsgs, ...fieldMsgs];
      if (all.length) return all.join(". ");
      return "Please check the highlighted fields.";
    }
    if (typeof o.error === "string" && CODE_MESSAGES[o.error]) return CODE_MESSAGES[o.error];
    if (typeof o.message === "string" && o.message) return o.message;
  }
  return fallback;
}
