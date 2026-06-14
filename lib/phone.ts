import { z } from "zod";

// Shared client/server phone rule. Optional leading +, then digits with common
// separators (space, dash, dot, parens), and at least 7 real digits. Exported so
// client gates (CheckoutButton, StoreForm, StudioForm) match the server exactly —
// e.g. "(080) 2345678" leads with "(", so it correctly fails both sides.
export function looksLikePhone(value: string): boolean {
  const s = value.trim();
  return /^\+?[\d][\d\s().-]*$/.test(s) && s.replace(/\D/g, "").length >= 7;
}

// Lenient international phone validator. Optional leading +, then digits with
// common separators (space, dash, dot, parens). Requires at least 7 real digits
// so junk like "kkkkkk" is rejected while "+91 98865 44321" passes.
export const phoneNumber = z
  .string()
  .trim()
  .max(40)
  .refine(looksLikePhone, { message: "enter a valid phone number" });
