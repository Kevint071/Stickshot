import { LogForm } from "@/components/log-form";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { dateSchema } from "@/lib/validation/log";
import { dayDatesBetween } from "@/server/days";
import { listExercisesForPicker } from "@/server/exercises";

function shiftDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
}

export default async function RegisterPage({
  searchParams,
}: PageProps<"/registrar">) {
  const { userId } = await verifySession();
  const { fecha } = await searchParams;
  const now = new Date();
  const date =
    typeof fecha === "string" && dateSchema(now).safeParse(fecha).success
      ? fecha
      : undefined;

  const db = getDb();
  // El servidor no conoce el "hoy" del dispositivo: se envían las fechas con día
  // alrededor de hoy en UTC para que el formulario sepa si debe pedir la carita.
  const [exercises, recentDates, chosenDates] = await Promise.all([
    listExercisesForPicker(db, userId),
    dayDatesBetween(db, userId, shiftDays(now, -2), shiftDays(now, 1)),
    date ? dayDatesBetween(db, userId, date, date) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Registrar</h1>
      <LogForm
        exercises={exercises}
        existingDates={[...recentDates, ...chosenDates]}
        initial={{ date }}
      />
    </div>
  );
}
