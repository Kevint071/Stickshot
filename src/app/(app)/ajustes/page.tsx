import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { CountUp } from "@/components/count-up";
import { LogoutIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ShortcutBoard } from "@/components/shortcut-board";
import { SoundSettingsPanel } from "@/components/sound-settings";
import { TempoDial, TempoMeter } from "@/components/tempo-dial";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { buttonClass, cardClass, PageHeader, stagger } from "@/components/ui";
import { getDb } from "@/db";
import { signOutAction } from "@/lib/actions/auth";
import { verifySession } from "@/lib/dal";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { type AccountSummary, getAccountSummary } from "@/server/accounts";
import { getSoundSettings } from "@/server/settings";
import pkg from "../../../../package.json";

const memberFormat = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
});

/** Nº de serie de la ficha: un trozo del id, como la placa de un aparato. */
function serial(userId: string) {
  const hex = userId.replaceAll("-", "").toUpperCase();
  return `SS-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export default async function SettingsPage() {
  const { userId } = await verifySession();
  const db = getDb();
  const [account, session, cookieStore, sound] = await Promise.all([
    getAccountSummary(db, userId),
    auth(),
    cookies(),
    getSoundSettings(db, userId),
  ]);
  const email = account.email ?? session?.user?.email ?? "";
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Ajustes" />

      {/* Numeración con contador CSS: una sección oculta (Teclado en táctil) no salta el número. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 [counter-reset:section] lg:grid-cols-12 lg:gap-5">
        <IdentityPlate
          account={account}
          email={email}
          serialNumber={serial(userId)}
        />

        <section
          aria-labelledby="appearance-title"
          className={`${cardClass} animate-rise p-5 sm:p-6 lg:col-span-7 lg:pointer-coarse:col-span-12`}
          style={stagger(4)}
        >
          <SectionHeading
            id="appearance-title"
            title="Apariencia"
            description="El panel del metrónomo es siempre oscuro, como la carcasa del aparato."
          />
          <ThemeSwitcher current={theme} />
        </section>

        {/* Sin teclado físico los atajos no sirven: solo con puntero fino. */}
        <section
          aria-labelledby="keys-title"
          className={`${cardClass} hidden animate-rise p-5 pointer-fine:block sm:p-6 lg:col-span-5`}
          style={stagger(5)}
        >
          <SectionHeading
            id="keys-title"
            title="Teclado"
            description="Para practicar sin soltar las baquetas."
          />
          <ShortcutBoard />
        </section>

        <section
          aria-labelledby="sound-title"
          className={`${cardClass} animate-rise p-5 sm:p-6 lg:col-span-12`}
          style={stagger(6)}
        >
          <SectionHeading
            id="sound-title"
            title="Sonido"
            description="La caja que suena al ver un patrón y al practicar con él. Toca los golpes de cada kit para oírlos."
          />
          <SoundSettingsPanel initial={sound} />
        </section>

        <section
          aria-labelledby="session-title"
          className={`${cardClass} flex animate-rise flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:col-span-12`}
          style={stagger(7)}
        >
          <SectionHeading
            id="session-title"
            title="Sesión"
            description={
              <>
                Abierta en este navegador como
                <span className="block truncate text-foreground">{email}</span>
              </>
            }
            className="mb-0"
          />
          <form action={signOutAction} className="shrink-0">
            <button
              type="submit"
              className={`${buttonClass.danger} w-full py-3 sm:w-auto`}
            >
              <LogoutIcon size={18} /> Cerrar sesión
            </button>
          </form>
        </section>

        <footer
          className="mt-4 flex animate-fade flex-col items-center gap-3 text-muted lg:col-span-12"
          style={stagger(8)}
        >
          <div
            aria-hidden="true"
            className="bg-ticks h-2 w-40 text-border-strong mask-[linear-gradient(90deg,transparent,#000_30%,#000_70%,transparent)]"
          />
          <p className="flex items-center gap-3 text-sm">
            <Logo className="text-foreground" />
            <span className="font-mono text-xs">v{pkg.version}</span>
          </p>
          <p className="label-mono text-center">Hecho para tocar a tempo</p>
        </footer>
      </div>
    </>
  );
}

function IdentityPlate({
  account,
  email,
  serialNumber,
}: {
  account: AccountSummary;
  email: string;
  serialNumber: string;
}) {
  const handle = email.split("@")[0] || "Músico";
  const minutes = Math.round(account.seconds / 60);
  const played =
    minutes < 60
      ? { value: minutes, unit: "min" }
      : { value: Math.round(minutes / 60), unit: "h" };
  const readouts = [
    { label: "Tocado", ...played },
    { label: "Días", value: account.days, unit: "" },
    { label: "Registros", value: account.logs, unit: "" },
    { label: "Ejercicios", value: account.exercises, unit: "" },
  ];

  return (
    <section
      aria-label="Tu ficha"
      className="relative isolate animate-rise overflow-hidden rounded-[28px] border border-panel-border bg-panel p-5 text-panel-foreground shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)] sm:p-8 lg:col-span-12"
      style={stagger(2)}
    >
      <div
        aria-hidden="true"
        className="bg-ticks absolute inset-x-0 top-0 h-2 text-panel-border"
      />
      {/* Halo del LED detrás del monograma. */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -left-24 -z-10 size-80 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="label-mono flex items-center justify-between gap-3 text-panel-muted">
        <span className="flex items-center gap-2">
          <span className="size-2 animate-blink rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          Ficha del músico
        </span>
        <span className="tabular-nums">Nº {serialNumber}</span>
      </div>

      <div className="mt-5 grid gap-6 sm:mt-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-12">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span className="relative grid size-14 shrink-0 animate-pop place-items-center rounded-2xl bg-accent font-display text-2xl text-accent-foreground uppercase shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_12px_36px_-10px_var(--accent)] sm:size-20 sm:text-4xl">
            {handle[0]}
            <span
              aria-hidden="true"
              className="absolute -right-1 -bottom-1 size-4 rounded-full border-[3px] border-panel bg-success"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-2xl leading-tight sm:text-4xl">
              {handle}
            </p>
            {account.memberSince ? (
              <p className="mt-1 text-sm text-panel-muted">
                En el atril desde{" "}
                <span className="text-panel-foreground">
                  {memberFormat.format(account.memberSince)}
                </span>
              </p>
            ) : (
              <p className="mt-1 truncate text-sm text-panel-muted">{email}</p>
            )}
          </div>
        </div>

        <div className="sm:hidden">
          <TempoMeter seconds={account.seconds} />
        </div>
        <div className="hidden sm:block lg:row-span-2 lg:self-center">
          <TempoDial seconds={account.seconds} />
        </div>

        <dl className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-2xl border border-panel-border bg-panel-border sm:grid-cols-4">
          {readouts.map(({ label, value, unit }, i) => (
            <div
              key={label}
              className="flex flex-col-reverse gap-1 bg-panel-2 px-4 py-3 sm:py-3.5"
            >
              <dt className="label-mono text-panel-muted">{label}</dt>
              <dd className="flex items-baseline gap-1">
                <CountUp
                  value={value}
                  delay={0.2 + i * 0.07}
                  className="font-display text-2xl leading-none tabular-nums sm:text-3xl"
                />
                {unit ? (
                  <span className="text-sm text-panel-muted">{unit}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SectionHeading({
  id,
  title,
  description,
  className = "mb-5",
}: {
  id: string;
  title: string;
  description: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <h2 id={id} className="flex items-baseline gap-3 font-display text-xl">
        <span
          aria-hidden="true"
          className="label-mono text-accent-ink [counter-increment:section] before:content-[counter(section,decimal-leading-zero)]"
        />
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted text-pretty">{description}</p>
    </div>
  );
}
