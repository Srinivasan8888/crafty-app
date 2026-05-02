"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const DATE_FILTERS: Array<{ id: string; label: string }> = [
  { id: "today", label: "Today" },
  { id: "weekend", label: "This weekend" },
  { id: "next7", label: "Next 7 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All upcoming" },
];

export function EventsDateFilter({ active = "all" }: { active?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pick(id: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (id === "all") sp.delete("when");
    else sp.set("when", id);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="pillrow no-scrollbar">
      {DATE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`pill${active === f.id ? " active" : ""}`}
          onClick={() => pick(f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export default EventsDateFilter;
