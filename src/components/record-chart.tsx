"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Hand } from "@/db/schema";
import { formatDay, formatShortDay, HAND_LABELS } from "@/lib/labels";
import type { HistoryPoint } from "@/lib/records";

// Colores validados (CVD y contraste) en claro y oscuro; ver --right-hand/--left-hand.
const SERIES: { hand: Hand; color: string; dash?: string }[] = [
  { hand: "right", color: "var(--right-hand)" },
  // La izquierda va discontinua: la identidad nunca depende solo del color.
  { hand: "left", color: "var(--left-hand)", dash: "6 4" },
];

type Row = HistoryPoint & { t: number };

function toRows(history: HistoryPoint[]): Row[] {
  return history.map((point) => ({
    ...point,
    t: Date.parse(`${point.date}T00:00:00Z`),
  }));
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium capitalize">{formatDay(row.date)}</p>
      {SERIES.map(({ hand, color, dash }) =>
        row[hand] !== undefined ? (
          <p key={hand} className="flex items-center gap-2">
            <Swatch color={color} dash={dash} />
            <span className="text-muted">{HAND_LABELS[hand]}</span>
            <span className="ml-auto font-semibold tabular-nums">
              {row[hand]}
            </span>
          </p>
        ) : null,
      )}
    </div>
  );
}

function Swatch({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width="18" height="8" aria-hidden="true" className="shrink-0">
      <line
        x1="1"
        y1="4"
        x2="17"
        y2="4"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Evolución del récord en un tramo: una línea escalonada por mano. */
export function RecordChart({
  history,
  current,
}: {
  history: HistoryPoint[];
  current: Partial<Record<Hand, number>>;
}) {
  const rows = toRows(history);
  const series = SERIES.filter(({ hand }) => current[hand] !== undefined);

  return (
    <figure className="space-y-3">
      {/* Leyenda con etiqueta directa: mano y récord actual. */}
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {series.map(({ hand, color, dash }) => (
          <span key={hand} className="flex items-center gap-2">
            <Swatch color={color} dash={dash} />
            <span className="text-muted">{HAND_LABELS[hand]}</span>
            <span className="font-semibold tabular-nums">{current[hand]}</span>
          </span>
        ))}
        <span className="text-muted">golpes por minuto</span>
      </figcaption>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) =>
                formatShortDay(new Date(t).toISOString().slice(0, 10))
              }
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={["auto", "auto"]}
              allowDecimals={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
            />
            {series.map(({ hand, color, dash }) => (
              <Line
                key={hand}
                dataKey={hand}
                name={HAND_LABELS[hand]}
                type="stepAfter"
                stroke={color}
                strokeWidth={2}
                strokeDasharray={dash}
                dot={{
                  r: 4,
                  fill: color,
                  stroke: "var(--surface)",
                  strokeWidth: 2,
                }}
                activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Ver como tabla</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Fecha</th>
              {series.map(({ hand }) => (
                <th key={hand} className="py-1 text-right font-medium">
                  {HAND_LABELS[hand]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((point) => (
              <tr key={point.date} className="border-t border-border">
                <td className="py-1 capitalize">{formatDay(point.date)}</td>
                {series.map(({ hand }) => (
                  <td key={hand} className="py-1 text-right">
                    {point[hand] ?? "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
