export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "theme";

export function parseTheme(value: string | undefined): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : "system";
}

/** Valor de data-theme en <html>; "system" no fija atributo y deja decidir al CSS. */
export function themeAttribute(theme: Theme): "light" | "dark" | undefined {
  return theme === "system" ? undefined : theme;
}
