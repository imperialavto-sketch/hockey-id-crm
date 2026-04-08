/**
 * Dedicated PrismaClient for Arena Chat API routes only.
 * Avoids relying on the global app singleton when it was created before `prisma generate`
 * added `ArenaChat*` models (long-lived `next dev`).
 */

import { PrismaClient } from "@prisma/client";

const globalKey = "__hockeyPrismaArenaChat" as const;

type G = typeof globalThis & { [globalKey]?: PrismaClient };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const arenaChatPrisma: PrismaClient = (() => {
  const g = globalThis as G;
  if (!g[globalKey]) {
    g[globalKey] = createClient();
  }
  return g[globalKey];
})();
