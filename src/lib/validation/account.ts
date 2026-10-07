import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Introduce un correo válido" }));

export const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, { error: "La contraseña debe tener al menos 8 caracteres" })
    .max(128, { error: "La contraseña no puede superar 128 caracteres" }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
