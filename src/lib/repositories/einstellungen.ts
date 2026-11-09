import "server-only";
import { prisma } from "@/lib/prisma";
import type { Einstellung } from "@prisma/client";

/**
 * Singleton-Einstellungen (Fristen, Willkommenscode), im Admin-Bereich
 * änderbar statt hart codiert.
 */

const STANDARD = {
  erinnerungStundenVorher: 36,
  stornoFristStunden: 24,
  willkommenscodeAktiv: true,
  willkommenscodeMonate: 3,
};

export async function getEinstellungen(): Promise<Einstellung> {
  const bestehend = await prisma.einstellung.findUnique({ where: { id: 1 } });
  if (bestehend) return bestehend;
  return prisma.einstellung.create({ data: { id: 1, ...STANDARD } });
}

export async function updateEinstellungen(werte: {
  erinnerungStundenVorher: number;
  stornoFristStunden: number;
  willkommenscodeAktiv: boolean;
  willkommenscodeMonate: number;
}): Promise<Einstellung> {
  return prisma.einstellung.upsert({
    where: { id: 1 },
    update: werte,
    create: { id: 1, ...werte },
  });
}
