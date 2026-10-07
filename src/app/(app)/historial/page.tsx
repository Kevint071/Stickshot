import Link from "next/link";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { formatDay, moodOf } from "@/lib/labels";
import { listDays } from "@/server/days";

export default async function HistoryPage() {
  const { userId } = await verifySession();
  const days = await listDays(getDb(), userId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Historial</h1>
      {days.length === 0 ? (
        <p className="text-muted">
          Aún no hay días con práctica. Aparecerán aquí al guardar tu primer
          registro.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {days.map((day) => {
            const mood = moodOf(day.mood);
            return (
              <li key={day.id}>
                <Link
                  href={`/historial/${day.date}`}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <span className="text-2xl" role="img" aria-label={mood.label}>
                    {mood.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium capitalize">
                      {formatDay(day.date)}
                    </span>
                    {day.note ? (
                      <span className="line-clamp-1 text-sm text-muted">
                        {day.note}
                      </span>
                    ) : null}
                  </span>
                  <span aria-hidden className="text-muted">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
