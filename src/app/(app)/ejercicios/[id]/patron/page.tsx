import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { PatternEditor } from "@/components/pattern-editor";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { findVisibleExercise } from "@/server/exercises";
import { getSoundSettings } from "@/server/settings";

export default async function PatternEditorPage({
  params,
}: PageProps<"/ejercicios/[id]/patron">) {
  const { userId } = await verifySession();
  const { id } = await params;
  const db = getDb();
  const [exercise, sound] = await Promise.all([
    findVisibleExercise(db, userId, id),
    getSoundSettings(db, userId),
  ]);
  // Solo los ejercicios propios tienen editor: los rudimentos estándar son de todos.
  if (!exercise?.custom) notFound();

  return (
    <>
      <PageHeader
        back={
          <Link
            href={`/ejercicios/${exercise.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon size={16} /> {exercise.name}
          </Link>
        }
        eyebrow={exercise.pattern ? "Editar patrón" : "Dibujar patrón"}
        title={exercise.name}
      />
      <PatternEditor
        exerciseId={exercise.id}
        initial={exercise.pattern}
        sound={sound}
      />
    </>
  );
}
