/**
 * Mehrwertsteuer-Umschaltung zum 1.1.2027.
 *
 * Bis 31.12.2026 gilt die Kleinunternehmerregelung (§19 UStG), 0% ausge-
 * wiesene USt. Ab 1.1.2027 gilt der reguläre Satz von 19%. Alle Preise in
 * diesem Projekt sind Bruttobeträge (das, was der Kunde zahlt), diese
 * Hilfsfunktion liefert nur den passenden Hinweistext dazu, keine
 * Rechnungsstellung (ausdrücklich nicht Teil des Auftrags).
 */

const STICHTAG_REGELBESTEUERUNG = new Date("2027-01-01T00:00:00.000Z");

export function mwstSatz(datum: Date = new Date()): number {
  return datum >= STICHTAG_REGELBESTEUERUNG ? 0.19 : 0;
}

export function mwstHinweis(datum: Date = new Date()): string {
  return mwstSatz(datum) > 0
    ? "inkl. 19% MwSt."
    : "umsatzsteuerbefreit gemäß §19 UStG (Kleinunternehmerregelung)";
}
