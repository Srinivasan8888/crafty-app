"use client";

import Link from "next/link";
import { Compass, Heart, Home, User } from "lucide-react";

type Props = {
  city: string;
  active?: "home" | "explore" | "saved" | "profile";
};

export function BottomNav({ city, active }: Props) {
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
      href: "/dashboard/saved",
      label: "Saved",
      icon: <Heart size={20} aria-hidden="true" />,
    },
    {
      key: "profile",
      href: "/dashboard",
      label: "Profile",
      icon: <User size={20} aria-hidden="true" />,
    },
  ];

  return (
    <nav className="bottom-nav md:hidden" aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={item.key === active ? "active" : undefined}
          aria-current={item.key === active ? "page" : undefined}
        >
          <span className="glyph">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
