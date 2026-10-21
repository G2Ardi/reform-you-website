import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Platzhalter-Schutz für den Admin-Bereich: ein gemeinsames Passwort aus
 * ADMIN_PASSWORT, kein echtes Rollensystem, keine einzelnen Admin-Konten.
 * NICHT produktionsreif, siehe README.
 *
 * Das Cookie trägt nicht das Klartext-Passwort, sondern einen Hash davon,
 * damit es nicht 1:1 im Browser sichtbar im Klartext steht.
 */

export const ADMIN_COOKIE = "ry_admin";

function erwarteterWert(): string | null {
  const passwort = process.env.ADMIN_PASSWORT;
  if (!passwort) return null;
  return createHash("sha256").update(passwort).digest("hex");
}

export function pruefeAdminPasswort(eingabe: string): boolean {
  const erwartet = erwarteterWert();
  if (!erwartet) return false;
  const istHash = createHash("sha256").update(eingabe).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(erwartet), Buffer.from(istHash));
  } catch {
    return false;
  }
}

export async function setzeAdminCookie(): Promise<void> {
  const wert = erwarteterWert();
  if (!wert) return;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, wert, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function loescheAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function istAdminEingeloggt(): Promise<boolean> {
  const erwartet = erwarteterWert();
  if (!erwartet) return false;
  const cookieStore = await cookies();
  const wert = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!wert) return false;
  try {
    return timingSafeEqual(Buffer.from(erwartet), Buffer.from(wert));
  } catch {
    return false;
  }
}
