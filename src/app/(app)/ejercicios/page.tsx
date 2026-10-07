import Link from "next/link";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { formatDay } from "@/lib/labels";
import { listPracticedExercises } from "@/server/exercises";

export default async function ExercisesPage() {
  const { userId } = await verifySession();
  const exercises = await listPracticedExercises(getDb(), userId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ejercicios</h1>
      {exercises.length === 0 ? (
        <p className="text-muted">
          Aquí aparecerán los ejercicios que registres, con la gráfica de sus
          récords.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <Link
                href={`/ejercicios/${exercise.id}`}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <span className="font-medium">{exercise.name}</span>
                {exercise.lastPracticed ? (
                  <span className="text-sm text-muted capitalize">
                    {formatDay(exercise.lastPracticed)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
