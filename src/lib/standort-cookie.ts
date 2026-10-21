/**
 * Die Standortwahl wird in einem Cookie gemerkt, damit wiederkehrende
 * Besucher nicht jedes Mal neu waehlen muessen. Ein Wechsel bleibt trotzdem
 * jederzeit ueber den Link "Standort wechseln" im Kopfbereich moeglich.
 */
export const STANDORT_COOKIE = "ry-standort";
export const STANDORT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // ein Jahr

/** Nur im Browser aufrufen, z. B. beim Klick auf eine Standort-Kachel. */
export function setStandortCookie(slug: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${STANDORT_COOKIE}=${slug}; path=/; max-age=${STANDORT_COOKIE_MAX_AGE}; samesite=lax`;
}
