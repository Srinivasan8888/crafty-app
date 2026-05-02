import Link from "next/link";

type City = { slug: string; display_name: string };

type Props = {
  cities: City[];
  current: string;
};

export function CitySelector({ cities, current }: Props) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted mb-2">Pick your city</div>
      <div className="pillrow">
        {cities.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className={`pill ${current === c.slug ? "active" : ""}`}
            aria-current={current === c.slug ? "true" : undefined}
          >
            {c.display_name}
          </Link>
        ))}
      </div>
    </div>
  );
}
