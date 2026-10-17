import {
  CalendarIcon,
  ChartIcon,
  HomeIcon,
  MetronomeIcon,
  SettingsIcon,
} from "./icons";

export const PRACTICE_ITEM = {
  href: "/registrar",
  label: "Practicar",
  icon: MetronomeIcon,
} as const;

export const NAV_ITEMS = [
  { href: "/inicio", label: "Inicio", icon: HomeIcon },
  { href: "/historial", label: "Historial", icon: CalendarIcon },
  { href: "/ejercicios", label: "Ejercicios", icon: ChartIcon },
  { href: "/ajustes", label: "Ajustes", icon: SettingsIcon },
] as const;

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
