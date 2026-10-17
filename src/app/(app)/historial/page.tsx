import Link from "next/link";
import { ChevronRightIcon, MetronomeIcon } from "@/components/icons";
import {
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  stagger,
} from "@/components/ui";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { capitalize, moodOf } from "@/lib/labels";
import { listDays } from "@/server/days";

const monthFormat = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekdayFormat = new Intl.DateTimeFormat("es", {
  weekday: "short",
  timeZone: "UTC",
});

type Day = Awaited<ReturnType<typeof listDays>>[number];

function groupByMonth(days: Day[]) {
  const groups: { month: string; days: Day[] }[] = [];
  for (const day of days) {
    const month = day.date.slice(0, 7);
    const last = groups.at(-1);
    if (last?.month === month) last.days.push(day);
    else groups.push({ month, days: [day] });
  }
  return groups;
}

function minutes(seconds: number) {
  const value = Math.round(seconds / 60);
  return value < 1 && seconds > 0 ? "<1" : String(value);
}

export default async function HistoryPage() {
  const { userId } = await verifySession();
  const days = await listDays(getDb(), userId);
  const totalSeconds = days.reduce((sum, day) => sum + day.seconds, 0);
  let index = 0;

  return (
    <>
      <PageHeader
        eyebrow="Diario de práctica"
        title="Historial"
        description={
          days.length
            ? `${days.length} ${days.length === 1 ? "día" : "días"} con práctica · ${Math.round(totalSeconds / 60)} minutos en total`
            : undefined
        }
      />
      {days.length === 0 ? (
        <EmptyState
          title="Tu diario está en blanco"
          action={
            <Link href="/registrar" className={buttonClass.primary}>
              <MetronomeIcon size={18} /> Practicar ahora
            </Link>
          }
        >
          Cada día que practiques aparecerá aquí, con tu estado de ánimo, notas
          y registros.
        </EmptyState>
      ) : (
        <div className="max-w-3xl space-y-10">
          {groupByMonth(days).map((group) => (
            <section key={group.month} aria-label={group.month}>
              <h2 className="label-mono sticky top-14 z-10 -mx-1 mb-3 bg-background/85 px-1 py-2 text-muted backdrop-blur lg:top-0">
                {capitalize(
                  monthFormat.format(new Date(`${group.month}-01T00:00:00Z`)),
                )}
              </h2>
              <ol className="relative space-y-2 before:absolute before:top-2 before:bottom-2 before:left-7 before:w-px before:bg-border">
                {group.days.map((day) => {
                  const mood = moodOf(day.mood);
                  const date = new Date(`${day.date}T00:00:00Z`);
                  index += 1;
                  return (
                    <li
                      key={day.id}
                      className="animate-rise"
                      style={stagger(Math.min(index, 14))}
                    >
                      <Link
                        href={`/historial/${day.date}`}
                        className={`${cardClass} group relative flex items-center gap-4 p-3 pr-4 transition-[transform,border-color,box-shadow] duration-300 hover:translate-x-1 hover:border-border-strong hover:shadow-[0_16px_30px_-22px_rgb(0_0_0/0.45)]`}
                      >
                        <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-center leading-none">
                          <span className="font-display text-lg tabular-nums">
                            {date.getUTCDate()}
                          </span>
                          <span className="absolute -right-1 -bottom-1 text-base transition-transform duration-300 ease-spring group-hover:scale-125">
                            {mood.emoji}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {capitalize(weekdayFormat.format(date))}
                            <span className="ml-2 font-normal text-muted">
                              {mood.label}
                            </span>
                          </span>
                          <span className="line-clamp-1 text-sm text-muted">
                            {day.note ??
                              `${day.logs} ${day.logs === 1 ? "registro" : "registros"}`}
                          </span>
                        </span>
                        <span className="hidden text-right sm:block">
                          <span className="block font-display text-lg tabular-nums">
                            {minutes(day.seconds)}
                            <span className="ml-1 font-sans text-xs font-normal text-muted">
                              min
                            </span>
                          </span>
                          {day.topBpm ? (
                            <span className="text-xs text-muted tabular-nums">
                              hasta {day.topBpm} BPM
                            </span>
                          ) : null}
                        </span>
                        <ChevronRightIcon
                          size={18}
                          className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
