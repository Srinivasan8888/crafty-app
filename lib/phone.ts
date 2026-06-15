import { z } from "zod";

// Restricts raw input to the character set that can form a valid phone number,
// mirroring the allowed characters of the server's looksLikePhone rule (digits,
// optional leading "+", and the separators [ space . - ( ) ]). Disallowed
// characters (letters, emoji, etc.) are stripped so they can never enter a field.
// A "+" is only valid as the very first character, so any later "+" is removed.
// Spacing within the allowed set is preserved exactly as the user typed it.
export function sanitizePhoneInput(value: string): string {
  // Keep only digits, "+", "(", ")", "-", ".", and whitespace; drop everything else.
  const filtered = value.replace(/[^\d+()\-.\s]/g, "");
  // Allow "+" only at the very start: keep a leading "+" (if present) and strip the rest.
  const head = filtered.startsWith("+") ? "+" : "";
  return head + filtered.slice(head.length).replace(/\+/g, "");
}

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
