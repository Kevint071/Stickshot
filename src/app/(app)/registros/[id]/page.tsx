import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteLogButton } from "@/components/delete-log-button";
import { LogForm } from "@/components/log-form";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { formatDay } from "@/lib/labels";
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
    <div className="space-y-6">
      <div>
        <Link href={`/historial/${log.date}`} className="text-sm text-muted">
          ← {formatDay(log.date)}
        </Link>
        <h1 className="text-2xl font-bold">Corregir registro</h1>
      </div>
      <LogForm
        logId={log.id}
        exercises={exercises}
        existingDates={[log.date]}
        initial={log}
      />
      <DeleteLogButton logId={log.id} />
    </div>
  );
}
