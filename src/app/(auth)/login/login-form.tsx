"use client";

import { useActionState } from "react";
import { Field, PrimaryButton, TextInput } from "@/components/ui";
import { type SignInState, signInAction } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <Field label="Correo" htmlFor="email">
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
        />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </PrimaryButton>
    </form>
  );
}
