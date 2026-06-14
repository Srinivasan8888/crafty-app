"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, User } from "lucide-react";

type Props = {
  city: string;
  active?: "home" | "explore" | "saved" | "profile";
};

export function BottomNav({ city, active }: Props) {
  const pathname = usePathname();

  const items: Array<{
    key: NonNullable<Props["active"]>;
    href: string;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "home",
      href: `/${city}`,
      label: "Home",
      icon: <Home size={20} aria-hidden="true" />,
    },
    {
      key: "explore",
      href: `/${city}/crafters`,
      label: "Explore",
      icon: <Compass size={20} aria-hidden="true" />,
    },
    {
      key: "saved",
      // Signed-out buyers get 307'd to /sign-in; carry a redirect so they
      // land back on Saved afterwards.
      href: "/dashboard/saved?redirect_url=/dashboard/saved",
      label: "Saved",
      icon: <Heart size={20} aria-hidden="true" />,
    },
    {
      key: "profile",
      href: "/dashboard?redirect_url=/dashboard",
      label: "Profile",
      icon: <User size={20} aria-hidden="true" />,
    },
  ];

  // Compute the active tab from the current path so the highlight + aria-current
  // reflect the real page (not a hardcoded prop). Match the most specific
  // (longest) href first so `/[city]/crafters` wins over `/[city]`.
  const path = pathname ?? "";
  const matchHref = (href: string) => href.split("?")[0];
  const activeKey =
    items
      .filter((item) => {
        const base = matchHref(item.href);
        return path === base || path.startsWith(`${base}/`);
      })
      .sort((a, b) => matchHref(b.href).length - matchHref(a.href).length)[0]
      ?.key ?? active;

  return (
    <nav className="bottom-nav md:hidden" aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={item.key === activeKey ? "active" : undefined}
          aria-current={item.key === activeKey ? "page" : undefined}
        >
          <span className="glyph">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Desktop primary-nav island. AppHeader is a Server Component (it awaits
// getTranslations), so it renders the localized labels + hrefs server-side and
// hands them to this client island, which marks the link matching the current
// /[city]/<section> as active (className="active" + aria-current) for the
// existing `.web-hdr nav a.active` styling.
export function PrimaryNavIsland({
  links,
}: {
  links: Array<{ label: string; href: string }>;
}) {
  const pathname = usePathname() ?? "";

  // Most-specific match wins so `/[city]/crafters` beats a shorter prefix.
  const activeHref = links
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      className="hidden md:flex flex-1 gap-6 max-md:!hidden"
      aria-label="Primary"
    >
      {links.map(({ label, href }) => {
        const isActive = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? "font-display font-semibold text-[15px] active"
                : "font-display font-semibold text-[15px]"
            }
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
