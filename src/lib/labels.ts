import type { Cleanliness, Hand, Subdivision } from "@/db/schema";
import type { Tier } from "@/lib/records";

export const HAND_LABELS: Record<Hand, string> = {
  right: "Derecha",
  left: "Izquierda",
};

export const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: "Negras",
  eighth: "Corcheas",
  triplet: "Tresillos",
  sixteenth: "Semicorcheas",
  sextuplet: "Seisillos",
  thirty_second: "Fusas",
};

export const CLEANLINESS_LABELS: Record<Cleanliness, string> = {
  dirty: "Sucio",
  almost: "Casi",
  clean: "Limpio",
};

export const MOODS = [
  { value: 1, emoji: "😣", label: "Muy mal" },
  { value: 2, emoji: "🙁", label: "Mal" },
  { value: 3, emoji: "😐", label: "Normal" },
  { value: 4, emoji: "🙂", label: "Bien" },
  { value: 5, emoji: "😄", label: "Muy bien" },
] as const;

export function moodOf(value: number) {
  return MOODS.find((mood) => mood.value === value) ?? MOODS[2];
}

export function tierLabel(tier: Tier) {
  return tier < 60 ? `${tier} s` : `${tier / 60} min`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const dayFormat = new Intl.DateTimeFormat("es", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const shortDayFormat = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Las fechas son de calendario (sin hora): se formatean en UTC para no desplazarlas. */
export function formatDay(date: string) {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

export function formatShortDay(date: string) {
  return shortDayFormat.format(new Date(`${date}T00:00:00Z`));
}

/** Fecha de hoy en el calendario local del dispositivo (YYYY-MM-DD). */
export function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Primera letra en mayúscula (los formatos de Intl en español van en minúscula). */
export function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}
