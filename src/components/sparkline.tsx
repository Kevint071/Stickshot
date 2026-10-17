/** Curva escalonada mínima que se dibuja al aparecer (récord por cambio). */
export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const width = 120;
  const height = 36;
  if (values.length === 0) return null;
  const points = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const dx = width / (points.length - 1);
  const y = (value: number) =>
    height - 4 - ((value - min) / span) * (height - 8);
  const path = points
    .map((value, i) => (i === 0 ? `M0 ${y(value)}` : `H${i * dx} V${y(value)}`))
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className ?? ""}`}
      aria-hidden="true"
    >
      <path
        d={`${path} V${height} H0 Z`}
        fill="var(--accent)"
        opacity="0.08"
        className="animate-fade"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        className="animate-draw"
      />
      <circle
        cx={width}
        cy={y(points.at(-1) ?? 0)}
        r="3.5"
        fill="var(--accent)"
        className="animate-pop"
        style={{ animationDelay: "1.2s" }}
      />
    </svg>
  );
}
