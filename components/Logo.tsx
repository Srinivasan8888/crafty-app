type LogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  cream?: boolean;
  className?: string;
};

export function Logo({ size = "md", cream, className }: LogoProps) {
  const sizeClass = size === "lg" ? "lg" : size === "xl" ? "xl" : "";
  const classes = [
    "brand-mark",
    sizeClass,
    cream ? "cream" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-label="Crafty">
      Crafty
      <svg viewBox="0 0 80 6" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M2 4 Q 20 1 40 3 T 78 3"
          stroke="rgb(var(--magenta))"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
