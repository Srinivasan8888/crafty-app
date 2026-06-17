// Date-window helpers for the events "when" filter (today / weekend / next7 /
// month), computed in IST. Extracted from app/[city]/events/page.tsx so the
// windowing logic is unit-testable.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function whenWindow(
  when: string,
  now: Date,
): { start: Date; end: Date } | null {
  // Wall-clock "now" in IST, expressed as a Date whose UTC fields read as IST.
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  // Convert an IST wall-clock Date (UTC fields = IST) back to a real instant.
  const toReal = (d: Date) => new Date(d.getTime() - IST_OFFSET_MS);
  const istMidnight = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

  switch (when) {
    case "today": {
      const startIst = istMidnight(ist);
      const endIst = new Date(startIst.getTime() + 24 * 60 * 60 * 1000);
      return { start: toReal(startIst), end: toReal(endIst) };
    }
    case "weekend": {
      // Sat 00:00 .. Mon 00:00 (Sun 23:59) in IST. Current weekend on Sat/Sun,
      // upcoming weekend Mon–Fri. On Sunday the weekend's Saturday is YESTERDAY
      // (-1); the lowerEnd = max(now, start) clamp at the call site keeps
      // past-Saturday events out, so Sunday's own events still show instead of
      // skipping to next week.
      const day = ist.getUTCDay(); // 0=Sun..6=Sat
      const offsetToSat = day === 0 ? -1 : (6 - day + 7) % 7;
      const satIst = new Date(
        istMidnight(ist).getTime() + offsetToSat * 24 * 60 * 60 * 1000,
      );
      const monIst = new Date(satIst.getTime() + 2 * 24 * 60 * 60 * 1000);
      return { start: toReal(satIst), end: toReal(monIst) };
    }
    case "next7": {
      return { start: now, end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
    }
    case "month": {
      const endIst = new Date(
        Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1),
      );
      return { start: now, end: toReal(endIst) };
    }
    default:
      return null;
  }
}
