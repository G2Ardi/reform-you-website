import "server-only";
import { prisma } from "@/lib/prisma";
import type { KartenTyp } from "@prisma/client";

/**
 * Katalog der beiden Guthabenkarten. Feste, von Janina bestätigte Werte
 * (siehe Fragenkatalog Antworten, Abschnitt 5), deshalb als Konstante statt
 * als DB-Tabelle: es gibt nur genau diese zwei Produkte.
 *
 * WICHTIG, ausdrückliche Vorgabe: Karten gehören dem Kunden, nicht einem
 * Standort, und sind an beiden Standorten einlösbar. Das Karte-Modell hat
 * deshalb bewusst keinen standortId.
 */
export const KARTEN_KATALOG: Record<
  Exclude<KartenTyp, "GUTHABEN">,
  { label: string; einheiten: number; preisCent: number; laufzeitMonate: number }
> = {
  FUENFER: { label: "5er-Karte", einheiten: 5, preisCent: 12000, laufzeitMonate: 3 },
  ZEHNER: { label: "10er-Karte", einheiten: 10, preisCent: 22000, laufzeitMonate: 6 },
};

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

/**
 * Legt eine neue Karte an. Es gibt noch keine Zahlungsanbindung (siehe
 * Auftrag), diese Funktion simuliert deshalb direkt die bezahlte Karte,
 * genutzt vom Seed-Skript und von der Admin-Kulanzfunktion.
 */
export async function kaufeKarte(kundeId: string, typ: "FUENFER" | "ZEHNER", notiz?: string) {
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
 * Manuelle Kulanz-Gutschrift durch die Inhaberin (Admin), unabhängig von
 * den normalen Buchungsregeln. Erzeugt eine Guthabenkarte mit frei
 * wählbarer Einheitenzahl.
 */
export async function erstelleKulanzGuthaben(
  kundeId: string,
  einheiten: number,
  notiz: string,
  gueltigkeitsMonate = 6,
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
