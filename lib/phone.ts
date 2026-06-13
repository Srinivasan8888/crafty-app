import { z } from "zod";

// Lenient international phone validator. Optional leading +, then digits with
// common separators (space, dash, dot, parens). Requires at least 7 real digits
// so junk like "kkkkkk" is rejected while "+91 98865 44321" passes.
export const phoneNumber = z
  .string()
  .trim()
  .max(40)
  .refine(
    (s) => /^\+?[\d][\d\s().-]*$/.test(s) && s.replace(/\D/g, "").length >= 7,
    { message: "enter a valid phone number" },
  );
