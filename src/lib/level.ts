/**
 * Nivel de práctica con las indicaciones de tempo de la escala de un metrónomo:
 * cuantas más horas tocadas, más rápido el tempo. Umbrales en horas.
 */
export const TEMPO_LEVELS = [
  { name: "Largo", hours: 0 },
  { name: "Adagio", hours: 2 },
  { name: "Andante", hours: 10 },
  { name: "Moderato", hours: 25 },
  { name: "Allegro", hours: 60 },
  { name: "Presto", hours: 150 },
] as const;

export type TempoLevel = {
  index: number;
  name: string;
  /** Avance dentro del nivel, de 0 a 1 (1 en el último). */
  progress: number;
  /** Posición en la escala completa, de 0 a 1: guía la aguja del dial. */
  position: number;
  next?: { name: string; hours: number };
};

export function tempoLevel(seconds: number): TempoLevel {
  const hours = Math.max(0, seconds) / 3600;
  let index = 0;
  while (
    index + 1 < TEMPO_LEVELS.length &&
    hours >= TEMPO_LEVELS[index + 1].hours
  )
    index += 1;
  const current = TEMPO_LEVELS[index];
  const next = TEMPO_LEVELS[index + 1];
  const progress = next
    ? (hours - current.hours) / (next.hours - current.hours)
    : 1;
  return {
    index,
    name: current.name,
    progress,
    position: (index + progress) / TEMPO_LEVELS.length,
    next: next ? { name: next.name, hours: next.hours } : undefined,
  };
}
