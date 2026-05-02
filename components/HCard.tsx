import Link from "next/link";
import { Heart } from "lucide-react";

type Props = {
  href: string;
  imageSrc: string;
  title: string;
  meta: string;
  rightSlot?: React.ReactNode;
  showHeart?: boolean;
};

export function HCard({ href, imageSrc, title, meta, rightSlot, showHeart }: Props) {
  return (
    <Link href={href} className="hcard block">
      <div
        className="img"
        style={{ backgroundImage: `url(${imageSrc})` }}
        role="img"
        aria-label={title}
      />
      <div className="info">
        <div className="ttl">{title}</div>
        <div className="meta">{meta}</div>
        {rightSlot && <div className="row row-end">{rightSlot}</div>}
      </div>
      {showHeart && (
        <span className="heart" aria-hidden="true">
          <Heart size={15} />
        </span>
      )}
    </Link>
  );
}
