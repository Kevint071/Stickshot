import {
  randomBytes,
  type ScryptOptions,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

// Parámetros recomendados por OWASP para scrypt (N=2^17, r=8, p=1).
const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
// scrypt necesita 128 * N * r bytes; se deja margen sobre el límite por defecto (32 MB).
const MAX_MEM = 256 * 1024 * 1024;

function derive(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** Devuelve `scrypt$N$r$p$sal$hash` (sal y hash en base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, { N, r: R, p: P, maxmem: MAX_MEM });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algorithm !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await derive(password, Buffer.from(saltB64, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEM,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
