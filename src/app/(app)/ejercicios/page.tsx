import Link from "next/link";
import { ArrowUpRightIcon, MetronomeIcon } from "@/components/icons";
import { Sparkline } from "@/components/sparkline";
import {
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  stagger,
} from "@/components/ui";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { formatShortDay, HAND_LABELS, tierLabel } from "@/lib/labels";
import { getExerciseSummaries } from "@/server/progress";

export default async function ExercisesPage() {
  const { userId } = await verifySession();
  const exercises = await getExerciseSummaries(getDb(), userId);

  return (
    <>
      <PageHeader
        eyebrow="Progreso"
        title="Ejercicios"
        description={
          exercises.length
            ? "Tu récord actual en golpes por minuto y cómo ha subido."
            : undefined
        }
      />
      {exercises.length === 0 ? (
        <EmptyState
          title="Aún no hay ejercicios"
          action={
            <Link href="/registrar" className={buttonClass.primary}>
              <MetronomeIcon size={18} /> Practicar ahora
            </Link>
          }
        >
          Aquí aparecerán los ejercicios que registres, con la gráfica de sus
          récords.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exercises.map((exercise, i) => {
            const hands = (["right", "left"] as const).filter(
              (hand) => exercise.records[hand] !== undefined,
            );
            return (
              <li
                key={exercise.id}
                className="animate-rise"
                style={stagger(Math.min(i + 2, 14))}
              >
                <Link
                  href={`/ejercicios/${exercise.id}`}
                  className={`${cardClass} group flex h-full flex-col gap-5 p-5 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_24px_48px_-28px_rgb(0_0_0/0.5)]`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-display text-lg leading-tight text-balance">
                        {exercise.name}
                      </span>
                      {exercise.lastPracticed ? (
                        <span className="mt-1 block text-xs text-muted">
                          Última vez el {formatShortDay(exercise.lastPracticed)}
                        </span>
                      ) : null}
                    </span>
                    <ArrowUpRightIcon
                      size={18}
                      className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-ink"
                    />
                  </span>

                  {hands.length ? (
                    <span className="mt-auto flex items-end justify-between gap-4">
                      <span className="space-y-1">
                        {hands.map((hand) => (
                          <span
                            key={hand}
                            className="flex items-baseline gap-2"
                          >
                            <span
                              className={`size-2 rounded-full ${hand === "right" ? "bg-right-hand" : "bg-left-hand"}`}
                            />
                            <span className="font-display text-2xl leading-none tabular-nums">
                              {exercise.records[hand]}
                            </span>
                            <span className="text-xs text-muted">
                              {HAND_LABELS[hand]}
                            </span>
                          </span>
                        ))}
                        <span className="label-mono block pt-1 text-muted">
                          Golpes/min ·{" "}
                          {exercise.tier ? tierLabel(exercise.tier) : ""}
                        </span>
                      </span>
                      <Sparkline
                        values={exercise.curve}
                        className="h-10 w-28 shrink-0"
                      />
                    </span>
                  ) : (
                    <span className="mt-auto text-sm text-muted">
                      Sin récord todavía: cuentan los registros limpios o casi
                      de al menos 15 s.
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
