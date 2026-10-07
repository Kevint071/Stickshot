import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Los tests de integración arrancan Postgres (PGlite, WASM) por archivo y
    // hashean con scrypt real; en paralelo pueden tardar más de los 5 s por defecto.
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
