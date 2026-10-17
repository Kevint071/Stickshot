import Link from "next/link";
import { stagger } from "@/components/ui";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="label-mono animate-rise text-accent-ink">
          Bienvenido de vuelta
        </p>
        <h1
          className="animate-rise font-display text-4xl leading-none"
          style={stagger(1)}
        >
          Iniciar sesión
        </h1>
        <p className="animate-rise text-muted" style={stagger(2)}>
          Tu metrónomo y tus récords te esperan.
        </p>
      </div>
      <div className="animate-rise" style={stagger(3)}>
        <LoginForm />
      </div>
      <p
        className="animate-rise border-t border-border pt-6 text-sm text-muted"
        style={stagger(4)}
      >
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-accent-ink underline-offset-4 hover:underline"
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
