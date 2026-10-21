import "server-only";
import { prisma } from "@/lib/prisma";

const MIT_BEZUG = {
  kurs: true,
  standort: true,
  buchungen: true,
} as const;

export async function getKommendeTermineFuerStandort(standortSlug: string) {
  return prisma.kursTermin.findMany({
    where: {
      standort: { slug: standortSlug },
      beginn: { gte: new Date() },
    },
    include: MIT_BEZUG,
    orderBy: { beginn: "asc" },
  });
}

export async function getTerminMitBuchungen(id: string) {
  return prisma.kursTermin.findUnique({
    where: { id },
    include: {
      kurs: true,
      standort: true,
      buchungen: { include: { kunde: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getAlleKommendenTermine() {
  return prisma.kursTermin.findMany({
    where: { beginn: { gte: new Date() } },
    include: MIT_BEZUG,
    orderBy: { beginn: "asc" },
  });
}

export function zaehleGebuchtePlaetze(buchungen: { status: string }[]): number {
  return buchungen.filter((b) => b.status === "GEBUCHT").length;
}

export function freiePlaetze(termin: { kapazitaet: number; buchungen: { status: string }[] }): number {
  return Math.max(0, termin.kapazitaet - zaehleGebuchtePlaetze(termin.buchungen));
}

export function istNochBuchbar(beginn: Date, minutenVorher = 15): boolean {
  const spaetesteBuchung = new Date(beginn.getTime() - minutenVorher * 60_000);
  return new Date() < spaetesteBuchung;
}

/** Umbuchen-Ziele: dasselbe Kursformat (per Slug), an beiden Standorten,
 * weil eine Karte ebenfalls standortübergreifend gilt. */
export async function getUmbuchOptionen(kursSlug: string, ausgeschlosseneTerminId: string) {
  return prisma.kursTermin.findMany({
    where: {
      kurs: { slug: kursSlug },
      status: "AKTIV",
      beginn: { gte: new Date() },
      id: { not: ausgeschlosseneTerminId },
    },
    include: MIT_BEZUG,
    orderBy: { beginn: "asc" },
  });
}

