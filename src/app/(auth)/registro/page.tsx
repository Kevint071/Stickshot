import Link from "next/link";
import { stagger } from "@/components/ui";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="label-mono animate-rise text-accent-ink">
          Empieza en 10 segundos
        </p>
        <h1
          className="animate-rise font-display text-4xl leading-none"
          style={stagger(1)}
        >
          Crear cuenta
        </h1>
        <p className="animate-rise text-muted" style={stagger(2)}>
          Solo necesitas un correo y una contraseña.
        </p>
      </div>
      <div className="animate-rise" style={stagger(3)}>
        <SignUpForm />
      </div>
      <p
        className="animate-rise border-t border-border pt-6 text-sm text-muted"
        style={stagger(4)}
      >
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-accent-ink underline-offset-4 hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
