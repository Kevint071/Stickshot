"use client";

import { motion } from "motion/react";
import { useOptimistic, useTransition } from "react";
import { setTheme } from "@/lib/actions/theme";
import { THEMES, type Theme, themeAttribute } from "@/lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const options: Record<Theme, { label: string; icon: typeof SunIcon }> = {
  system: { label: "Sistema", icon: MonitorIcon },
  light: { label: "Claro", icon: SunIcon },
  dark: { label: "Oscuro", icon: MoonIcon },
};

export function ThemeSwitcher({ current }: { current: Theme }) {
  const [optimistic, setOptimistic] = useOptimistic(current);
  const [, startTransition] = useTransition();

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
      <legend className="label-mono mb-2 text-muted">Tema</legend>
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface-2/60 p-1">
        {THEMES.map((theme) => {
          const { label, icon: Icon } = options[theme];
          const active = optimistic === theme;
          return (
            <button
              key={theme}
              type="button"
              aria-pressed={active}
              onClick={() => choose(theme)}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl py-3 text-sm transition-colors ${
                active
                  ? "font-semibold text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="theme-thumb"
                  transition={{ type: "spring", stiffness: 600, damping: 40 }}
                  className="absolute inset-0 rounded-xl border border-border bg-surface shadow-[0_6px_16px_-10px_rgb(0_0_0/0.4)]"
                />
              ) : null}
              <motion.span
                className="relative"
                animate={
                  active ? { rotate: [0, -20, 0], scale: [1, 1.2, 1] } : {}
                }
                transition={{ duration: 0.5 }}
              >
                <Icon />
              </motion.span>
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
