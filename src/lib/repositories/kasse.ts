import "server-only";
import { prisma } from "@/lib/prisma";
import { CREDITS_KATALOG, type KaufbareCredits } from "@/lib/credits";
import { kaufeKarte } from "@/lib/repositories/karten";
import { BuchungsFehler, erstelleBuchung } from "@/lib/repositories/buchungen";
import {
  GutscheinFehler,
  gebeGutscheinFrei,
  loeseGutscheinEin,
  pruefeGutscheinCode,
} from "@/lib/repositories/gutscheine";
import { sendeCreditsKauf } from "@/lib/mail/versand";
import { formatDatumUhrzeit } from "@/lib/format";
import { stripeAktiv, zahlungsModus } from "@/lib/stripe";
import {
  FreikursFehler,
  gebeFreikursFrei,
  istFreikursCode,
  loeseFreikursEin,
  pruefeFreikursCode,
  verknuepfeFreikursMitBuchung,
} from "@/lib/repositories/freikurse";

/**
 * Bezahlschritt für Credits und Einzelstunden.
 *
 * Zwei Wege, je nachdem ob STRIPE_SECRET_KEY gesetzt ist:
 * - ohne Schluessel: Simulation, der Kauf wird ohne Geld abgeschlossen und als
 *   Zahlung mit Anbieter "TEST" vermerkt (fuehreKaufDurch in dieser Datei).
 * - mit Schluessel: Weiterleitung zu Stripe Checkout. Credits, Buchung oder
 *   Gutschein entstehen erst nach der Zahlung (siehe stripe-bestellungen.ts).
 * Ein Gutschein, der den ganzen Preis deckt, braucht keine Zahlung und laeuft
 * in beiden Faellen ueber fuehreKaufDurch.
 */

/** Anbieter, der in der Zahlungstabelle steht. */
export function zahlungsAnbieter(): "TEST" | "STRIPE" {
  return stripeAktiv() ? "STRIPE" : "TEST";
}

/** Hinweisbanner anzeigen: alles ausser echtes Geld. */
export function istTestmodus(): boolean {
  return zahlungsModus() !== "STRIPE_LIVE";
}

export type KasseAuswahl =
  | { art: "credits"; typ: KaufbareCredits }
  | { art: "einzel"; kursTerminId: string };

export interface KasseUebersicht {
  titel: string;
  beschreibung: string;
  gesamtCent: number;
  gutschein: { code: string; abzugCent: number; restNachherCent: number } | null;
  /** Willkommenscode: die Einzelstunde ist kostenlos */
  freikurs: { code: string } | null;
  gutscheinFehler: string | null;
  zuZahlenCent: number;
  /** Nur bei Einzelstunden: Standort des Termins fuer Link und Umsatz */
  standortSlug: string | null;
}

export async function erstelleKasseUebersicht(auswahl: KasseAuswahl, gutscheinCode?: string): Promise<KasseUebersicht> {
  let titel: string;
  let beschreibung: string;
  let gesamtCent: number;
  let standortSlug: string | null = null;
  let kursMitCredits = true;

  if (auswahl.art === "credits") {
    const v = CREDITS_KATALOG[auswahl.typ];
    if (!v) throw new BuchungsFehler("Unbekanntes Credits-Paket.");
    titel = v.label;
    beschreibung = `${v.einheiten} Credits, ${v.laufzeitMonate} Monate gültig ab Kauf, an beiden Standorten einlösbar.`;
    gesamtCent = v.preisCent;
  } else {
    const termin = await prisma.kursTermin.findUnique({
      where: { id: auswahl.kursTerminId },
      include: { kurs: true, standort: true },
    });
    if (!termin) throw new BuchungsFehler("Termin nicht gefunden.");
    titel = `Einzelstunde ${termin.kurs.name}`;
    beschreibung = `${termin.standort.name}, ${formatDatumUhrzeit(termin.beginn)} Uhr`;
    gesamtCent = termin.kurs.preisEinzelCent;
    standortSlug = termin.standort.slug;
    kursMitCredits = termin.kurs.karteGueltig;
  }

  let gutschein: KasseUebersicht["gutschein"] = null;
  let freikurs: KasseUebersicht["freikurs"] = null;
  let gutscheinFehler: string | null = null;
  if (gutscheinCode && gutscheinCode.trim() && istFreikursCode(gutscheinCode)) {
    // Willkommenscode: gilt für eine Einzelstunde in einem Reformer-Kurs
    const pruefung = await pruefeFreikursCode(gutscheinCode);
    if (pruefung.fehler) gutscheinFehler = pruefung.fehler;
    else if (auswahl.art !== "einzel") gutscheinFehler = "Der Willkommenscode gilt für eine Einzelstunde, nicht für Credits.";
    else if (!kursMitCredits) gutscheinFehler = "Der Willkommenscode gilt nur für Reformer-Kurse.";
    else freikurs = { code: pruefung.freikurs!.code };
  } else if (gutscheinCode && gutscheinCode.trim()) {
    const pruefung = await pruefeGutscheinCode(gutscheinCode);
    if (pruefung.fehler) {
      gutscheinFehler = pruefung.fehler;
    } else if (pruefung.gutschein) {
      const abzugCent = Math.min(pruefung.gutschein.restCent, gesamtCent);
      gutschein = {
        code: pruefung.gutschein.code,
        abzugCent,
        restNachherCent: pruefung.gutschein.restCent - abzugCent,
      };
    }
  }

  return {
    titel,
    beschreibung,
    gesamtCent,
    gutschein,
    freikurs,
    gutscheinFehler,
    zuZahlenCent: freikurs ? 0 : gesamtCent - (gutschein?.abzugCent ?? 0),
    standortSlug,
  };
}

