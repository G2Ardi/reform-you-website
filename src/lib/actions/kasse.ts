"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { BuchungsFehler } from "@/lib/repositories/buchungen";
import {
  erstelleKasseUebersicht,
  fuehreKaufDurch,
  protokolliereZahlung,
  type KasseAuswahl,
} from "@/lib/repositories/kasse";
import {
  GutscheinFehler,
  erstelleGutschein,
  pruefeGutscheinKaufDaten,
  type GutscheinKaufDaten,
} from "@/lib/repositories/gutscheine";
import { pruefeEinzelstundeBuchbar, starteCheckout } from "@/lib/repositories/stripe-bestellungen";
import { FreikursFehler } from "@/lib/repositories/freikurse";
import { CREDITS_KATALOG, type KaufbareCredits } from "@/lib/credits";
import { stripeAktiv } from "@/lib/stripe";
import type { ErgebnisMitText } from "@/lib/actions/types";

export type KasseErgebnis = ErgebnisMitText;

function leseAuswahl(formData: FormData): KasseAuswahl | null {
  const art = String(formData.get("art") ?? "");
  if (art === "credits") {
    const typ = String(formData.get("typ") ?? "") as KaufbareCredits;
    return typ in CREDITS_KATALOG ? { art: "credits", typ } : null;
  }
  if (art === "einzel") {
    const kursTerminId = String(formData.get("termin") ?? "");
    return kursTerminId ? { art: "einzel", kursTerminId } : null;
  }
  return null;
}

/** Basisadresse der Website fuer die Rueckkehr von Stripe. */
async function ermittleOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

function pfadMitAuswahl(standortSlug: string, auswahl: KasseAuswahl): string {
  const q = new URLSearchParams(
    auswahl.art === "credits" ? { art: "credits", typ: auswahl.typ } : { art: "einzel", termin: auswahl.kursTerminId },
  );
  return `/${standortSlug}/kasse?${q.toString()}`;
}

/** Zahlungspflichtig kaufen: Credits oder Einzelstunde. */
export async function kaufenAction(
  standortSlug: string,
  _vorher: KasseErgebnis | null,
  formData: FormData,
): Promise<KasseErgebnis | null> {
  const kunde = await getEingeloggterKunde();
  if (!kunde) redirect(`/${standortSlug}/konto/login`);

  const auswahl = leseAuswahl(formData);
  if (!auswahl) return { fehler: "Die Auswahl ist ungültig. Bitte noch einmal von vorn beginnen." };
  const code = String(formData.get("code") ?? "");

  let weiter: string;
  try {
    const uebersicht = await erstelleKasseUebersicht(auswahl, code);
    if (uebersicht.gutscheinFehler) throw new GutscheinFehler(uebersicht.gutscheinFehler);

    if (stripeAktiv() && uebersicht.zuZahlenCent > 0) {
      // Echte Zahlung: erst zu Stripe, Credits oder Buchung entstehen nach der Zahlung.
      if (auswahl.art === "einzel") await pruefeEinzelstundeBuchbar(kunde.id, auswahl.kursTerminId);
      weiter = await starteCheckout({
        kundeId: kunde.id,
        kundenEmail: kunde.email,
        standortSlug,
        daten:
          auswahl.art === "credits"
            ? { art: "CREDITS", typ: auswahl.typ }
            : { art: "EINZELSTUNDE", kursTerminId: auswahl.kursTerminId },
        titel: uebersicht.titel,
        beschreibung: uebersicht.beschreibung,
        gesamtCent: uebersicht.gesamtCent,
        gutscheinCode: uebersicht.gutschein?.code ?? null,
        gutscheinAbzugCent: uebersicht.gutschein?.abzugCent ?? 0,
        origin: await ermittleOrigin(),
        abbruchPfad: pfadMitAuswahl(standortSlug, auswahl),
      });
    } else {
      // Simulation ohne Stripe, oder ein Gutschein deckt den ganzen Preis.
      const ergebnis = await fuehreKaufDurch(kunde.id, auswahl, code);
      weiter =
        ergebnis.art === "credits"
          ? `/${standortSlug}/konto/profil?neu=credits`
          : `/${ergebnis.standortSlug}/konto/profil?neu=buchung`;
    }
  } catch (fehler) {
    if (fehler instanceof BuchungsFehler || fehler instanceof GutscheinFehler || fehler instanceof FreikursFehler) {
      return { fehler: fehler.message };
    }
    console.error("[reform-you] Kauf fehlgeschlagen:", fehler);
    return { fehler: "Der Kauf ist fehlgeschlagen. Es wurde nichts berechnet." };
  }
  redirect(weiter);
}

