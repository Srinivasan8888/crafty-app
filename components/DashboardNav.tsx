"use client";

// Dashboard sidebar nav. Client component so it can highlight the active route
// via usePathname(). The unread-messages badge count is computed on the server
// and passed in.

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: Array<[label: string, href: string]> = [
  ["Overview", "/dashboard"],
  ["My crafter", "/dashboard/crafter"],
  ["My store", "/dashboard/store"],
  ["My studio", "/dashboard/studio"],
  ["My events", "/dashboard/events"],
  ["Saved", "/dashboard/saved"],
  ["Saved searches", "/dashboard/saved-searches"],
  ["Products", "/dashboard/products"],
  ["Cart", "/dashboard/cart"],
  ["Orders", "/dashboard/orders"],
  ["Sales", "/dashboard/sales"],
  ["Messages", "/dashboard/messages"],
  ["Crafty Pro", "/dashboard/subscription"],
  ["API keys", "/dashboard/api-keys"],
];

export function DashboardNav({
  unreadMessages,
  isAdmin,
}: {
  unreadMessages: number;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  // Overview is exact-match only; everything else matches the section + children.
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="mt-3 grid gap-1 text-sm">
      {ITEMS.map(([label, href]) => {
        const active = isActive(href);
        const showBadge = href === "/dashboard/messages" && unreadMessages > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-canvas-sunken ${
              active ? "bg-canvas-sunken font-semibold text-ink" : ""
            }`}
          >
            <span>{label}</span>
            {showBadge && (
              <span
                className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-fg"
                aria-label={`${unreadMessages} unread ${unreadMessages === 1 ? "conversation" : "conversations"}`}
              >
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className="mt-3 rounded-md px-3 py-2 text-accent hover:bg-canvas-sunken"
        >
          Admin &rarr;
        </Link>
      )}
    </nav>
  );
}
