import Link from "next/link";
import { HeroDevice } from "@/components/hero-device";
import { Logo } from "@/components/logo";

/**
 * Móvil: solo el formulario. Escritorio: el aparato en marcha a la izquierda,
 * sobre un panel oscuro, y el formulario a la derecha.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-panel p-10 text-panel-foreground lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="bg-ticks absolute inset-x-0 top-0 h-3 text-panel-border"
        />
        <Link href="/" className="animate-fade self-start text-lg">
          <Logo />
        </Link>
        <div className="mx-auto w-full max-w-md space-y-10">
          <p className="animate-rise font-display text-4xl leading-[1.02] text-balance">
            Terminas el ejercicio, lo anotas y{" "}
            <span className="text-accent">sigues tocando.</span>
          </p>
          <div className="animate-rise" style={{ animationDelay: "120ms" }}>
            <HeroDevice />
          </div>
        </div>
        <p className="text-sm text-panel-muted">
          Tus datos son solo tuyos: nadie más ve tus días ni tus registros.
        </p>
      </aside>

      <main className="relative flex flex-col px-4 py-6 sm:px-8 lg:justify-center lg:py-10">
        <Link href="/" className="animate-fade self-start text-lg lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-sm py-12 lg:my-0">
          {children}
        </div>
      </main>
    </div>
  );
}
