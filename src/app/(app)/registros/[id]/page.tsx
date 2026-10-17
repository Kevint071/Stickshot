import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteLogButton } from "@/components/delete-log-button";
import { ChevronLeftIcon } from "@/components/icons";
import { LogForm } from "@/components/log-form";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { capitalize, formatDay } from "@/lib/labels";
import { listExercisesForPicker } from "@/server/exercises";
import { getLog } from "@/server/logs";

export default async function EditLogPage({
  params,
}: PageProps<"/registros/[id]">) {
  const { userId } = await verifySession();
  const { id } = await params;
  const db = getDb();
  const log = await getLog(db, userId, id);
  // Un registro ajeno se trata igual que uno inexistente.
  if (!log) notFound();
  const exercises = await listExercisesForPicker(db, userId);

  return (
    <>
      <PageHeader
        back={
          <Link
            href={`/historial/${log.date}`}
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon size={16} /> {capitalize(formatDay(log.date))}
          </Link>
        }
        title="Corregir registro"
        description={log.exerciseName}
      />
      <div className="max-w-2xl space-y-6">
        <LogForm
          logId={log.id}
          exercises={exercises}
          existingDates={[log.date]}
          initial={log}
        />
        <DeleteLogButton logId={log.id} />
      </div>
    </>
  );
}
