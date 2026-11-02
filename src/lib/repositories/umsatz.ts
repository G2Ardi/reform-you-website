import "server-only";
import { prisma } from "@/lib/prisma";

export interface UmsatzUebersicht {
  tage: number;
  von: Date;
  gesamtCent: number;
  einzelstundenCent: number;
  creditsCent: number;
  gutscheineCent: number;
  anzahlZahlungen: number;
  /** Einzelstunden je Standort, Credits und Gutscheine gelten standortuebergreifend */
  einzelstundenProStandort: { standort: string; cent: number }[];
}

/**
 * Umsatz der letzten N Tage. Gezählt wird das tatsächlich eingegangene Geld
 * (Zahlungen nach Abzug eines eingelösten Gutscheins), Kartenverkäufe mit
 * dem vollen Preis beim Kauf, Gutscheine beim Verkauf. Das ist eine
 * Auswertung für Janina, keine Buchhaltung.
 */
export async function getUmsatzUebersicht(tage = 30): Promise<UmsatzUebersicht> {
  const von = new Date(Date.now() - tage * 24 * 60 * 60 * 1000);

  const nachZweck = await prisma.zahlung.groupBy({
    by: ["zweck"],
    where: { createdAt: { gte: von } },
    _sum: { betragCent: true },
    _count: true,
  });
  const summe = (zweck: string) => nachZweck.find((z) => z.zweck === zweck)?._sum.betragCent ?? 0;

  const einzel = await prisma.zahlung.groupBy({
    by: ["standortId"],
    where: { createdAt: { gte: von }, zweck: "EINZELSTUNDE" },
    _sum: { betragCent: true },
  });
  const standorte = await prisma.standort.findMany({ select: { id: true, name: true } });

  const einzelstundenCent = summe("EINZELSTUNDE");
  const creditsCent = summe("CREDITS");
  const gutscheineCent = summe("GUTSCHEIN");

  return {
    tage,
    von,
    gesamtCent: einzelstundenCent + creditsCent + gutscheineCent,
    einzelstundenCent,
    creditsCent,
    gutscheineCent,
    anzahlZahlungen: nachZweck.reduce((s, z) => s + z._count, 0),
    einzelstundenProStandort: einzel.map((e) => ({
      standort: standorte.find((s) => s.id === e.standortId)?.name ?? "ohne Standort",
      cent: e._sum.betragCent ?? 0,
    })),
  };
}
