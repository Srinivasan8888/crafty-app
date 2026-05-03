import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { SaveButton } from "@/components/SaveButton";

type SaveTarget = {
  entityType: "crafter" | "store" | "studio" | "event";
  entityId: string;
};

type Props = {
  href: string;
  imageSrc: string;
  title: string;
  meta: string;
  rightSlot?: React.ReactNode;
  showHeart?: boolean;
  saveTarget?: SaveTarget;
};

export function HCard({ href, imageSrc, title, meta, rightSlot, showHeart, saveTarget }: Props) {
  return (
    <Link href={href} className="hcard block relative">
      <div className="img relative shrink-0 overflow-hidden">
        <SafeImage src={imageSrc} alt={title} fill sizes="96px" className="object-cover" />
      </div>
      <div className="info">
        <div className="ttl">{title}</div>
        <div className="meta">{meta}</div>
        {rightSlot && <div className="row row-end">{rightSlot}</div>}
      </div>
      {showHeart && saveTarget && (
        <SaveButton
          variant="icon"
          entityType={saveTarget.entityType}
          entityId={saveTarget.entityId}
          className="heart absolute top-3 right-3 z-10"
        />
      )}
    </Link>
  );
}
