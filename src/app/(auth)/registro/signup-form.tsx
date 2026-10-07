"use client";

import { useActionState } from "react";
import { Field, PrimaryButton, TextInput } from "@/components/ui";
import { type SignUpState, signUpAction } from "@/lib/actions/auth";

export function SignUpForm() {
  const [state, action, pending] = useActionState<SignUpState, FormData>(
    signUpAction,
    {},
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Correo" htmlFor="email" errors={state.errors?.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          invalid={Boolean(state.errors?.email)}
        />
      </Field>
      <Field
        label="Contraseña (mínimo 8 caracteres)"
        htmlFor="password"
        errors={state.errors?.password}
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          invalid={Boolean(state.errors?.password)}
        />
      </Field>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </PrimaryButton>
    </form>
  );
}
