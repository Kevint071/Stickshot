"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const COOKIE = "tz";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Guarda la zona horaria del dispositivo en una cookie para que el servidor
 * calcule "hoy" (racha, semana, mapa) con el calendario del usuario.
 */
export function TimezoneSync() {
  const router = useRouter();
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    const value = encodeURIComponent(zone);
    const current = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1);
    if (current === value) return;
    // biome-ignore lint/suspicious/noDocumentCookie: cookie simple, sin Cookie Store API en Safari.
    document.cookie = `${COOKIE}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
