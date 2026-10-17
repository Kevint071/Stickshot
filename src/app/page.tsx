import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth, HOME_PATH } from "@/auth";
import { HeroDevice } from "@/components/hero-device";
import { ArrowRightIcon, MetronomeIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { RecordChartPreview } from "@/components/record-preview";
import { Reveal } from "@/components/reveal";
import { buttonClass } from "@/components/ui";

const RUDIMENTS = [
  "Single Stroke Roll",
  "Double Stroke Open Roll",
  "Single Paradiddle",
  "Flam Tap",
  "Five Stroke Roll",
  "Paradiddle-Diddle",
  "Flamacue",
  "Swiss Army Triplet",
  "Single Ratamacue",
  "Pataflafla",
  "Drag Paradiddle #1",
  "Lesson 25",
  "Triple Stroke Roll",
  "Flam Accent",
  "Single Dragadiddle",
  "Double Ratamacue",
];

// Mapa de ejemplo de 15 semanas: determinista y cada vez más constante.
const HEAT = Array.from({ length: 15 * 7 }, (_, n) => {
  const week = Math.floor(n / 7);
  const noise = (n * 37) % 11;
  if (noise < 4 - Math.floor(week / 5)) return 0;
  return Math.min(4, 1 + ((n * 7 + week) % 3) + Math.floor(week / 6));
});
const HEAT_CLASS = [
  "bg-surface-2",
  "bg-accent/25",
  "bg-accent/50",
  "bg-accent/75",
  "bg-accent",
];

const i = (n: number) => ({ "--i": n }) as CSSProperties;

export default async function LandingPage() {
  // El proxy ya redirige con sesión; esto cubre la navegación del cliente.
  if ((await auth())?.user) redirect(HOME_PATH);

  return (
    <div className="relative overflow-x-clip">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl animate-fade items-center gap-4 rounded-2xl border border-border/70 bg-background/75 pr-2 pl-4 backdrop-blur-xl">
          <Link href="/" className="text-lg">
            <Logo />
          </Link>
          <nav aria-label="Cuenta" className="ml-auto flex items-center gap-1">
            <Link
              href="/login"
              className={`${buttonClass.ghost} whitespace-nowrap`}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className={`${buttonClass.primary} whitespace-nowrap`}
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10 lg:pt-24 lg:pb-28">
          <div>
            <p className="label-mono inline-flex animate-rise items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-muted">
              <span className="size-1.5 animate-blink rounded-full bg-accent" />
              Metrónomo · Registro · Récords
            </p>
            <h1
              className="mt-6 animate-rise font-display text-[2.75rem] leading-[0.95] text-balance sm:text-6xl lg:text-7xl"
              style={i(1)}
            >
              Toca. Anota.{" "}
              <span className="text-accent-ink">
                Supera tu{" "}
                <span className="relative inline-block">
                  tempo.
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                    className="absolute -bottom-2 left-0 h-3 w-full"
                  >
                    <path
                      d="M2 8 Q 75 2 150 6 T 298 4"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray="1"
                      className="animate-draw"
                      style={{ animationDelay: "0.7s" }}
                    />
                  </svg>
                </span>
              </span>
            </h1>
            <p
              className="mt-8 max-w-lg animate-rise text-lg text-muted text-pretty sm:text-xl"
              style={i(2)}
            >
              El compañero de práctica para tus rudimentos: un metrónomo que
              anota cada serie por ti, récords por mano que se calculan solos y
              un reto nuevo cada vez que te sientas al pad.
            </p>
            <div
              className="mt-10 flex animate-rise flex-wrap items-center gap-3"
              style={i(3)}
            >
              <Link
                href="/registro"
                className={`${buttonClass.primary} group px-6 py-3.5 text-base`}
              >
                Empieza ahora
                <ArrowRightIcon
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/login"
                className={`${buttonClass.secondary} px-6 py-3.5 text-base`}
              >
                Ya tengo cuenta
              </Link>
            </div>
            <dl
              className="mt-12 grid max-w-md animate-rise grid-cols-3 gap-6 border-t border-border pt-6"
              style={i(4)}
            >
              {[
                ["40", "rudimentos PAS"],
                ["6", "tramos de récord"],
                ["2", "manos, por separado"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-3xl">{value}</dd>
                  <dd className="mt-1 text-xs text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="animate-rise lg:pl-6" style={i(2)}>
            <HeroDevice />
          </div>
        </section>

        {/* Cinta de rudimentos */}
        <div
          aria-hidden="true"
          className="relative -rotate-1 border-y border-panel-border bg-panel py-4 text-panel-foreground"
        >
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
            {[...RUDIMENTS, ...RUDIMENTS].map((name, n) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: la lista se duplica para el bucle.
                key={n}
                className="flex items-center gap-10 font-display text-xl"
              >
                {name}
                <span className="size-2 rounded-full bg-accent" />
              </span>
            ))}
          </div>
        </div>

        {/* Funciones */}
        <section
          aria-labelledby="features"
          className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32"
        >
          <Reveal className="max-w-2xl">
            <p className="label-mono text-accent-ink">Cómo funciona</p>
            <h2
              id="features"
              className="mt-3 font-display text-4xl leading-[1.02] text-balance sm:text-5xl"
            >
              Del pad al progreso sin escribir casi nada.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-6 lg:gap-5">
            <Reveal className="lg:col-span-4">
              <article className="relative flex h-full min-h-80 flex-col overflow-hidden rounded-[28px] border border-panel-border bg-panel p-7 text-panel-foreground sm:p-9">
                <span className="font-mono text-sm text-accent">01</span>
                <h3 className="mt-3 max-w-md font-display text-3xl leading-tight">
                  Un metrónomo que anota por ti
                </h3>
                <p className="mt-3 max-w-md text-panel-muted">
                  Dale a empezar, toca y para. El tempo, la duración y el número
                  de series pasan solos al registro. Tú solo dices qué tan
                  limpio salió.
                </p>
                <ul className="mt-auto flex flex-wrap gap-2 pt-8">
                  {["1:00 · 120", "1:02 · 124", "1:00 · 128", "0:58 · 132"].map(
                    (chip, n) => (
                      <li
                        key={chip}
                        className="animate-pop rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 font-mono text-sm tabular-nums"
                        style={{ animationDelay: `${0.6 + n * 0.25}s` }}
                      >
                        {chip}
                      </li>
                    ),
                  )}
                </ul>
              </article>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-2">
              <article className="flex h-full flex-col rounded-[28px] border border-border bg-surface p-7 sm:p-9">
                <span className="font-mono text-sm text-accent-ink">02</span>
                <h3 className="mt-3 font-display text-2xl leading-tight">
                  Retos a tu medida
                </h3>
                <p className="mt-3 text-muted">
                  Al abrir la app te propone tu siguiente tempo: un 3 % por
                  encima de tu récord.
                </p>
                <p className="mt-auto pt-8">
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-[0_10px_30px_-10px_var(--accent)]">
                    <MetronomeIcon size={16} /> Reto: 136 BPM
                  </span>
                </p>
              </article>
            </Reveal>

            <Reveal delay={0.05} className="lg:col-span-3">
              <article className="flex h-full flex-col rounded-[28px] border border-border bg-surface p-7 sm:p-9">
                <span className="font-mono text-sm text-accent-ink">03</span>
                <h3 className="mt-3 font-display text-2xl leading-tight">
                  Récords por mano y por tramo
                </h3>
                <p className="mt-3 text-muted">
                  Derecha e izquierda por separado, en 15 s, 30 s, 1, 2, 3 y 5
                  minutos. La primera marca es tu punto de partida.
                </p>
                <RecordChartPreview className="mt-auto pt-8" />
              </article>
            </Reveal>

            <Reveal delay={0.15} className="lg:col-span-3">
              <article className="flex h-full flex-col rounded-[28px] border border-border bg-surface p-7 sm:p-9">
                <span className="font-mono text-sm text-accent-ink">04</span>
                <h3 className="mt-3 font-display text-2xl leading-tight">
                  Constancia a la vista
                </h3>
                <p className="mt-3 text-muted">
                  Racha de días, minutos de la semana y un mapa de todo lo que
                  has tocado. Ver la cadena da ganas de no romperla.
                </p>
                <div className="mt-auto grid auto-cols-fr grid-flow-col grid-rows-7 gap-1 pt-8">
                  {HEAT.map((level, n) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: mapa de ejemplo fijo.
                      key={n}
                      className={`aspect-square animate-pop rounded-[3px] ${HEAT_CLASS[level]}`}
                      style={{ animationDelay: `${0.2 + n * 0.008}s` }}
                    />
                  ))}
                </div>
              </article>
            </Reveal>
          </div>
        </section>

        {/* Llamada final */}
        <section className="px-3 pb-3 sm:px-6 sm:pb-6">
          <Reveal>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-4xl bg-accent px-6 py-16 text-accent-foreground sm:px-12 sm:py-24">
              <div
                aria-hidden="true"
                className="bg-ticks absolute inset-x-0 bottom-0 h-6 opacity-20"
              />
              <p className="label-mono opacity-70">Tus datos son solo tuyos</p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[0.98] text-balance sm:text-6xl">
                Tu próximo récord empieza con un clic.
              </h2>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/registro"
                  className="group inline-flex items-center gap-2 rounded-xl bg-accent-foreground px-6 py-3.5 font-semibold text-accent transition-transform active:scale-95"
                >
                  Crear cuenta
                  <ArrowRightIcon
                    size={18}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-accent-foreground/30 px-6 py-3.5 font-medium transition-colors hover:bg-accent-foreground/10"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted sm:px-6">
        <Logo className="text-foreground" />
        <span>Hecho para practicar con el teléfono al lado del pad.</span>
      </footer>
    </div>
  );
}
