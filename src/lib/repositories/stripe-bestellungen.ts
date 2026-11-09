import "server-only";
import type { StripeBestellung } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CREDITS_KATALOG, type KaufbareCredits } from "@/lib/credits";
import { getStripe, STRIPE_MINDESTBETRAG_CENT } from "@/lib/stripe";
import { BuchungsFehler, erstelleBuchung } from "@/lib/repositories/buchungen";
import { freiePlaetze, istNochBuchbar } from "@/lib/repositories/kurstermine";
import { kaufeKarte } from "@/lib/repositories/karten";
import {
  GutscheinFehler,
  erstelleGutschein,
  gebeGutscheinFrei,
  loeseGutscheinEin,
  type GutscheinKaufDaten,
} from "@/lib/repositories/gutscheine";
import { protokolliereZahlung } from "@/lib/repositories/kasse";
import { sendeBestellungErstattet, sendeCreditsKauf, sendeStudioHinweis } from "@/lib/mail/versand";
import { formatPreis } from "@/lib/format";

/**
 * Bezahlen ueber Stripe Checkout.
 *
 * Ablauf: Beim Klick auf "Zahlungspflichtig kaufen" speichern wir die Bestellung
 * (OFFEN) und schicken die Kundin zu Stripe. Erst wenn die Zahlung da ist
 * (Rueckkehrseite oder Webhook, je nachdem was zuerst kommt), entstehen Credits,
 * Buchung oder Gutschein. Das passiert genau einmal, egal wie oft beide Wege
 * die Bestellung melden: die Bestellung wird per Statuswechsel OFFEN auf
 * IN_ARBEIT "beansprucht".
 *
 * SEPA-Lastschrift wird erst nach einigen Tagen bestaetigt. Wir fuehren die
 * Bestellung schon aus, sobald Stripe die Zahlung als "in Bearbeitung" meldet.
 * Scheitert sie spaeter, meldet der Webhook das ans Studio.
 */

export type BestellDaten =
  | { art: "CREDITS"; typ: KaufbareCredits }
  | { art: "EINZELSTUNDE"; kursTerminId: string }
  | {
      art: "GUTSCHEIN";
      betragEuro: number;
      kaeuferName: string;
      kaeuferEmail: string;
      empfaengerName: string;
      empfaengerEmail: string;
      /** JJJJ-MM-TT */
      lieferDatum: string;
      nachricht: string;
    };

export interface CheckoutParameter {
  kundeId: string | null;
  kundenEmail: string | null;
  standortSlug: string;
  daten: BestellDaten;
  titel: string;
  beschreibung: string;
  gesamtCent: number;
  gutscheinCode: string | null;
  gutscheinAbzugCent: number;
  /** Basisadresse der Website, z. B. https://reform-you.de */
  origin: string;
  /** Pfad der Kasse, zu dem "Abbrechen" bei Stripe zurueckfuehrt */
  abbruchPfad: string;
}

/** Einzelstunde: vor der Zahlung pruefen, ob der Platz noch frei ist. */
export async function pruefeEinzelstundeBuchbar(kundeId: string, kursTerminId: string): Promise<void> {
  const termin = await prisma.kursTermin.findUnique({ where: { id: kursTerminId }, include: { buchungen: true } });
  if (!termin) throw new BuchungsFehler("Dieser Termin existiert nicht mehr.");
  if (termin.status !== "AKTIV") throw new BuchungsFehler("Dieser Termin ist ausgefallen.");
  if (!istNochBuchbar(termin.beginn)) throw new BuchungsFehler("Dieser Termin ist nicht mehr buchbar.");
  if (freiePlaetze(termin) <= 0) {
    throw new BuchungsFehler("Dieser Termin ist inzwischen voll. Tritt der Warteliste im Kursplan bei.");
  }
  if (termin.buchungen.some((b) => b.kundeId === kundeId && b.status === "GEBUCHT")) {
    throw new BuchungsFehler("Diesen Termin hast du bereits gebucht.");
  }
}

