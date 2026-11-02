/**
 * Credits-Modell. Es gibt kein Abo: Man bucht eine Einzelstunde oder kauft
 * 5 bzw. 10 Credits. Eine Buchung kostet immer 1 Credit. Die Laufzeit
 * beginnt mit dem Kauf. Credits gehoeren dem Kunden, nicht einem Standort,
 * und sind an beiden Standorten einloesbar.
 *
 * Bewusst ohne "server-only", damit auch Client-Komponenten die Labels
 * nutzen koennen. Die Preise stammen aus dem Fragenkatalog, Abschnitt 5.
 */

export type KaufbareCredits = "FUENFER" | "ZEHNER";

export const CREDITS_KATALOG: Record<
  KaufbareCredits,
  { label: string; einheiten: number; preisCent: number; laufzeitMonate: number }
> = {
  FUENFER: { label: "5 Credits", einheiten: 5, preisCent: 12000, laufzeitMonate: 3 },
  ZEHNER: { label: "10 Credits", einheiten: 10, preisCent: 22000, laufzeitMonate: 6 },
};

/** Laufzeit von Guthaben, das aus einer stornierten Einzelbuchung entsteht. */
export const GUTHABEN_LAUFZEIT_MONATE = 6;

/** Gutschein-Vorgaben: feste Betraege und Grenzen fuer den freien Betrag. */
export const GUTSCHEIN_BETRAEGE_EURO = [25, 50, 100, 150, 200] as const;
export const GUTSCHEIN_MIN_EURO = 10;
export const GUTSCHEIN_MAX_EURO = 500;
/** Gueltigkeit eines Gutscheins ab Kauf, in Jahren. */
export const GUTSCHEIN_GUELTIGKEIT_JAHRE = 3;

export function kartenLabel(typ: string): string {
  if (typ === "FUENFER" || typ === "ZEHNER") return CREDITS_KATALOG[typ].label;
  return "Guthaben";
}

export function formatDatumKurz(datum: Date): string {
  return datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}
