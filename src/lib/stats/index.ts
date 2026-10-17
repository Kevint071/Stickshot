/** Total de práctica de un día: segundos tocados (duración × series) y registros. */
export type DayTotal = { date: string; seconds: number; logs: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

/** Suma días a una fecha de calendario (YYYY-MM-DD). */
export function addDays(date: string, days: number) {
  return fromTime(toTime(date) + days * DAY_MS);
}

/** Día de la semana empezando en lunes: 0 = lunes … 6 = domingo. */
export function weekdayIndex(date: string) {
  return (new Date(toTime(date)).getUTCDay() + 6) % 7;
}

/**
 * Fecha de hoy en una zona horaria IANA. Si la zona no es válida (o no hay),
 * se usa UTC: el servidor no conoce el calendario del dispositivo.
 */
export function dateInZone(now: Date, timeZone?: string) {
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      // Zona desconocida: se cae a UTC.
    }
  }
  return now.toISOString().slice(0, 10);
}

/**
 * Racha de días seguidos con práctica. La actual sigue viva si se practicó hoy
 * o ayer: un día sin tocar todavía no la rompe hasta que termina.
 */
export function computeStreak(dates: string[], today: string) {
  const unique = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const date of unique) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  const practiced = new Set(unique);
  let cursor = practiced.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (practiced.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

/** Segundos tocados desde `from` hasta `to` (ambos incluidos). */
export function secondsBetween(days: DayTotal[], from: string, to: string) {
  return days
    .filter((day) => day.date >= from && day.date <= to)
    .reduce((sum, day) => sum + day.seconds, 0);
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** Intensidad de un día: nada, <5 min, <15 min, <30 min y 30 min o más. */
export function heatLevel(seconds: number): HeatLevel {
  if (seconds <= 0) return 0;
  if (seconds < 5 * 60) return 1;
  if (seconds < 15 * 60) return 2;
  if (seconds < 30 * 60) return 3;
  return 4;
}

export type HeatCell = {
  date: string;
  seconds: number;
  level: HeatLevel;
  future: boolean;
};

/**
 * Mapa de constancia: `weeks` columnas de lunes a domingo que terminan en la
 * semana de hoy. Los días posteriores a hoy se marcan como futuros.
 */
export function heatmap(
  days: DayTotal[],
  today: string,
  weeks: number,
): HeatCell[][] {
  const byDate = new Map(days.map((day) => [day.date, day.seconds]));
  const lastSunday = addDays(today, 6 - weekdayIndex(today));
  const start = addDays(lastSunday, -(weeks * 7 - 1));
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(start, week * 7 + weekday);
      const seconds = byDate.get(date) ?? 0;
      return { date, seconds, level: heatLevel(seconds), future: date > today };
    }),
  );
}

/** Paso del siguiente reto: un 3 % del tempo, al menos 2 BPM. */
export function challengeStep(bpm: number) {
  return Math.max(2, Math.round(bpm * 0.03));
}
