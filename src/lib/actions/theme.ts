"use server";

import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setTheme(value: string) {
  const theme = parseTheme(value);
  (await cookies()).set(THEME_COOKIE, theme, {
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
  });
}
