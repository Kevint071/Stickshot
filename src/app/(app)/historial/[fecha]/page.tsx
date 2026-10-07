import Link from "next/link";
import { notFound } from "next/navigation";
import { DayEditor } from "@/components/day-editor";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import {
  CLEANLINESS_LABELS,
  formatDay,
  formatDuration,
  HAND_LABELS,
  SUBDIVISION_LABELS,
} from "@/lib/labels";
import { getDay } from "@/server/days";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function DayPage({
  params,
}: PageProps<"/historial/[fecha]">) {
  const { userId } = await verifySession();
  const { fecha } = await params;
  if (!DATE_PATTERN.test(fecha)) notFound();
  const day = await getDay(getDb(), userId, fecha);
  if (!day) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/historial" className="text-sm text-muted">
          ← Historial
        </Link>
        <h1 className="text-2xl font-bold capitalize">{formatDay(day.date)}</h1>
      </div>

      <DayEditor date={day.date} mood={day.mood} note={day.note} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Registros</h2>
          <Link
            href={`/registrar?fecha=${day.date}`}
            className="text-sm font-medium text-accent"
          >
            + Añadir registro
          </Link>
        </div>
        {day.logs.length === 0 ? (
          <p className="text-sm text-muted">Este día no tiene registros.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {day.logs.map((log) => (
              <li key={log.id}>
                <Link href={`/registros/${log.id}`} className="block px-3 py-3">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{log.exerciseName}</span>
                    <span className="font-semibold tabular-nums">
                      {log.bpm} BPM
                    </span>
                  </span>
                  <span className="block text-sm text-muted">
                    {HAND_LABELS[log.hand]},{" "}
                    {SUBDIVISION_LABELS[log.subdivision].toLowerCase()},{" "}
                    {log.sets} × {formatDuration(log.durationSeconds)},{" "}
                    {CLEANLINESS_LABELS[log.cleanliness].toLowerCase()}
                  </span>
                  {log.note ? (
                    <span className="mt-1 block text-sm">{log.note}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