/** Gutschein bestellen, ohne Kundenkonto möglich. */
export async function gutscheinBestellenAction(
  standortSlug: string,
  _vorher: KasseErgebnis | null,
  formData: FormData,
): Promise<KasseErgebnis | null> {
  const auswahl = String(formData.get("betrag") ?? "");
  const frei = String(formData.get("betragFrei") ?? "").replace(",", ".").trim();
  const betragEuro = auswahl === "frei" ? Number(frei) : Number(auswahl);

  const lieferText = String(formData.get("lieferDatum") ?? "");
  const lieferDatum = lieferText ? new Date(`${lieferText}T00:00:00`) : new Date(NaN);

  const kaufDaten: GutscheinKaufDaten = {
    betragEuro,
    kaeuferName: String(formData.get("kaeuferName") ?? ""),
    kaeuferEmail: String(formData.get("kaeuferEmail") ?? ""),
    empfaengerName: String(formData.get("empfaengerName") ?? ""),
    empfaengerEmail: String(formData.get("empfaengerEmail") ?? ""),
    lieferDatum,
    nachricht: String(formData.get("nachricht") ?? ""),
  };

  let weiter: string;
  try {
    const kunde = await getEingeloggterKunde();

    if (stripeAktiv()) {
      const problem = pruefeGutscheinKaufDaten(kaufDaten);
      if (problem) return { fehler: problem };
      weiter = await starteCheckout({
        kundeId: kunde?.id ?? null,
        kundenEmail: kaufDaten.kaeuferEmail.trim(),
        standortSlug,
        daten: {
          art: "GUTSCHEIN",
          betragEuro: kaufDaten.betragEuro,
          kaeuferName: kaufDaten.kaeuferName,
          kaeuferEmail: kaufDaten.kaeuferEmail,
          empfaengerName: kaufDaten.empfaengerName,
          empfaengerEmail: kaufDaten.empfaengerEmail,
          lieferDatum: lieferText,
          nachricht: kaufDaten.nachricht ?? "",
        },
        titel: `Gutschein über ${kaufDaten.betragEuro} Euro`,
        beschreibung: `Reform You Pilates Studio, für ${kaufDaten.empfaengerName.trim()}`,
        gesamtCent: kaufDaten.betragEuro * 100,
        gutscheinCode: null,
        gutscheinAbzugCent: 0,
        origin: await ermittleOrigin(),
        abbruchPfad: `/${standortSlug}/gutschein`,
      });
    } else {
      const gutschein = await erstelleGutschein(kaufDaten);
      await protokolliereZahlung({
        zweck: "GUTSCHEIN",
        betragCent: gutschein.betragCent,
        bezug: `Gutschein ${gutschein.code}`,
        kundeId: kunde?.id ?? null,
        gutscheinId: gutschein.id,
      });
      weiter = `/${standortSlug}/gutschein/danke?betrag=${gutschein.betragCent}&an=${encodeURIComponent(gutschein.empfaengerEmail)}&am=${gutschein.lieferDatum.toISOString().slice(0, 10)}`;
    }
  } catch (fehler) {
    if (fehler instanceof GutscheinFehler || fehler instanceof BuchungsFehler) return { fehler: fehler.message };
    console.error("[reform-you] Gutschein-Bestellung fehlgeschlagen:", fehler);
    return { fehler: "Die Bestellung ist fehlgeschlagen. Es wurde nichts berechnet." };
  }
  redirect(weiter);
}
