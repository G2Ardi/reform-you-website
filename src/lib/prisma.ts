import { PrismaClient } from "@prisma/client";

/**
 * Singleton-Client, der in der Next.js-Entwicklungsumgebung nicht bei jedem
 * Hot-Reload neu aufgebaut wird. Siehe
 * https://www.prisma.io/docs/guides/nextjs
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
