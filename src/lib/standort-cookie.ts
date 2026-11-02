/**
 * Standortwahl. Bei jedem Besuch muss zuerst ein Standort gewählt werden,
 * egal ob man schon einmal da war. Ein Besuch ist ein Browser-Tab bzw. eine
 * Sitzung (sessionStorage): wer die Seite neu öffnet, wählt neu. Innerhalb
 * eines Besuchs fragt die Seite nicht noch einmal.
 *
 * Zusätzlich merkt sich ein Cookie den zuletzt gewählten Standort. Er dient
 * nur als Vorauswahl im Kursplan, nie als Ersatz für die Wahl.
 */
export const STANDORT_COOKIE = "ry-standort";
export const STANDORT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // ein Jahr
export const STANDORT_SITZUNG_KEY = "ry-standort-ok";

/** Nur im Browser aufrufen, z. B. beim Klick auf eine Standort-Kachel. */
export function setStandortCookie(slug: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${STANDORT_COOKIE}=${slug}; path=/; max-age=${STANDORT_COOKIE_MAX_AGE}; samesite=lax`;
}

/** Markiert den aktuellen Besuch als "Standort gewählt" und merkt die Wahl. */
export function merkeStandortWahl(slug: string) {
  if (typeof document === "undefined") return;
  setStandortCookie(slug);
  try {
    sessionStorage.setItem(STANDORT_SITZUNG_KEY, "1");
  } catch {
    // sessionStorage kann gesperrt sein, dann fragt die Seite eben erneut.
  }
  document.documentElement.setAttribute("data-standort-ok", "");
}
