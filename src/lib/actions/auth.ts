"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getDb } from "@/db";
import { type FieldErrors, registerUser } from "@/server/accounts";

export type SignUpState = { errors?: FieldErrors; email?: string };
export type SignInState = { error?: string; email?: string };

function credentialsFrom(formData: FormData) {
  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const credentials = credentialsFrom(formData);
  const result = await registerUser(getDb(), credentials);
  if (!result.ok) return { errors: result.errors, email: credentials.email };
  // Lanza la redirección a inicio con la sesión ya iniciada.
  await signIn("credentials", { ...credentials, redirectTo: "/" });
  return {};
}

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const credentials = credentialsFrom(formData);
  try {
    await signIn("credentials", { ...credentials, redirectTo: "/" });
    return {};
  } catch (error) {
    // Mismo mensaje para correo inexistente y contraseña errónea.
    if (error instanceof AuthError) {
      return {
        error: "Correo o contraseña incorrectos",
        email: credentials.email,
      };
    }
    throw error; // La redirección de Next viaja como excepción.
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