export async function protokolliereZahlung(params: {
  zweck: "EINZELSTUNDE" | "CREDITS" | "GUTSCHEIN";
  betragCent: number;
  bezug: string;
  kundeId?: string | null;
  standortId?: string | null;
  buchungId?: string | null;
  gutscheinId?: string | null;
  gutscheinAbzugCent?: number;
  anbieter?: string;
  externeId?: string | null;
}) {
  return prisma.zahlung.create({
    data: {
      zweck: params.zweck,
      betragCent: params.betragCent,
      anbieter: params.anbieter ?? (params.betragCent === 0 ? "GUTSCHEIN" : zahlungsAnbieter()),
      externeId: params.externeId ?? null,
      bezug: params.bezug,
      kundeId: params.kundeId ?? null,
      standortId: params.standortId ?? null,
      buchungId: params.buchungId ?? null,
      gutscheinId: params.gutscheinId ?? null,
      gutscheinAbzugCent: params.gutscheinAbzugCent ?? 0,
    },
  });
}

export type KaufErgebnis =
  | { art: "credits"; kartenLabel: string }
  | { art: "einzel"; kursTerminId: string; standortSlug: string };

/**
 * Führt den Kauf aus. Reihenfolge mit Absicherung: erst den Gutschein
 * atomar abbuchen, dann Credits bzw. Buchung anlegen. Scheitert das, wird
 * die Gutschein-Einlösung zurückgenommen, damit nichts verloren geht.
 */
export async function fuehreKaufDurch(kundeId: string, auswahl: KasseAuswahl, gutscheinCode?: string): Promise<KaufErgebnis> {
  const uebersicht = await erstelleKasseUebersicht(auswahl, gutscheinCode);
  if (uebersicht.gutscheinFehler) throw new GutscheinFehler(uebersicht.gutscheinFehler);

  // Willkommenscode: Einzelstunde kostenlos buchen, der Code wird verbraucht.
  if (uebersicht.freikurs && auswahl.art === "einzel") {
    const fk = await prisma.freikurs.findUnique({ where: { code: uebersicht.freikurs.code } });
    if (!fk) throw new FreikursFehler("Diesen Code gibt es nicht.");
    if (!(await loeseFreikursEin(fk.id))) {
      throw new FreikursFehler("Der Code ist nicht mehr gültig oder wurde gerade eingelöst.");
    }
    try {
      const buchung = await erstelleBuchung({
        kundeId,
        kursTerminId: auswahl.kursTerminId,
        zahlungsart: "EINZELZAHLUNG",
        nurBeiFreiemPlatz: true,
        gratis: true,
      });
      await verknuepfeFreikursMitBuchung(fk.id, buchung.id);
      return { art: "einzel", kursTerminId: auswahl.kursTerminId, standortSlug: buchung.kursTermin.standort.slug };
    } catch (fehler) {
      await gebeFreikursFrei(fk.id);
      throw fehler;
    }
  }

  let eingeloest = 0;
  let gutscheinId: string | null = null;
  if (uebersicht.gutschein) {
    const g = await prisma.gutschein.findUnique({ where: { code: uebersicht.gutschein.code } });
    if (!g) throw new GutscheinFehler("Diesen Gutscheincode gibt es nicht.");
    gutscheinId = g.id;
    eingeloest = await loeseGutscheinEin(g.id, uebersicht.gesamtCent);
  }

  const bezahltCent = uebersicht.gesamtCent - eingeloest;

  try {
    if (auswahl.art === "credits") {
      const karte = await kaufeKarte(kundeId, auswahl.typ);
      const kunde = await prisma.kunde.findUniqueOrThrow({ where: { id: kundeId } });
      if (bezahltCent > 0 || eingeloest > 0) {
        await protokolliereZahlung({
          zweck: "CREDITS",
          betragCent: bezahltCent,
          bezug: CREDITS_KATALOG[auswahl.typ].label,
          kundeId,
          gutscheinId,
          gutscheinAbzugCent: eingeloest,
        });
      }
      await sendeCreditsKauf(kunde, karte, bezahltCent);
      return { art: "credits", kartenLabel: CREDITS_KATALOG[auswahl.typ].label };
    }

    const buchung = await erstelleBuchung({
      kundeId,
      kursTerminId: auswahl.kursTerminId,
      zahlungsart: "EINZELZAHLUNG",
      nurBeiFreiemPlatz: true,
    });
    await protokolliereZahlung({
      zweck: "EINZELSTUNDE",
      betragCent: bezahltCent,
      bezug: uebersicht.titel,
      kundeId,
      standortId: buchung.kursTermin.standortId,
      buchungId: buchung.id,
      gutscheinId,
      gutscheinAbzugCent: eingeloest,
    });
    return { art: "einzel", kursTerminId: auswahl.kursTerminId, standortSlug: buchung.kursTermin.standort.slug };
  } catch (fehler) {
    if (gutscheinId && eingeloest > 0) await gebeGutscheinFrei(gutscheinId, eingeloest);
    throw fehler;
  }
}
