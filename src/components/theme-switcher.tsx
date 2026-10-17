"use client";

import { motion } from "motion/react";
import {
  useId,
  useOptimistic,
  useSyncExternalStore,
  useTransition,
} from "react";
import { setTheme } from "@/lib/actions/theme";
import { THEMES, type Theme, themeAttribute } from "@/lib/theme";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "./icons";

const options: Record<Theme, { label: string; icon: typeof SunIcon }> = {
  system: { label: "Sistema", icon: MonitorIcon },
  light: { label: "Claro", icon: SunIcon },
  dark: { label: "Oscuro", icon: MoonIcon },
};

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Esquema del sistema operativo ahora mismo; null en el servidor. */
function useSystemScheme() {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(DARK_QUERY).matches ? "oscuro" : "claro"),
    () => null,
  );
}

export function ThemeSwitcher({ current }: { current: Theme }) {
  const name = useId();
  const [optimistic, setOptimistic] = useOptimistic(current);
  const [, startTransition] = useTransition();
  const system = useSystemScheme();

  function choose(theme: Theme) {
    // Aplica el tema al instante; la cookie se guarda en segundo plano.
    const attribute = themeAttribute(theme);
    if (attribute) document.documentElement.dataset.theme = attribute;
    else delete document.documentElement.dataset.theme;
    startTransition(async () => {
      setOptimistic(theme);
      await setTheme(theme);
    });
  }

  return (
    <fieldset>
      <legend className="sr-only">Tema</legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {THEMES.map((theme) => {
          const { label, icon: Icon } = options[theme];
          const checked = optimistic === theme;
          return (
            <label
              key={theme}
              className="group relative cursor-pointer rounded-2xl p-1.5 select-none has-focus-visible:ring-2 has-focus-visible:ring-accent"
            >
              {checked ? (
                <motion.span
                  layoutId={`${name}-ring`}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute inset-0 rounded-2xl border-2 border-accent bg-accent/5 shadow-[0_10px_30px_-18px_var(--accent)]"
                />
              ) : null}
              <input
                type="radio"
                name={name}
                value={theme}
                checked={checked}
                onChange={() => choose(theme)}
                className="sr-only"
              />
              <span
                className={`relative block aspect-4/3 overflow-hidden rounded-xl border border-border transition-transform duration-300 ease-out group-hover:-translate-y-0.5 ${
                  checked ? "" : "group-hover:border-border-strong"
                }`}
              >
                {theme === "system" ? (
                  <>
                    <Preview scheme="light" />
                    <Preview
                      scheme="dark"
                      className="[clip-path:polygon(100%_0,100%_100%,0_100%)]"
                    />
                  </>
                ) : (
                  <Preview scheme={theme} />
                )}
              </span>
              <span className="relative mt-2 flex items-center justify-center gap-1 px-1 pb-0.5 sm:justify-between">
                <span
                  className={`flex min-w-0 items-center gap-1.5 text-sm transition-colors ${
                    checked
                      ? "font-semibold text-foreground"
                      : "text-muted group-hover:text-foreground"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                </span>
                <span
                  className={`hidden size-4.5 shrink-0 place-items-center sm:grid rounded-full border transition-colors duration-200 ${
                    checked
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border-strong"
                  }`}
                >
                  {checked ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 700,
                        damping: 22,
                      }}
                    >
                      <CheckIcon size={12} strokeWidth={3} />
                    </motion.span>
                  ) : null}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p
        aria-live="polite"
        className="mt-4 flex items-center gap-2 text-sm text-muted"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
        {optimistic === "system"
          ? system
            ? `Sigue a tu sistema, que ahora está en modo ${system}.`
            : "Sigue al modo claro u oscuro de tu sistema."
          : `Siempre en modo ${options[optimistic].label.toLowerCase()} en este navegador.`}
      </p>
    </fieldset>
  );
}

/**
 * Miniatura de la app pintada con los tokens reales; data-scheme los resuelve
 * en el tema de la muestra, no en el activo (ver globals.css).
 */
function Preview({
  scheme,
  className,
}: {
  scheme: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-scheme={scheme}
      className={`absolute inset-0 flex bg-background ${className ?? ""}`}
    >
      <span className="flex w-[28%] flex-col gap-0.75 border-r border-border bg-surface p-[6%]">
        <span className="h-1.25 rounded-xs bg-accent" />
        <span className="mt-0.75 h-0.75 w-3/4 rounded-full bg-foreground/50" />
        <span className="h-0.75 w-2/3 rounded-full bg-foreground/20" />
        <span className="h-0.75 w-3/4 rounded-full bg-foreground/20" />
      </span>
      <span className="flex flex-1 flex-col gap-1 p-[6%]">
        <span className="h-1.25 w-1/2 rounded-full bg-foreground/80" />
        <span className="flex flex-1 items-end gap-1">
          <span className="relative h-full flex-3 rounded-sm bg-panel">
            <span className="absolute top-1.25 left-1.25 size-1 rounded-full bg-accent shadow-[0_0_4px_var(--accent)]" />
            <span className="absolute bottom-1.25 left-1.25 h-1.5 w-1/3 rounded-xs bg-panel-foreground/80" />
          </span>
          <span className="flex h-full flex-2 flex-col gap-0.75">
            <span className="flex-1 rounded-sm border border-border bg-surface" />
            <span className="flex-1 rounded-sm border border-border bg-surface" />
          </span>
        </span>
        <span className="grid grid-cols-7 gap-0.5">
          {[0, 2, 3, 1, 4, 2, 0, 1, 3, 4, 2, 0, 3, 4].map((level, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: patrón fijo de muestra.
              key={i}
              className={`aspect-square rounded-[1px] ${HEAT[level]}`}
            />
          ))}
        </span>
      </span>
    </span>
  );
}

const HEAT = [
  "bg-surface-2",
  "bg-accent/25",
  "bg-accent/50",
  "bg-accent/75",
  "bg-accent",
] as const;
