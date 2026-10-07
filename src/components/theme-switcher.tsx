"use client";

import { useOptimistic, useTransition } from "react";
import { setTheme } from "@/lib/actions/theme";
import { THEMES, type Theme, themeAttribute } from "@/lib/theme";

const labels: Record<Theme, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
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
      <legend className="mb-2 text-sm text-muted">Tema</legend>
      <div className="grid grid-cols-3 rounded-xl border border-border bg-surface p-1">
        {THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            aria-pressed={optimistic === theme}
            onClick={() => choose(theme)}
            className={`rounded-lg py-2 text-sm ${
              optimistic === theme
                ? "bg-accent font-semibold text-accent-foreground"
                : "text-foreground"
            }`}
          >
            {labels[theme]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
