/**
 * Ficha de ejemplo para la portada y las pantallas de acceso: imita la gráfica
 * por mano de la app, con datos ilustrativos. Las líneas se dibujan al entrar.
 */
const RIGHT = [108, 108, 114, 114, 120, 126, 126, 132];
const LEFT = [100, 104, 104, 110, 110, 116, 120, 120];
const MIN_BPM = 95;
const MAX_BPM = 135;
const WIDTH = 300;
const HEIGHT = 96;

function y(bpm: number) {
  return HEIGHT - ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * HEIGHT;
}

/** Línea escalonada: un récord se sostiene hasta que se supera. */
function stepPath(values: number[]) {
  const dx = WIDTH / (values.length - 1);
  return values
    .map((bpm, i) => (i === 0 ? `M0 ${y(bpm)}` : `H${i * dx} V${y(bpm)}`))
    .join(" ");
}

export function RecordChartPreview({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <svg
        viewBox={`0 -6 ${WIDTH} ${HEIGHT + 12}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Gráfica de ejemplo: el récord sube de 108 a 132 BPM con la derecha y de 100 a 120 con la izquierda"
      >
        {[100, 115, 130].map((bpm) => (
          <line
            key={bpm}
            x1="0"
            x2={WIDTH}
            y1={y(bpm)}
            y2={y(bpm)}
            stroke="currentColor"
            opacity="0.15"
          />
        ))}
        <path
          d={stepPath(LEFT)}
          fill="none"
          stroke="var(--left-hand)"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          className="animate-draw"
          style={{ animationDelay: "0.5s" }}
        />
        <path
          d={stepPath(RIGHT)}
          fill="none"
          stroke="var(--right-hand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          className="animate-draw"
        />
        <circle
          cx={WIDTH}
          cy={y(RIGHT[RIGHT.length - 1])}
          r="5"
          fill="var(--right-hand)"
          className="animate-pop"
          style={{ animationDelay: "1.6s" }}
        />
      </svg>
      <figcaption className="mt-3 flex gap-4 text-xs opacity-70">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-right-hand" /> Derecha
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-left-hand" /> Izquierda
        </span>
      </figcaption>
    </figure>
  );
}
