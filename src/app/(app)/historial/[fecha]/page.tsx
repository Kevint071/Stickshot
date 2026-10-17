import Link from "next/link";
import { notFound } from "next/navigation";
import { DayEditor } from "@/components/day-editor";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@/components/icons";
import {
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  stagger,
} from "@/components/ui";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import {
  CLEANLINESS_LABELS,
  capitalize,
  formatDuration,
  HAND_LABELS,
  SUBDIVISION_LABELS,
} from "@/lib/labels";
import { getDay } from "@/server/days";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const longDay = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const CLEANLINESS_DOT = {
  dirty: "bg-danger",
  almost: "bg-[#eab308]",
  clean: "bg-success",
} as const;

export default async function DayPage({
  params,
}: PageProps<"/historial/[fecha]">) {
  const { userId } = await verifySession();
  const { fecha } = await params;
  if (!DATE_PATTERN.test(fecha)) notFound();
  const day = await getDay(getDb(), userId, fecha);
  if (!day) notFound();
  const totalSeconds = day.logs.reduce(
    (sum, log) => sum + log.durationSeconds * log.sets,
    0,
  );

  return (
    <>
      <PageHeader
        back={
          <Link
            href="/historial"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon size={16} /> Historial
          </Link>
        }
        title={capitalize(longDay.format(new Date(`${day.date}T00:00:00Z`)))}
        description={`${day.logs.length} ${day.logs.length === 1 ? "registro" : "registros"} · ${formatDuration(totalSeconds)} tocados`}
        actions={
          <Link
            href={`/registrar?fecha=${day.date}`}
            className={buttonClass.secondary}
          >
            <PlusIcon size={16} /> Añadir registro
          </Link>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="logs-title" className="order-2 lg:order-1">
          <h2 id="logs-title" className="sr-only">
            Registros
          </h2>
          {day.logs.length === 0 ? (
            <EmptyState title="Este día no tiene registros">
              El día se conserva con su estado de ánimo y su nota.
            </EmptyState>
          ) : (
            <ol className="space-y-3">
              {day.logs.map((log, i) => (
                <li
                  key={log.id}
                  className="animate-rise"
                  style={stagger(i + 2)}
                >
                  <Link
                    href={`/registros/${log.id}`}
                    className={`${cardClass} group grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-border-strong`}
                  >
                    <span className="font-mono text-xs text-muted tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {log.exerciseName}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                        <span>{HAND_LABELS[log.hand]}</span>
                        <span>
                          {SUBDIVISION_LABELS[log.subdivision].toLowerCase()}
                        </span>
                        <span className="tabular-nums">
                          {log.sets} × {formatDuration(log.durationSeconds)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full ${CLEANLINESS_DOT[log.cleanliness]}`}
                          />
                          {CLEANLINESS_LABELS[log.cleanliness]}
                        </span>
                      </span>
                      {log.note ? (
                        <span className="mt-2 block text-sm">{log.note}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-right">
                        <span className="block font-display text-2xl leading-none tabular-nums">
                          {log.bpm}
                        </span>
                        <span className="label-mono text-muted">BPM</span>
                      </span>
                      <ChevronRightIcon
                        size={18}
                        className="text-muted transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside
          className={`${cardClass} order-1 animate-rise p-5 sm:p-6 lg:sticky lg:top-10 lg:order-2`}
          style={stagger(2)}
        >
          <DayEditor date={day.date} mood={day.mood} note={day.note} />
        </aside>
      </div>
    </>
  );
}
