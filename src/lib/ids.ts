const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita mandar a Postgres un id de URL mal formado (fallaría al convertirlo a uuid). */
export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}
