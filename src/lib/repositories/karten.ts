import "server-only";
import { prisma } from "@/lib/prisma";
import { CREDITS_KATALOG, GUTHABEN_LAUFZEIT_MONATE, type KaufbareCredits } from "@/lib/credits";

/**
 * Credits ("Karten" in der Datenbank). Feste, von Janina bestaetigte Werte
 * stehen in src/lib/credits.ts.
 *
 * WICHTIG, ausdrueckliche Vorgabe: Credits gehoeren dem Kunden, nicht einem
 * Standort, und sind an beiden Standorten einloesbar. Das Karte-Modell hat
 * deshalb bewusst keinen standortId.
 */

export const KARTEN_KATALOG = CREDITS_KATALOG;

export async function getAktiveKartenFuerKunde(kundeId: string) {
  return prisma.karte.findMany({
    where: {
      kundeId,
      einheitenRest: { gt: 0 },
      gueltigBis: { gte: new Date() },
    },
    orderBy: { gueltigBis: "asc" },
  });
}

export async function getAlleKartenFuerKunde(kundeId: string) {
  return prisma.karte.findMany({ where: { kundeId }, orderBy: { gekauftAm: "desc" } });
}

/** Legt neue Credits an. Die Laufzeit beginnt mit dem Kauf. */
export async function kaufeKarte(kundeId: string, typ: KaufbareCredits, notiz?: string) {
  const vorlage = KARTEN_KATALOG[typ];
  const gueltigBis = new Date();
  gueltigBis.setMonth(gueltigBis.getMonth() + vorlage.laufzeitMonate);

  return prisma.karte.create({
    data: {
      kundeId,
      typ,
      einheitenGesamt: vorlage.einheiten,
      einheitenRest: vorlage.einheiten,
      gueltigBis,
      notiz: notiz ?? null,
    },
  });
}

/**
 * Manuelle Kulanz-Gutschrift durch die Inhaberin (Admin), unabhaengig von
 * den normalen Buchungsregeln. Erzeugt Guthaben mit frei waehlbarer
 * Einheitenzahl.
 */
export async function erstelleKulanzGuthaben(
  kundeId: string,
  einheiten: number,
  notiz: string,
  gueltigkeitsMonate = GUTHABEN_LAUFZEIT_MONATE,
) {
  const gueltigBis = new Date();
  gueltigBis.setMonth(gueltigBis.getMonth() + gueltigkeitsMonate);

  return prisma.karte.create({
    data: {
      kundeId,
      typ: "GUTHABEN",
      einheitenGesamt: einheiten,
      einheitenRest: einheiten,
      gueltigBis,
      notiz,
    },
  });
}