/** Legt Bestellung und Stripe-Sitzung an und gibt die Adresse der Stripe-Zahlungsseite zurueck. */
export async function starteCheckout(p: CheckoutParameter): Promise<string> {
  const betragCent = p.gesamtCent - p.gutscheinAbzugCent;
  if (betragCent < STRIPE_MINDESTBETRAG_CENT) {
    throw new BuchungsFehler(
      "Der Restbetrag ist zu klein für eine Online-Zahlung. Bitte ohne Gutschein kaufen oder einen anderen Gutschein verwenden.",
    );
  }

  const bestellung = await prisma.stripeBestellung.create({
    data: {
      art: p.daten.art,
      kundeId: p.kundeId,
      standortSlug: p.standortSlug,
      gesamtCent: p.gesamtCent,
      betragCent,
      gutscheinCode: p.gutscheinCode,
      gutscheinAbzugCent: p.gutscheinAbzugCent,
      daten: JSON.stringify(p.daten),
    },
  });

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: betragCent,
            product_data: { name: p.titel, description: p.beschreibung.slice(0, 300) },
          },
        },
      ],
      customer_email: p.kundenEmail ?? undefined,
      client_reference_id: bestellung.id,
      metadata: { bestellungId: bestellung.id },
      payment_intent_data: { description: `${p.titel} (${bestellung.id})`, metadata: { bestellungId: bestellung.id } },
      locale: "de",
      // {CHECKOUT_SESSION_ID} ersetzt Stripe selbst, die Klammern bleiben unkodiert.
      success_url: `${p.origin}/${p.standortSlug}/kasse/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${p.origin}${p.abbruchPfad}`,
    });
    if (!session.url) throw new Error("Stripe hat keine Zahlungsadresse geliefert.");

    await prisma.stripeBestellung.update({ where: { id: bestellung.id }, data: { sessionId: session.id } });
    return session.url;
  } catch (fehler) {
    await prisma.stripeBestellung.delete({ where: { id: bestellung.id } }).catch(() => {});
    throw fehler;
  }
}

export type BestellAusgang =
  | { status: "OFFEN" }
  | { status: "IN_ARBEIT" }
  | { status: "BEZAHLT" | "ERSTATTET" | "MANUELL" | "FEHLGESCHLAGEN"; bestellung: StripeBestellung };

export async function getBestellungNachSession(sessionId: string) {
  return prisma.stripeBestellung.findUnique({ where: { sessionId } });
}

function endgueltig(status: string): boolean {
  return status === "BEZAHLT" || status === "ERSTATTET" || status === "MANUELL" || status === "FEHLGESCHLAGEN";
}

/**
 * Fuehrt die Bestellung zu einer Stripe-Sitzung aus, sobald die Zahlung da ist.
 * Darf beliebig oft und gleichzeitig aufgerufen werden.
 */
export async function erfuelleBestellung(sessionId: string): Promise<BestellAusgang> {
  const bestellung = await getBestellungNachSession(sessionId);
  if (!bestellung) throw new Error(`Keine Bestellung zur Stripe-Sitzung ${sessionId} gefunden.`);
  if (endgueltig(bestellung.status)) return { status: bestellung.status as "BEZAHLT", bestellung };
  if (bestellung.status === "IN_ARBEIT") return { status: "IN_ARBEIT" };

  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  const pi = typeof session.payment_intent === "object" && session.payment_intent ? session.payment_intent : null;
  const angenommen =
    session.status === "complete" &&
    (session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      pi?.status === "processing" ||
      pi?.status === "succeeded");
  if (!angenommen) return { status: "OFFEN" };

  const beansprucht = await prisma.stripeBestellung.updateMany({
    where: { id: bestellung.id, status: "OFFEN" },
    data: { status: "IN_ARBEIT", paymentIntentId: pi?.id ?? null },
  });
  if (beansprucht.count === 0) {
    const neu = await prisma.stripeBestellung.findUniqueOrThrow({ where: { id: bestellung.id } });
    return endgueltig(neu.status) ? { status: neu.status as "BEZAHLT", bestellung: neu } : { status: "IN_ARBEIT" };
  }

  try {
    const ergebnis = await fuehreAus(bestellung, pi?.id ?? null);
    const fertig = await prisma.stripeBestellung.update({
      where: { id: bestellung.id },
      data: { status: "BEZAHLT", erfuelltAm: new Date(), ergebnis: JSON.stringify(ergebnis) },
    });
    return { status: "BEZAHLT", bestellung: fertig };
  } catch (fehler) {
    return erstatteNachFehler(bestellung, pi?.id ?? null, fehler);
  }
}

