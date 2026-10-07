import { cookies } from "next/headers";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { signOutAction } from "@/lib/actions/auth";
import { verifySession } from "@/lib/dal";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default async function SettingsPage() {
  await verifySession();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      <ThemeSwitcher current={theme} />
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-xl border border-border py-3 font-medium text-danger"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
