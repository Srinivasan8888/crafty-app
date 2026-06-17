import { describe, it, expect } from "vitest";
import { whenWindow } from "@/lib/event-windows";

// 06:30 UTC == 12:00 IST on the given date.
const noonIst = (isoDate: string) => new Date(`${isoDate}T06:30:00.000Z`);

describe("whenWindow — weekend", () => {
  it("on Sunday, covers the CURRENT weekend so Sunday's own events show", () => {
    // Regression: the old formula jumped to next Saturday on Sundays, hiding
    // that same Sunday's events. 2026-06-14 is a Sunday in IST.
    const now = noonIst("2026-06-14");
    const w = whenWindow("weekend", now)!;
    expect(w).not.toBeNull();
    // This weekend's Saturday is yesterday → window starts before now...
    expect(w.start.getTime()).toBeLessThan(now.getTime());
    // ...and still covers now (Sunday), not skipped to next week.
    expect(now.getTime()).toBeLessThan(w.end.getTime());
  });

  it("on Saturday, the window starts that same day", () => {
    const now = noonIst("2026-06-20"); // Saturday IST
    const w = whenWindow("weekend", now)!;
    expect(w.start.getTime()).toBeLessThan(now.getTime());
    expect(now.getTime() - w.start.getTime()).toBeLessThan(13 * 60 * 60 * 1000);
  });

  it("on a weekday, points to the UPCOMING weekend", () => {
    const now = noonIst("2026-06-17"); // Wednesday IST
    const w = whenWindow("weekend", now)!;
    expect(w.start.getTime()).toBeGreaterThan(now.getTime());
  });

  it("returns null for an unknown bucket", () => {
    expect(whenWindow("all", noonIst("2026-06-17"))).toBeNull();
  });
});