async function fuehreAus(b: StripeBestellung, paymentIntentId: string | null): Promise<Record<string, string>> {
  const daten = JSON.parse(b.daten) as BestellDaten;

  // Gutschein zuerst abbuchen, bei jedem Fehler danach wieder freigeben.
  let gutscheinId: string | null = null;
  let eingeloest = 0;
  if (b.gutscheinCode && b.gutscheinAbzugCent > 0) {
    const g = await prisma.gutschein.findUnique({ where: { code: b.gutscheinCode } });
    if (!g) throw new GutscheinFehler("Der Gutschein existiert nicht mehr.");
    gutscheinId = g.id;
    eingeloest = await loeseGutscheinEin(g.id, b.gutscheinAbzugCent);
    if (eingeloest < b.gutscheinAbzugCent) {
      await gebeGutscheinFrei(g.id, eingeloest);
      throw new GutscheinFehler("Der Gutschein wurde inzwischen anderweitig verwendet.");
    }
  }

  try {
    if (daten.art === "CREDITS") {
      if (!b.kundeId) throw new Error("Bestellung ohne Kundenkonto.");
      const karte = await kaufeKarte(b.kundeId, daten.typ);
      const kunde = await prisma.kunde.findUniqueOrThrow({ where: { id: b.kundeId } });
      await protokolliereZahlung({
        zweck: "CREDITS",
        betragCent: b.betragCent,
        bezug: CREDITS_KATALOG[daten.typ].label,
        kundeId: b.kundeId,
        gutscheinId,
        gutscheinAbzugCent: eingeloest,
        anbieter: "STRIPE",
        externeId: paymentIntentId,
      });
      await sendeCreditsKauf(kunde, karte, b.betragCent);
      return { art: "CREDITS", label: CREDITS_KATALOG[daten.typ].label };
    }

    if (daten.art === "EINZELSTUNDE") {
      if (!b.kundeId) throw new Error("Bestellung ohne Kundenkonto.");
      const buchung = await erstelleBuchung({
        kundeId: b.kundeId,
        kursTerminId: daten.kursTerminId,
        zahlungsart: "EINZELZAHLUNG",
        nurBeiFreiemPlatz: true,
      });
      await protokolliereZahlung({
        zweck: "EINZELSTUNDE",
        betragCent: b.betragCent,
        bezug: `Einzelstunde ${buchung.kursTermin.kurs.name}`,
        kundeId: b.kundeId,
        standortId: buchung.kursTermin.standortId,
        buchungId: buchung.id,
        gutscheinId,
        gutscheinAbzugCent: eingeloest,
        anbieter: "STRIPE",
        externeId: paymentIntentId,
      });
      return { art: "EINZELSTUNDE", kurs: buchung.kursTermin.kurs.name, standort: buchung.kursTermin.standort.name };
    }

    // Gutschein-Kauf: kann nicht selbst mit einem Gutschein bezahlt werden.
    const g = daten;
    const kaufDaten: GutscheinKaufDaten = {
      betragEuro: g.betragEuro,
      kaeuferName: g.kaeuferName,
      kaeuferEmail: g.kaeuferEmail,
      empfaengerName: g.empfaengerName,
      empfaengerEmail: g.empfaengerEmail,
      // Wurde erst nach Mitternacht bezahlt, geht der Code sofort raus statt als Fehler zu enden.
      lieferDatum: new Date(Math.max(new Date(`${g.lieferDatum}T00:00:00`).getTime(), Date.now())),
      nachricht: g.nachricht,
    };
    const gutschein = await erstelleGutschein(kaufDaten);
    await protokolliereZahlung({
      zweck: "GUTSCHEIN",
      betragCent: gutschein.betragCent,
      bezug: `Gutschein ${gutschein.code}`,
      kundeId: b.kundeId,
      gutscheinId: gutschein.id,
      anbieter: "STRIPE",
      externeId: paymentIntentId,
    });
    return { art: "GUTSCHEIN", empfaenger: g.empfaengerEmail, lieferDatum: g.lieferDatum };
  } catch (fehler) {
    if (gutscheinId && eingeloest > 0) await gebeGutscheinFrei(gutscheinId, eingeloest).catch(() => {});
    throw fehler;
  }
}

