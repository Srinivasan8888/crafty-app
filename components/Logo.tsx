export function Logo({ className }: { className?: string }) {
  return (
    <span className={className} aria-label="Crafty">
      <span className="font-display text-xl font-extrabold tracking-tight">
        crafty<span className="text-accent">.</span>
      </span>
    </span>
  );
}
