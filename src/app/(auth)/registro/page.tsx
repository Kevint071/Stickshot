import Link from "next/link";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Crear cuenta</h1>
      <SignUpForm />
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
