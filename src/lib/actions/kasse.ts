"use server";

import { redirect } from "next/navigation";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { BuchungsFehler } from "@/lib/repositories/buchungen";
import { fuehreKaufDurch, protokolliereZahlung, type KasseAuswahl } from "@/lib/repositories/kasse";
import { GutscheinFehler, erstelleGutschein } from "@/lib/repositories/gutscheine";
import { CREDITS_KATALOG, type KaufbareCredits } from "@/lib/credits";
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
    const ergebnis = await fuehreKaufDurch(kunde.id, auswahl, code);
    weiter =
      ergebnis.art === "credits"
        ? `/${standortSlug}/konto/profil?neu=credits`
        : `/${ergebnis.standortSlug}/konto/profil?neu=buchung`;
  } catch (fehler) {
    if (fehler instanceof BuchungsFehler || fehler instanceof GutscheinFehler) return { fehler: fehler.message };
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

  let weiter: string;
  try {
    const gutschein = await erstelleGutschein({
      betragEuro,
      kaeuferName: String(formData.get("kaeuferName") ?? ""),
      kaeuferEmail: String(formData.get("kaeuferEmail") ?? ""),
      empfaengerName: String(formData.get("empfaengerName") ?? ""),
      empfaengerEmail: String(formData.get("empfaengerEmail") ?? ""),
      lieferDatum,
      nachricht: String(formData.get("nachricht") ?? ""),
    });
    const kunde = await getEingeloggterKunde();
    await protokolliereZahlung({
      zweck: "GUTSCHEIN",
      betragCent: gutschein.betragCent,
      bezug: `Gutschein ${gutschein.code}`,
      kundeId: kunde?.id ?? null,
      gutscheinId: gutschein.id,
    });
    weiter = `/${standortSlug}/gutschein/danke?betrag=${gutschein.betragCent}&an=${encodeURIComponent(gutschein.empfaengerEmail)}&am=${gutschein.lieferDatum.toISOString().slice(0, 10)}`;
  } catch (fehler) {
    if (fehler instanceof GutscheinFehler) return { fehler: fehler.message };
    console.error("[reform-you] Gutschein-Bestellung fehlgeschlagen:", fehler);
    return { fehler: "Die Bestellung ist fehlgeschlagen. Es wurde nichts berechnet." };
  }
  redirect(weiter);
}
