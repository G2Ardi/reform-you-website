import "server-only";
import { randomInt } from "crypto";
import type { Freikurs, Kunde } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { normalisiereTelefon } from "@/lib/telefon";
import { sendeWillkommenscode } from "@/lib/mail/versand";

/**
 * Freikurs-Codes (Willkommenscode): ein Code, eine kostenlose Einzelstunde in
 * einem Reformer-Kurs. Er entsteht automatisch bei der Erstregistrierung
 * (ein- und ausschaltbar, Gueltigkeit einstellbar) oder von Hand im Admin-
 * Bereich. Eingeloest wird er im Bezahlschritt wie ein Gutschein.
 */

export class FreikursFehler extends Error {}

const PREFIX = "WK";
/** Ohne 0/O und 1/I/L, damit sich der Code am Telefon diktieren laesst. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function block(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

async function eindeutigerCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `${PREFIX}-${block(4)}-${block(4)}`;
    if (!(await prisma.freikurs.findUnique({ where: { code } }))) return code;
  }
  throw new FreikursFehler("Es konnte kein eindeutiger Code erzeugt werden.");
}

export function normalisiereFreikursCode(eingabe: string): string {
  return eingabe.trim().toUpperCase().replace(/\s+/g, "");
}

/** Erkennt am Anfang, ob ein eingegebener Code ein Freikurs-Code ist. */
export function istFreikursCode(eingabe: string): boolean {
  return normalisiereFreikursCode(eingabe).startsWith(`${PREFIX}-`);
}

function gueltigBisIn(monate: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + monate);
  return d;
}

export async function erstelleFreikurs(p: {
  art: "AUTO" | "MANUELL";
  kundeId?: string | null;
  email?: string | null;
  notiz?: string | null;
  monate?: number;
  telefonNorm?: string | null;
}): Promise<Freikurs> {
  const einstellungen = await getEinstellungen();
  const monate = p.monate ?? einstellungen.willkommenscodeMonate;
  return prisma.freikurs.create({
    data: {
      code: await eindeutigerCode(),
      art: p.art,
      gueltigBis: gueltigBisIn(monate),
      kundeId: p.kundeId ?? null,
      email: p.email?.trim().toLowerCase() || null,
      notiz: p.notiz?.trim() || null,
      telefonNorm: p.telefonNorm ?? null,
    },
  });
}

/** Bei der Erstregistrierung: Code erzeugen und per Mail schicken, wenn eingeschaltet. */
export async function erstelleWillkommenscodeFuerNeueKundin(kunde: Kunde): Promise<Freikurs | null> {
  const einstellungen = await getEinstellungen();
  if (!einstellungen.willkommenscodeAktiv) return null;

  // Ein automatischer Code pro Handynummer: Wer sich mit einer schon benutzten
  // Nummer erneut registriert, bekommt keinen zweiten Code.
  const telefonNorm = normalisiereTelefon(kunde.telefon);
  if (telefonNorm.length < 6) return null;
  if (await prisma.freikurs.findUnique({ where: { telefonNorm } })) return null;

  let code: Freikurs;
  try {
    code = await erstelleFreikurs({ art: "AUTO", kundeId: kunde.id, email: kunde.email, telefonNorm });
  } catch (fehler) {
    // Zwei Registrierungen mit derselben Nummer gleichzeitig: die zweite verliert.
    if ((fehler as { code?: string }).code === "P2002") return null;
    throw fehler;
  }
  await sendeWillkommenscode(kunde.email, kunde.name, code.code, code.gueltigBis);
  return code;
}

