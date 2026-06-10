// V3 Tier 3 — Tiny RFC 5545 RRULE parser for Crafty's recurring events.
//
// Constrained subset (anything else is rejected at validate time):
//   FREQ=DAILY | WEEKLY | MONTHLY
//   BYDAY=SU,MO,TU,WE,TH,FR,SA (comma list — only valid with WEEKLY)
//   COUNT=1..52
//   UNTIL=YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ
//
// We intentionally skip rrule.js — Crafty's needs are small enough that a
// hand-rolled expander stays under 100 lines and brings in zero deps.

export type Freq = "DAILY" | "WEEKLY" | "MONTHLY";
export type Weekday = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

export type ParsedRrule = {
  freq: Freq;
  byday: Weekday[] | null;  // null = derive from anchor day-of-week
  count: number | null;     // null when only UNTIL is set
  until: Date | null;
};

const WEEKDAYS: Record<Weekday, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

const FREQS: ReadonlySet<Freq> = new Set(["DAILY", "WEEKLY", "MONTHLY"]);

export function parseRrule(input: string): ParsedRrule {
  const out: ParsedRrule = { freq: "WEEKLY", byday: null, count: null, until: null };
  let sawFreq = false;
  const parts = input.split(";").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const [rawKey, rawVal] = part.split("=");
    if (!rawKey || rawVal === undefined) throw new Error(`bad_rrule_token: ${part}`);
    const key = rawKey.toUpperCase();
    const val = rawVal.toUpperCase();
    switch (key) {
      case "FREQ":
        if (!FREQS.has(val as Freq)) throw new Error("bad_freq");
        out.freq = val as Freq;
        sawFreq = true;
        break;
      case "BYDAY": {
        const days = val.split(",").map((d) => d.trim()) as Weekday[];
        for (const d of days) if (!(d in WEEKDAYS)) throw new Error("bad_byday");
        out.byday = days;
        break;
      }
      case "COUNT": {
        const n = parseInt(val, 10);
        if (!Number.isFinite(n) || n < 1 || n > 52) throw new Error("bad_count");
        out.count = n;
        break;
      }
      case "UNTIL": {
        // Accept either YYYYMMDD, YYYYMMDDTHHMMSSZ, or ISO 8601.
        const compact = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
        let d: Date;
        if (compact) {
          const [, y, m, da, hh, mm, ss] = compact;
          d = new Date(Date.UTC(+y, +m - 1, +da, +(hh ?? "0"), +(mm ?? "0"), +(ss ?? "0")));
        } else {
          d = new Date(val);
        }
        if (Number.isNaN(d.getTime())) throw new Error("bad_until");
        out.until = d;
        break;
      }
      default:
        throw new Error(`unsupported_token: ${key}`);
    }
  }
  if (!sawFreq) throw new Error("missing_freq");
  if (out.byday && out.freq !== "WEEKLY") throw new Error("byday_only_weekly");
  if (out.count === null && out.until === null) {
    // Cap to 12 occurrences when neither specified, to avoid runaway expansion.
    out.count = 12;
  }
  return out;
}

/**
 * Expand a parsed rule to its concrete UTC dates, starting from `dtstart`.
 * Returns the dates IN ORDER, capped at `count` and not exceeding `until`.
 * The first occurrence is always `dtstart` itself.
 */
export function expandRrule(rule: ParsedRrule, dtstart: Date, maxOccurrences = 100): Date[] {
  const out: Date[] = [];
  const cap = Math.min(rule.count ?? maxOccurrences, maxOccurrences);
  const untilMs = rule.until ? rule.until.getTime() : Infinity;

  if (rule.freq === "DAILY") {
    for (let i = 0; i < cap; i++) {
      const d = new Date(dtstart.getTime() + i * 86400000);
      if (d.getTime() > untilMs) break;
      out.push(d);
    }
    return out;
  }

  if (rule.freq === "WEEKLY") {
    // BYDAY list — if not specified, use dtstart's weekday only.
    const days: number[] = rule.byday
      ? rule.byday.map((d) => WEEKDAYS[d])
      : [dtstart.getUTCDay()];
    days.sort((a, b) => a - b);
    // Walk week by week, picking matching weekdays.
    let weekStart = startOfWeekUTC(dtstart); // Sunday boundary
    while (out.length < cap) {
      for (const dow of days) {
        const candidate = new Date(weekStart.getTime() + dow * 86400000);
        // Preserve dtstart's time-of-day exactly.
        candidate.setUTCHours(dtstart.getUTCHours(), dtstart.getUTCMinutes(), dtstart.getUTCSeconds(), 0);
        if (candidate.getTime() < dtstart.getTime()) continue;
        if (candidate.getTime() > untilMs) return out;
        out.push(candidate);
        if (out.length >= cap) return out;
      }
      weekStart = new Date(weekStart.getTime() + 7 * 86400000);
      if (weekStart.getTime() > untilMs && out.length === 0) break;
      if (out.length >= cap) break;
    }
    return out;
  }

  // MONTHLY: keep day-of-month same as dtstart. If a month is shorter
  // (e.g. Feb 30), clamp to the last day of that month.
  for (let i = 0; i < cap; i++) {
    const y = dtstart.getUTCFullYear();
    const m = dtstart.getUTCMonth() + i;
    const targetYear = y + Math.floor(m / 12);
    const targetMonth = ((m % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const day = Math.min(dtstart.getUTCDate(), lastDay);
    const d = new Date(Date.UTC(
      targetYear, targetMonth, day,
      dtstart.getUTCHours(), dtstart.getUTCMinutes(), dtstart.getUTCSeconds(),
    ));
    if (d.getTime() > untilMs) break;
    out.push(d);
  }
  return out;
}

function startOfWeekUTC(d: Date): Date {
  const dow = d.getUTCDay();
  const start = new Date(d.getTime() - dow * 86400000);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** Throws on invalid input. Validation entry-point for API routes. */
export function validateRrule(input: string): ParsedRrule {
  if (input.length > 200) throw new Error("rrule_too_long");
  return parseRrule(input);
}

/**
 * Convenience for forms — return upcoming dates as ISO strings (UTC).
 * Used by the EventForm preview "next 5 dates" hint.
 */
export function previewOccurrences(rruleString: string, dtstart: Date, n = 5): string[] {
  try {
    const r = parseRrule(rruleString);
    return expandRrule(r, dtstart, n).map((d) => d.toISOString());
  } catch {
    return [];
  }
}
