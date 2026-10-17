/**
 * Dos barras de notación rítmica (las "slashes" de las partituras de batería),
 * que también recuerdan a un par de baquetas, sobre una pastilla de acento.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className ?? ""}`}
    >
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="var(--accent)" />
        <path
          d="M6.5 17.5 11 6.5M13 17.5 17.5 6.5"
          stroke="var(--accent-foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      Stickshot
    </span>
  );
}
