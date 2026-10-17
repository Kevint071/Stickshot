import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "@/components/count-up";
import { Heatmap } from "@/components/heatmap";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  ClockIcon,
  FlameIcon,
  TrophyIcon,
} from "@/components/icons";
import { LocalGreeting } from "@/components/local-greeting";
import { cardClass, EmptyState, PageHeader, stagger } from "@/components/ui";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import {
  formatShortDay,
  HAND_LABELS,
  SUBDIVISION_LABELS,
  tierLabel,
} from "@/lib/labels";
import { userToday } from "@/lib/today";
import { type Dashboard, getDashboard, HEATMAP_WEEKS } from "@/server/stats";

function headline({ streak, practicedToday }: Dashboard) {
  if (streak.current > 1) return `${streak.current} días seguidos`;
  if (practicedToday) return "Hoy ya tocaste";
  return "Hoy toca practicar";
}

function subline({ streak, practicedToday }: Dashboard) {
  if (practicedToday) return "Buen trabajo. ¿Otra serie un poco más rápida?";
  if (streak.current > 0)
    return "Practica hoy para no romper la racha: con una serie basta.";
  return "Una sola serie empieza una racha nueva.";
}

export default async function HomePage() {
  const { userId } = await verifySession();
  const today = await userToday();
  const dashboard = await getDashboard(getDb(), userId, today);
  const { challenge, streak } = dashboard;

  return (
    <>
      <PageHeader
        eyebrow={<LocalGreeting />}
        title={headline(dashboard)}
        description={subline(dashboard)}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12 lg:gap-5">
        <ChallengeCard challenge={challenge} />

        <div className="grid grid-cols-2 gap-4 lg:col-span-5 lg:gap-5">
          <Stat
            i={3}
            icon={<FlameIcon />}
            label="Racha"
            value={streak.current}
            unit={streak.current === 1 ? "día" : "días"}
            note={streak.best ? `Mejor: ${streak.best}` : "Empieza hoy"}
            hot={streak.current > 0}
          />
          <Stat
            i={4}
            icon={<ClockIcon />}
            label="Esta semana"
            value={Math.round(dashboard.weekSeconds / 60)}
            unit="min"
            note="Últimos 7 días"
          />
          <Stat
            i={5}
            icon={<CalendarIcon />}
            label="Este mes"
            value={dashboard.monthDays}
            unit={dashboard.monthDays === 1 ? "día" : "días"}
            note="Con práctica"
          />
          <Stat
            i={6}
            icon={<TrophyIcon />}
            label="Récords"
            value={dashboard.recordsLast30}
            unit=""
            note="Últimos 30 días"
          />
        </div>

        <section
          aria-labelledby="heatmap-title"
          className={`${cardClass} animate-rise p-5 sm:p-6 lg:col-span-12`}
          style={stagger(7)}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="heatmap-title" className="font-display text-xl">
              Constancia
            </h2>
            <p className="label-mono text-muted">
              <span className="sm:hidden">Últimas 15 semanas</span>
              <span className="hidden sm:inline">
                Últimas {HEATMAP_WEEKS} semanas
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Heatmap weeks={dashboard.heatmap} />
            <dl className="grid grid-cols-3 gap-4 border-t border-border pt-5 lg:w-56 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              {[
                [
                  Math.round(dashboard.totalSeconds / 60).toLocaleString("es"),
                  "minutos tocados",
                ],
                [String(dashboard.totalDays), "días con práctica"],
                [String(streak.best), "mejor racha"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="font-display text-2xl tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="records-title"
          className="animate-rise lg:col-span-12"
          style={stagger(8)}
        >
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 id="records-title" className="font-display text-xl">
              Últimos récords batidos
            </h2>
            <Link
              href="/ejercicios"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink transition-[gap] hover:gap-2"
            >
              Ver progreso <ArrowRightIcon size={16} />
            </Link>
          </div>
          {dashboard.broken.length === 0 ? (
            <EmptyState title="Tu primer récord está cerca">
              La primera marca de cada ejercicio es tu punto de partida.
              Supérala (limpio o casi, al menos 15 s) y aparecerá aquí.
            </EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboard.broken.map((record, i) => (
                <li
                  key={record.logId}
                  className="animate-rise"
                  style={stagger(9 + i)}
                >
                  <Link
                    href={`/ejercicios/${record.exerciseId}?tramo=${record.tier}`}
                    className={`${cardClass} group flex h-full flex-col gap-3 p-4 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_20px_40px_-24px_rgb(0_0_0/0.4)]`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold">
                        {record.exerciseName}
                      </span>
                      <ArrowUpRightIcon
                        size={18}
                        className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-ink"
                      />
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-3xl tabular-nums">
                        {record.value}
                      </span>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 font-mono text-xs font-semibold text-success">
                        +{record.value - record.previous}
                      </span>
                    </span>
                    <span className="mt-auto flex items-center justify-between text-xs text-muted">
                      <span>
                        {HAND_LABELS[record.hand]} · {tierLabel(record.tier)}
                      </span>
                      <span>{formatShortDay(record.date)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function ChallengeCard({ challenge }: { challenge: Dashboard["challenge"] }) {
  const href = challenge
    ? `/registrar?${new URLSearchParams({
        ejercicio: challenge.exerciseId,
        bpm: String(challenge.targetBpm),
        mano: challenge.hand,
        sub: challenge.subdivision,
      })}`
    : "/registrar";
  return (
    <Link
      href={href}
      className="group relative isolate flex min-h-72 animate-rise flex-col overflow-hidden rounded-[28px] border border-panel-border bg-panel p-6 text-panel-foreground shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-out hover:-translate-y-1 sm:p-8 lg:col-span-7"
      style={stagger(2)}
    >
      <div
        aria-hidden="true"
        className="bg-ticks absolute inset-x-0 top-0 h-2 text-panel-border"
      />
      {/* Péndulo decorativo que oscila al fondo. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 220"
        className="absolute -right-6 -bottom-10 -z-10 h-72 opacity-40 transition-opacity duration-500 group-hover:opacity-70"
      >
        <path
          d="M76 20h48l44 190H32z"
          fill="none"
          stroke="var(--panel-border)"
          strokeWidth="2"
        />
        <g className="origin-[100px_196px] animate-swing">
          <line
            x1="100"
            y1="196"
            x2="100"
            y2="36"
            stroke="var(--panel-muted)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect
            x="88"
            y="80"
            width="24"
            height="16"
            rx="4"
            fill="var(--accent)"
          />
        </g>
      </svg>

      <p className="label-mono flex items-center gap-2 text-panel-muted">
        <span className="size-2 animate-blink rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
        {challenge ? "Siguiente reto" : "Primera sesión"}
      </p>

      {challenge ? (
        <>
          <p className="mt-4 max-w-sm font-display text-2xl leading-tight text-balance sm:text-3xl">
            {challenge.exerciseName}
          </p>
          <div className="mt-auto flex flex-wrap items-end gap-x-6 gap-y-3 pt-8">
            <p className="flex items-baseline gap-2">
              <CountUp
                value={challenge.targetBpm}
                className="font-display text-7xl leading-none tabular-nums sm:text-8xl"
              />
              <span className="label-mono text-panel-muted">BPM</span>
            </p>
            <div className="pb-2 text-sm text-panel-muted">
              {challenge.recordBpm ? (
                <p>
                  Récord {challenge.tier ? tierLabel(challenge.tier) : ""}:{" "}
                  <span className="text-panel-foreground tabular-nums">
                    {challenge.recordBpm}
                  </span>
                </p>
              ) : (
                <p>Aún sin récord: sube un poco el tempo</p>
              )}
              <p>
                {HAND_LABELS[challenge.hand]} ·{" "}
                {SUBDIVISION_LABELS[challenge.subdivision].toLowerCase()}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 max-w-sm font-display text-3xl leading-tight text-balance">
            Abre el metrónomo y toca tu primer rudimento
          </p>
          <p className="mt-3 max-w-sm text-panel-muted">
            Al parar, la serie se anota sola. Esa primera marca será tu punto de
            partida.
          </p>
          <span className="mt-auto" />
        </>
      )}

      <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_30px_-10px_var(--accent)] transition-[gap] duration-300 group-hover:gap-3">
        {challenge ? "Aceptar reto" : "Empezar a practicar"}
        <ArrowRightIcon size={16} />
      </span>
    </Link>
  );
}

function Stat({
  i,
  icon,
  label,
  value,
  unit,
  note,
  hot,
}: {
  i: number;
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  note: string;
  hot?: boolean;
}) {
  return (
    <div
      className={`${cardClass} relative flex animate-rise flex-col justify-between gap-4 overflow-hidden p-4 sm:p-5`}
      style={stagger(i)}
    >
      <p className="label-mono flex items-center justify-between text-muted">
        {label}
        <span
          className={
            hot
              ? "text-accent-ink drop-shadow-[0_0_8px_var(--accent)]"
              : "text-muted"
          }
        >
          {icon}
        </span>
      </p>
      <div>
        <p className="flex items-baseline gap-1.5">
          <CountUp
            value={value}
            delay={i * 0.07}
            className="font-display text-4xl leading-none tabular-nums sm:text-5xl"
          />
          {unit ? <span className="text-sm text-muted">{unit}</span> : null}
        </p>
        <p className="mt-1 text-xs text-muted">{note}</p>
      </div>
    </div>
  );
}
