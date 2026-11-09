import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Schlanker Server fuer den Betrieb im eigenen Rechenzentrum (Docker), siehe
  // BETRIEB.md. Auf Vercel hat die Einstellung keine Wirkung.
  output: "standalone",
  // Feste Projektwurzel, damit der Standalone-Server immer unter
  // .next/standalone/server.js liegt, auch wenn ueber dem Projekt weitere
  // Lockfiles liegen.
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
