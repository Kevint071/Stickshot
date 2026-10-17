import type { CSSProperties } from "react";
import { TEMPO_LEVELS, tempoLevel } from "@/lib/level";

// Semicírculo de 180° con el pivote abajo en el centro, como la escala que
// barre el péndulo de un metrónomo.
const CX = 120;
const CY = 120;
const R = 96;
const SEGMENT = 180 / TEMPO_LEVELS.length;

/** Punto del arco a `deg` grados (180 = izquierda, 0 = derecha). */
function point(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)] as const;
}

function arc(fromDeg: number, toDeg: number, r: number) {
  const [x1, y1] = point(fromDeg, r);
  const [x2, y2] = point(toDeg, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function remaining(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.ceil(hours * 60))} min`;
  return `${hours.toLocaleString("es", { maximumFractionDigits: 1 })} h`;
}

/** Dial de tempo: el nivel de práctica según las horas tocadas, sobre panel oscuro. */
export function TempoDial({ seconds }: { seconds: number }) {
  const level = tempoLevel(seconds);
  const sweep = level.position * 180;
  const next = level.next;
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 240 130"
        className="w-full max-w-72"
        role="img"
        aria-label={`Nivel ${level.name}${next ? `, ${Math.round(level.progress * 100)} % hacia ${next.name}` : ""}`}
      >
        {Array.from({ length: 61 }, (_, i) => {
          const deg = 180 - i * 3;
          const major = i % 10 === 0;
          const [x1, y1] = point(deg, major ? 102 : 105);
          const [x2, y2] = point(deg, 112);
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: marcas fijas de la escala.
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--panel-muted)"
              strokeOpacity={major ? 0.9 : 0.35}
              strokeWidth={major ? 1.5 : 1}
            />
          );
        })}

        {TEMPO_LEVELS.map((tempo, i) => {
          const from = 180 - i * SEGMENT;
          const reached = i <= level.index;
          const mid = from - SEGMENT / 2;
          const [lx, ly] = point(mid, 80);
          return (
            <g key={tempo.name}>
              <path
                d={arc(from - 1.2, from - SEGMENT + 1.2, R)}
                fill="none"
                stroke="var(--panel-border)"
                strokeWidth="8"
              />
              <text
                x={lx}
                y={ly}
                // Tangente al arco: cada nombre cabe en su tramo sin pisarse.
                transform={`rotate(${90 - mid} ${lx} ${ly})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="6.5"
                letterSpacing="0.06em"
                className="font-mono uppercase"
                fill={
                  i === level.index
                    ? "var(--accent)"
                    : reached
                      ? "var(--panel-foreground)"
                      : "var(--panel-muted)"
                }
                fillOpacity={i === level.index || !reached ? 1 : 0.7}
              >
                {tempo.name}
              </text>
            </g>
          );
        })}

        {sweep > 0.5 ? (
          <path
            d={arc(180, 180 - sweep, R)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            className="animate-draw drop-shadow-[0_0_6px_var(--accent)]"
          />
        ) : null}

        <g
          className="animate-needle"
          style={
            {
              "--angle": `${sweep}deg`,
              transform: "rotate(var(--angle))",
              transformOrigin: `${CX}px ${CY}px`,
            } as CSSProperties
          }
        >
          <line
            x1={CX + 12}
            y1={CY}
            x2={CX - 66}
            y2={CY}
            stroke="var(--panel-foreground)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
        <circle
          cx={CX}
          cy={CY}
          r="8"
          fill="var(--panel-2)"
          stroke="var(--panel-border)"
          strokeWidth="2"
        />
        <circle cx={CX} cy={CY} r="3" fill="var(--accent)" />
      </svg>

      <p className="label-mono mt-3 text-panel-muted">Tu tempo</p>
      <p className="font-display text-3xl leading-tight">{level.name}</p>
      <p className="mt-0.5 text-xs text-panel-muted">{nextLabel(seconds)}</p>
    </div>
  );
}

function nextLabel(seconds: number) {
  const { next } = tempoLevel(seconds);
  return next
    ? `${remaining(next.hours - seconds / 3600)} para ${next.name}`
    : "Lo más rápido de la escala";
}

/**
 * Versión lineal del dial para el móvil: el semicírculo necesita ancho y alto
 * que en una pantalla estrecha se comen los ajustes de verdad.
 */
export function TempoMeter({ seconds }: { seconds: number }) {
  const level = tempoLevel(seconds);
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="label-mono text-panel-muted">Tu tempo</p>
          <p className="font-display text-2xl leading-tight">{level.name}</p>
        </div>
        <p className="pb-1 text-right text-xs text-panel-muted">
          {nextLabel(seconds)}
        </p>
      </div>
      <div
        role="img"
        aria-label={`Nivel ${level.name}${level.next ? `, ${Math.round(level.progress * 100)} % hacia ${level.next.name}` : ""}`}
        className="mt-3 grid animate-wipe grid-cols-6 gap-1"
      >
        {TEMPO_LEVELS.map((tempo, i) => {
          const fill =
            i < level.index ? 1 : i === level.index ? level.progress : 0;
          return (
            <span
              key={tempo.name}
              className="h-2 overflow-hidden rounded-full bg-panel-border"
            >
              <span
                className="block h-full rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
                style={{ width: `${fill * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="mt-1.5 grid grid-cols-6 gap-1 font-mono text-[10px] tracking-wider uppercase"
      >
        {TEMPO_LEVELS.map((tempo, i) => (
          <span
            key={tempo.name}
            className={
              i === level.index ? "text-accent" : "text-panel-muted/70"
            }
          >
            {tempo.name.slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
