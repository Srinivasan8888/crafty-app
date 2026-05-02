import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";

type CrossLinkCardProps = {
  thumb: string;
  name: string;
  href: string;
  type: "crafter" | "store" | "studio";
};

const VERB: Record<CrossLinkCardProps["type"], string> = {
  crafter: "Also runs",
  store: "Also runs",
  studio: "Also runs",
};

export function CrossLinkCard({ thumb, name, href, type }: CrossLinkCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-line bg-canvas-raised p-3 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-[3px_3px_0_rgb(var(--ink))]"
    >
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-canvas-sunken">
        <SafeImage
          src={thumb}
          alt={name}
          fill
          sizes="32px"
          className="object-cover"
        />
      </span>
      <span className="flex-1 text-sm text-ink">
        <span className="text-ink-muted">{VERB[type]}</span>{" "}
        <span className="font-semibold">{name}</span>
      </span>
      <ChevronRight
        size={16}
        className="text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        aria-hidden
      />
    </Link>
  );
}

export default CrossLinkCard;