/** Die Zahlung ging ein, aber die Ausfuehrung scheiterte: automatisch erstatten, sonst manuell melden. */
async function erstatteNachFehler(b: StripeBestellung, paymentIntentId: string | null, fehler: unknown): Promise<BestellAusgang> {
  const grund =
    fehler instanceof BuchungsFehler || fehler instanceof GutscheinFehler
      ? fehler.message
      : "Es ist ein technischer Fehler aufgetreten.";
  if (!(fehler instanceof BuchungsFehler || fehler instanceof GutscheinFehler)) {
    console.error("[reform-you] Ausfuehrung der Stripe-Bestellung fehlgeschlagen:", fehler);
  }

  let erstattet = false;
  try {
    if (!paymentIntentId) throw new Error("Keine Zahlungs-ID vorhanden.");
    await getStripe().refunds.create({ payment_intent: paymentIntentId, metadata: { bestellungId: b.id } });
    erstattet = true;
  } catch (refundFehler) {
    console.error("[reform-you] Automatische Erstattung fehlgeschlagen:", refundFehler);
  }

  const aktualisiert = await prisma.stripeBestellung.update({
    where: { id: b.id },
    data: { status: erstattet ? "ERSTATTET" : "MANUELL", fehler: grund },
  });

  const kunde = b.kundeId ? await prisma.kunde.findUnique({ where: { id: b.kundeId } }) : null;
  const daten = JSON.parse(b.daten) as BestellDaten;
  const empfaenger = kunde?.email ?? (daten.art === "GUTSCHEIN" ? daten.kaeuferEmail : null);
  if (empfaenger) await sendeBestellungErstattet(empfaenger, kunde?.name ?? "", grund, erstattet);
  await sendeStudioHinweis(
    erstattet ? "Stripe-Bestellung automatisch erstattet" : "Stripe-Bestellung bitte von Hand erstatten",
    [
      erstattet ? "Eine bezahlte Bestellung liess sich nicht ausführen und wurde automatisch erstattet." : "Eine bezahlte Bestellung liess sich nicht ausführen. Die automatische Erstattung ist fehlgeschlagen, bitte in Stripe von Hand erstatten.",
      `Grund: ${grund}`,
      `Bestellung: ${b.id}, ${b.art}, ${formatPreis(b.betragCent)}`,
      `Stripe-Zahlung: ${paymentIntentId ?? "unbekannt"}`,
      kunde ? `Kunde: ${kunde.name} (${kunde.email})` : "",
    ].filter(Boolean),
  );

  return { status: aktualisiert.status as "ERSTATTET" | "MANUELL", bestellung: aktualisiert };
}

/**
 * Eine Zahlung ist spaeter gescheitert (zum Beispiel SEPA-Ruecklastschrift),
 * nachdem Credits oder Buchung schon freigeschaltet wurden. Wir markieren die
 * Bestellung und melden dem Studio, was zu pruefen ist.
 */
export async function markiereZahlungFehlgeschlagen(sessionId: string): Promise<void> {
  const b = await getBestellungNachSession(sessionId);
  if (!b || b.status === "FEHLGESCHLAGEN") return;
  const warBezahlt = b.status === "BEZAHLT";
  await prisma.stripeBestellung.update({
    where: { id: b.id },
    data: { status: "FEHLGESCHLAGEN", fehler: "Zahlung später fehlgeschlagen" },
  });
  const kunde = b.kundeId ? await prisma.kunde.findUnique({ where: { id: b.kundeId } }) : null;
  await sendeStudioHinweis("Zahlung fehlgeschlagen: bitte prüfen", [
    "Eine Zahlung ist nachträglich fehlgeschlagen (zum Beispiel Rücklastschrift).",
    warBezahlt
      ? "Credits, Buchung oder Gutschein waren bereits freigeschaltet. Bitte im Admin-Bereich prüfen und gegebenenfalls stornieren oder sperren."
      : "Die Bestellung war noch nicht ausgeführt, es wurde nichts freigeschaltet.",
    `Bestellung: ${b.id}, ${b.art}, ${formatPreis(b.betragCent)}`,
    kunde ? `Kunde: ${kunde.name} (${kunde.email}, ${kunde.telefon})` : "",
  ].filter(Boolean));
}
