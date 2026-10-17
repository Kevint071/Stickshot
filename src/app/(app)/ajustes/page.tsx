import { cookies } from "next/headers";
import { auth } from "@/auth";
import { LogoutIcon } from "@/components/icons";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { buttonClass, cardClass, PageHeader, stagger } from "@/components/ui";
import { signOutAction } from "@/lib/actions/auth";
import { verifySession } from "@/lib/dal";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default async function SettingsPage() {
  await verifySession();
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);
  const email = session?.user?.email;

  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Ajustes" />
      <div className="max-w-xl space-y-4">
        <section
          className={`${cardClass} animate-rise p-5 sm:p-6`}
          style={stagger(2)}
        >
          <ThemeSwitcher current={theme} />
        </section>

        <section
          className={`${cardClass} animate-rise p-5 sm:p-6`}
          style={stagger(3)}
        >
          <p className="label-mono text-muted">Sesión</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-display text-lg text-accent-foreground uppercase">
                {email?.[0] ?? "?"}
              </span>
              <span className="truncate text-sm">{email}</span>
            </div>
            <form action={signOutAction}>
              <button type="submit" className={buttonClass.danger}>
                <LogoutIcon size={18} /> Cerrar sesión
              </button>
            </form>
          </div>
        </section>

        <section
          className={`${cardClass} animate-rise p-5 text-sm text-muted sm:p-6`}
          style={stagger(4)}
        >
          <p className="label-mono mb-2">Atajos de teclado</p>
          <ul className="space-y-1.5">
            <li>
              <Kbd>P</Kbd> abre Practicar desde cualquier pantalla
            </li>
            <li>
              <Kbd>Espacio</Kbd> arranca o para el metrónomo
            </li>
            <li>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> cambian el tempo (con Mayús, de 5 en 5)
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </kbd>
  );
}
