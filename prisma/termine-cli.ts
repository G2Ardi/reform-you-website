/**
 * Legt Kurstermine fuer die naechsten N Tage an (Standard 28), bereits
 * vorhandene werden uebersprungen. Aufruf: npm run db:termine -- 56
 */
import { PrismaClient } from "@prisma/client";
import { kurstermineAnlegen } from "./termine";

const prisma = new PrismaClient();
const tage = Number(process.argv[2] ?? 28);

kurstermineAnlegen(prisma, Number.isFinite(tage) && tage > 0 ? tage : 28)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