/** Vom Admin erzeugter Code. Mit E-Mail-Adresse wird er gleich verschickt. */
export async function erstelleManuellenCode(p: { email?: string; notiz?: string; monate?: number }): Promise<Freikurs> {
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) {
    throw new FreikursFehler("Bitte eine gültige E-Mail-Adresse angeben oder das Feld leer lassen.");
  }
  if (p.monate !== undefined && (!Number.isInteger(p.monate) || p.monate < 1 || p.monate > 36)) {
    throw new FreikursFehler("Die Gültigkeit muss zwischen 1 und 36 Monaten liegen.");
  }
  const code = await erstelleFreikurs({ art: "MANUELL", email: p.email, notiz: p.notiz, monate: p.monate });
  if (code.email) await sendeWillkommenscode(code.email, null, code.code, code.gueltigBis);
  return code;
}

export async function pruefeFreikursCode(eingabe: string): Promise<{ freikurs: Freikurs | null; fehler: string | null }> {
  const code = normalisiereFreikursCode(eingabe);
  const f = await prisma.freikurs.findUnique({ where: { code } });
  if (!f) return { freikurs: null, fehler: "Diesen Code gibt es nicht." };
  if (f.status === "GESPERRT") return { freikurs: null, fehler: "Dieser Code ist gesperrt." };
  if (f.status === "EINGELOEST") return { freikurs: null, fehler: "Dieser Code wurde bereits eingelöst." };
  if (f.gueltigBis < new Date()) return { freikurs: null, fehler: "Dieser Code ist abgelaufen." };
  return { freikurs: f, fehler: null };
}

/** Verbraucht den Code atomar. Gibt false zurueck, wenn er inzwischen weg ist. */
export async function loeseFreikursEin(freikursId: string): Promise<boolean> {
  const res = await prisma.freikurs.updateMany({
    where: { id: freikursId, status: "OFFEN", gueltigBis: { gte: new Date() } },
    data: { status: "EINGELOEST", eingeloestAm: new Date() },
  });
  return res.count === 1;
}

export async function verknuepfeFreikursMitBuchung(freikursId: string, buchungId: string) {
  await prisma.freikurs.update({ where: { id: freikursId }, data: { buchungId } });
}

/** Einloesung rueckgaengig machen, falls der Kauf danach scheitert. */
export async function gebeFreikursFrei(freikursId: string) {
  await prisma.freikurs.update({
    where: { id: freikursId },
    data: { status: "OFFEN", eingeloestAm: null, buchungId: null },
  });
}

/**
 * Wird eine mit Code gebuchte Stunde rechtzeitig storniert (oder faellt der Kurs
 * aus), wird der Code wieder gueltig, mit demselben Ablaufdatum. Ist er schon
 * abgelaufen, bleibt er eingeloest.
 */
export async function reaktiviereFreikursFuerBuchung(buchungId: string): Promise<boolean> {
  const res = await prisma.freikurs.updateMany({
    where: { buchungId, status: "EINGELOEST", gueltigBis: { gte: new Date() } },
    data: { status: "OFFEN", eingeloestAm: null, buchungId: null },
  });
  return res.count > 0;
}

/** Beim Verschieben zeigt der Code auf die neue Buchung. */
export async function uebertrageFreikursAufBuchung(alteBuchungId: string, neueBuchungId: string) {
  await prisma.freikurs.updateMany({ where: { buchungId: alteBuchungId }, data: { buchungId: neueBuchungId } });
}

export async function sperreFreikurs(freikursId: string) {
  const res = await prisma.freikurs.updateMany({ where: { id: freikursId, status: "OFFEN" }, data: { status: "GESPERRT" } });
  if (res.count !== 1) throw new FreikursFehler("Nur offene Codes lassen sich sperren.");
}

export async function getFreikurseFuerAdmin() {
  const codes = await prisma.freikurs.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const kundeIds = Array.from(new Set(codes.map((c) => c.kundeId).filter((v): v is string => Boolean(v))));
  const kunden = await prisma.kunde.findMany({ where: { id: { in: kundeIds } }, select: { id: true, name: true, email: true } });
  return codes.map((c) => ({ ...c, kunde: kunden.find((k) => k.id === c.kundeId) ?? null }));
}
