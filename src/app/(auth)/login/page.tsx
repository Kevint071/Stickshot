import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <LoginForm />
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-accent">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
