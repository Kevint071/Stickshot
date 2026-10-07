import Link from "next/link";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { formatShortDay, HAND_LABELS, tierLabel } from "@/lib/labels";
import { getRecentBrokenRecords } from "@/server/progress";

export default async function HomePage() {
  const { userId } = await verifySession();
  const broken = await getRecentBrokenRecords(getDb(), userId);

  return (
    <div className="space-y-6">
      <Link
        href="/registrar"
        className="block rounded-xl bg-accent py-4 text-center text-lg font-semibold text-accent-foreground"
      >
        Registrar
      </Link>

      <section className="space-y-2">
        <h1 className="text-lg font-semibold">Últimos récords batidos</h1>
        {broken.length === 0 ? (
          <p className="text-muted">
            Aquí aparecerán los récords que superes. La primera marca de cada
            ejercicio sirve de punto de partida.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {broken.map((record) => (
              <li key={`${record.logId}-${record.tier}`}>
                <Link
                  href={`/ejercicios/${record.exerciseId}?tramo=${record.tier}`}
                  className="block px-3 py-3"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{record.exerciseName}</span>
                    <span className="text-sm text-muted">
                      {formatShortDay(record.date)}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-muted">
                      {HAND_LABELS[record.hand]}, {tierLabel(record.tier)}
                    </span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{record.value}</span>{" "}
                      <span className="text-muted">
                        (antes {record.previous})
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
