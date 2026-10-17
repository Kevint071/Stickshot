import "server-only";
import { cookies } from "next/headers";
import { dateInZone } from "@/lib/stats";

/** Cookie con la zona horaria IANA del dispositivo; la escribe <TimezoneSync />. */
export const TZ_COOKIE = "tz";

/** Fecha de hoy en el calendario del usuario (UTC hasta conocer su zona). */
export async function userToday() {
  const zone = (await cookies()).get(TZ_COOKIE)?.value;
  return dateInZone(new Date(), zone ? decodeURIComponent(zone) : undefined);
}
