import { formatDay } from "@/lib/labels";
import type { HeatCell } from "@/lib/stats";

const LEVEL_CLASS = [
  "bg-surface-2",
  "bg-accent/25",
  "bg-accent/50",
  "bg-accent/75",
  "bg-accent shadow-[0_0_10px_-2px_var(--accent)]",
] as const;

const WEEKDAYS = ["L", "", "X", "", "V", "", "D"];

/** Cuadro fijo (no se estira): crece por tramos de pantalla. */
const CELL = "size-3.5 sm:size-[1.125rem] xl:size-5";
/** En el móvil solo caben las semanas más recientes. */
const MOBILE_WEEKS = 15;

const monthFormat = new Intl.DateTimeFormat("es", {
  month: "short",
  timeZone: "UTC",
});

function minutesLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return seconds === 0
    ? "sin práctica"
    : minutes < 1
      ? "menos de 1 min"
      : `${minutes} min`;
}

/**
 * Mapa de constancia: una columna por semana (lunes arriba) y un cuadro por
 * día, más intenso cuanto más tiempo se tocó. Los cuadros entran en cascada.
 */
export function Heatmap({ weeks }: { weeks: HeatCell[][] }) {
  return (
    <figure className="space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        <div className="flex shrink-0 flex-col gap-1 pr-1 text-[10px] text-muted">
          <span className="h-4" />
          {WEEKDAYS.map((day, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: filas fijas de la semana.
            <span key={i} className={`flex items-center ${CELL}`}>
              {day}
            </span>
          ))}
        </div>
        {weeks.map((week, w) => {
          const first = week[0].date;
          const mobileStart = weeks.length - MOBILE_WEEKS;
          const showMonth =
            w === 0 ||
            w === mobileStart ||
            first.slice(5, 7) !== weeks[w - 1][0].date.slice(5, 7);
          return (
            <div
              key={first}
              className={`flex-col gap-1 ${w < mobileStart ? "hidden sm:flex" : "flex"}`}
            >
              <span className="h-4 w-0 overflow-visible text-[10px] whitespace-nowrap text-muted capitalize">
                {showMonth
                  ? monthFormat.format(new Date(`${first}T00:00:00Z`))
                  : ""}
              </span>
              {week.map((cell, d) => (
                <span
                  key={cell.date}
                  title={
                    cell.future
                      ? undefined
                      : `${formatDay(cell.date)}: ${minutesLabel(cell.seconds)}`
                  }
                  className={`block animate-pop rounded-[4px] ${CELL} ${
                    cell.future ? "opacity-0" : LEVEL_CLASS[cell.level]
                  }`}
                  style={{ "--i": w * 7 + d } as React.CSSProperties}
                />
              ))}
            </div>
          );
        })}
      </div>
      <figcaption className="flex items-center gap-1.5 text-[11px] text-muted">
        Menos
        {LEVEL_CLASS.map((level) => (
          <span key={level} className={`size-3 rounded-[3px] ${level}`} />
        ))}
        Más
      </figcaption>
    </figure>
  );
}
