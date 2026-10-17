import { LogForm, type LogFormInitial } from "@/components/log-form";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { handEnum, subdivisionEnum } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { dateSchema } from "@/lib/validation/log";
import { dayDatesBetween } from "@/server/days";
import { listExercisesForPicker } from "@/server/exercises";
import { getPracticeTargets } from "@/server/progress";

function shiftDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
}

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

function oneOf<T extends string>(values: readonly T[], value?: string) {
  return values.includes(value as T) ? (value as T) : undefined;
}

export default async function RegisterPage({
  searchParams,
}: PageProps<"/registrar">) {
  const { userId } = await verifySession();
  const params = await searchParams;
  const now = new Date();
  const fecha = one(params.fecha);
  const date =
    fecha && dateSchema(now).safeParse(fecha).success ? fecha : undefined;

  const db = getDb();
  // El servidor no conoce el "hoy" del dispositivo: se envían las fechas con día
  // alrededor de hoy en UTC para que el formulario sepa si debe pedir el estado de ánimo.
  const [exercises, recentDates, chosenDates, targets] = await Promise.all([
    listExercisesForPicker(db, userId),
    dayDatesBetween(db, userId, shiftDays(now, -2), shiftDays(now, 1)),
    date ? dayDatesBetween(db, userId, date, date) : Promise.resolve([]),
    getPracticeTargets(db, userId),
  ]);

  // Un reto del inicio llega como ?ejercicio=…&bpm=…&mano=…&sub=…
  const exerciseId = one(params.ejercicio);
  const bpm = Number(one(params.bpm));
  const initial: LogFormInitial = {
    date,
    exerciseId: exercises.some((e) => e.id === exerciseId)
      ? exerciseId
      : exercises.find((e) => e.lastPracticed)?.id,
    bpm: Number.isInteger(bpm) && bpm >= 20 && bpm <= 400 ? bpm : undefined,
    hand: oneOf(handEnum.enumValues, one(params.mano)),
    subdivision: oneOf(subdivisionEnum.enumValues, one(params.sub)),
  };

  return (
    <>
      <PageHeader
        eyebrow="Sesión de práctica"
        title="Practicar"
        description="Pon el metrónomo, toca y páralo al terminar: la serie se anota sola. Luego di qué tan limpio salió y guarda."
      />
      <LogForm
        exercises={exercises}
        existingDates={[...recentDates, ...chosenDates]}
        initial={initial}
        targets={targets}
      />
    </>
  );
}
