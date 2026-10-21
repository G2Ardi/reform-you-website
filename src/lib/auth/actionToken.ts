import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signierte, kurzlebige Tokens für Aktions-Links in E-Mails: Stornieren
 * oder Umbuchen direkt aus der Erinnerungsmail, Warteliste-Platz bestätigen,
 * ohne dass dafür ein separates Login nötig ist (siehe Auftrag).
 *
 * Bewusst schlicht gehalten (HMAC-SHA256 über ein Secret aus TOKEN_SECRET),
 * kein JWT, keine externe Library. TOKEN_SECRET ist ein Platzhalter-Wert
 * für die lokale Testumgebung, siehe README, in Produktion durch einen
 * eigenen Zufallswert ersetzen.
 */

export type AktionsTyp = "storno" | "umbuchen" | "warteliste-bestaetigen";

interface TokenNutzlast {
  buchungId: string;
  aktion: AktionsTyp;
  ablauf: number;
}

function secret(): string {
  const wert = process.env.TOKEN_SECRET;
  if (!wert) {
    console.warn(
      "[reform-you] TOKEN_SECRET ist nicht gesetzt, nutze einen unsicheren Platzhalter. " +
        "Nur für die lokale Testumgebung akzeptabel, siehe README.",
    );
    return "unsicherer-entwicklungs-platzhalter";
  }
  return wert;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export function erstelleAktionsToken(
  buchungId: string,
  aktion: AktionsTyp,
  gueltigkeitsTage = 14,
): string {
  const ablauf = Date.now() + gueltigkeitsTage * 24 * 60 * 60 * 1000;
  const nutzlast: TokenNutzlast = { buchungId, aktion, ablauf };
  const payload = base64url(Buffer.from(JSON.stringify(nutzlast)));
  const signatur = base64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${signatur}`;
}

export function pruefeAktionsToken(token: string): TokenNutzlast | null {
  const teile = token.split(".");
  if (teile.length !== 2) return null;
  const [payload, signatur] = teile;

  const erwarteteSignatur = base64url(createHmac("sha256", secret()).update(payload).digest());
  try {
    if (!timingSafeEqual(Buffer.from(signatur), Buffer.from(erwarteteSignatur))) return null;
  } catch {
    return null;
  }

  try {
    const nutzlast = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TokenNutzlast;
    if (nutzlast.ablauf < Date.now()) return null;
    return nutzlast;
  } catch {
    return null;
  }
}
