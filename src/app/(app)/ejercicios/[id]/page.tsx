import Link from "next/link";
import { notFound } from "next/navigation";
import { CountUp } from "@/components/count-up";
import { ChevronLeftIcon, MetronomeIcon } from "@/components/icons";
import { RecordChart } from "@/components/record-chart";
import { TierTabs } from "@/components/tier-tabs";
import {
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  stagger,
} from "@/components/ui";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { HAND_LABELS, tierLabel } from "@/lib/labels";
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
    <>
      <PageHeader
        back={
          <Link
            href="/ejercicios"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon size={16} /> Ejercicios
          </Link>
        }
        title={exercise.name}
        actions={
          <Link
            href={`/registrar?ejercicio=${exercise.id}`}
            className={buttonClass.primary}
          >
            <MetronomeIcon size={18} /> Practicar este
          </Link>
        }
      />

      {tier === undefined ? (
        <EmptyState title="Aún no hay récords">
          Cuentan los registros limpios o casi de al menos 15 segundos.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["right", "left"] as const).map((hand, i) => {
              const value = current[hand];
              // Primera marca de esta mano (el primer punto puede ser solo de la otra).
              const start = history.find(
                (point) => point[hand] !== undefined,
              )?.[hand];
              return (
                <div
                  key={hand}
                  className={`${cardClass} relative animate-rise overflow-hidden p-5`}
                  style={stagger(i + 2)}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1 ${hand === "right" ? "bg-right-hand" : "bg-left-hand"}`}
                  />
                  <p className="label-mono text-muted">
                    {HAND_LABELS[hand]} · {tierLabel(tier)}
                  </p>
                  {value !== undefined ? (
                    <>
                      <p className="mt-3 flex items-baseline gap-2">
                        <CountUp
                          value={value}
                          delay={i * 0.1}
                          className="font-display text-5xl leading-none tabular-nums"
                        />
                        <span className="text-sm text-muted">golpes/min</span>
                      </p>
                      {start !== undefined && value > start ? (
                        <p className="mt-2 text-sm text-success">
                          +{value - start} desde tu primera marca ({start})
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-muted">
                          Tu punto de partida
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      Sin registros válidos con esta mano en este tramo.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <section
            className={`${cardClass} animate-rise space-y-5 p-5 sm:p-6`}
            style={stagger(4)}
            aria-label={`Récord sostenido ${tierLabel(tier)}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl">Evolución</h2>
              <TierTabs exerciseId={exercise.id} tiers={tiers} current={tier} />
            </div>
            <RecordChart key={tier} history={history} current={current} />
          </section>
        </div>
      )}
    </>
  );
}
