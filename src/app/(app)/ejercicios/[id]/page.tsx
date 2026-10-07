import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordChart } from "@/components/record-chart";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { tierLabel } from "@/lib/labels";
import { getExerciseProgress } from "@/server/progress";

export default async function ExercisePage({
  params,
  searchParams,
}: PageProps<"/ejercicios/[id]">) {
  const { userId } = await verifySession();
  const [{ id }, { tramo }] = await Promise.all([params, searchParams]);
  const progress = await getExerciseProgress(
    getDb(),
    userId,
    id,
    typeof tramo === "string" ? tramo : undefined,
  );
  if (!progress) notFound();
  const { exercise, tiers, tier, history, current } = progress;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ejercicios" className="text-sm text-muted">
          ← Ejercicios
        </Link>
        <h1 className="text-2xl font-bold">{exercise.name}</h1>
      </div>

      {tier === undefined ? (
        <p className="text-muted">
          Aún no hay récords para este ejercicio. Cuentan los registros casi o
          limpios de al menos 15 segundos.
        </p>
      ) : (
        <>
          <nav aria-label="Tramo" className="flex flex-wrap gap-1">
            {tiers.map((t) => (
              <Link
                key={t}
                href={`/ejercicios/${exercise.id}?tramo=${t}`}
                replace
                scroll={false}
                aria-current={t === tier ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  t === tier
                    ? "border-accent bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-surface"
                }`}
              >
                {tierLabel(t)}
              </Link>
            ))}
          </nav>
          <section aria-label={`Récord sostenido ${tierLabel(tier)}`}>
            <RecordChart history={history} current={current} />
          </section>
        </>
      )}

      <Link
        href="/registrar"
        className="block rounded-xl border border-border py-3 text-center font-medium"
      >
        Registrar
      </Link>
    </div>
  );
}
