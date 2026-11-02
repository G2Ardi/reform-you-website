import "server-only";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  GUTSCHEIN_GUELTIGKEIT_JAHRE,
  GUTSCHEIN_MAX_EURO,
  GUTSCHEIN_MIN_EURO,
} from "@/lib/credits";
import { sendeGutscheinCode, sendeGutscheinKaufBestaetigung } from "@/lib/mail/versand";

export class GutscheinFehler extends Error {}

/** Ohne 0/O und 1/I/L, damit sich der Code am Telefon diktieren laesst. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function zufallsBlock(laenge: number): string {
  let s = "";
  for (let i = 0; i < laenge; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

async function erzeugeEindeutigenCode(): Promise<string> {
  for (let versuch = 0; versuch < 10; versuch++) {
    const code = `RY-${zufallsBlock(4)}-${zufallsBlock(4)}`;
    const vorhanden = await prisma.gutschein.findUnique({ where: { code } });
    if (!vorhanden) return code;
  }
  throw new GutscheinFehler("Es konnte kein eindeutiger Gutscheincode erzeugt werden.");
}

export function normalisiereCode(eingabe: string): string {
  return eingabe.trim().toUpperCase().replace(/\s+/g, "");
}

function tagesBeginn(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export interface GutscheinKaufDaten {
  betragEuro: number;
  kaeuferName: string;
  kaeuferEmail: string;
  empfaengerName: string;
  empfaengerEmail: string;
  lieferDatum: Date;
  nachricht?: string;
}

export function pruefeGutscheinKaufDaten(d: GutscheinKaufDaten): string | null {
  if (!Number.isFinite(d.betragEuro) || !Number.isInteger(d.betragEuro)) return "Bitte einen ganzen Betrag wählen.";
  if (d.betragEuro < GUTSCHEIN_MIN_EURO || d.betragEuro > GUTSCHEIN_MAX_EURO) {
    return `Der Betrag muss zwischen ${GUTSCHEIN_MIN_EURO} und ${GUTSCHEIN_MAX_EURO} Euro liegen.`;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!d.kaeuferName.trim()) return "Bitte deinen Namen angeben.";
  if (!emailRegex.test(d.kaeuferEmail.trim())) return "Bitte eine gültige E-Mail-Adresse für die Bestätigung angeben.";
  if (!d.empfaengerName.trim()) return "Bitte den Namen der Empfängerin oder des Empfängers angeben.";
  if (!emailRegex.test(d.empfaengerEmail.trim())) return "Bitte eine gültige E-Mail-Adresse für den Empfänger angeben.";
  if (Number.isNaN(d.lieferDatum.getTime())) return "Bitte ein Lieferdatum wählen.";
  if (tagesBeginn(d.lieferDatum) < tagesBeginn(new Date())) return "Das Lieferdatum darf nicht in der Vergangenheit liegen.";
  if ((d.nachricht ?? "").length > 500) return "Die Nachricht darf höchstens 500 Zeichen lang sein.";
  return null;
}

/**
 * Legt einen bezahlten Gutschein an. Liegt das Lieferdatum heute oder
 * frueher, geht der Code sofort an den Empfaenger, sonst am Lieferdatum
 * (siehe versendeFaelligeGutscheine, taeglicher Cronjob).
 */
export async function erstelleGutschein(d: GutscheinKaufDaten) {
  const fehler = pruefeGutscheinKaufDaten(d);
  if (fehler) throw new GutscheinFehler(fehler);

  const code = await erzeugeEindeutigenCode();
  const gueltigBis = new Date();
  gueltigBis.setFullYear(gueltigBis.getFullYear() + GUTSCHEIN_GUELTIGKEIT_JAHRE);
  const betragCent = d.betragEuro * 100;

  const gutschein = await prisma.gutschein.create({
    data: {
      code,
      betragCent,
      restCent: betragCent,
      gueltigBis,
      kaeuferName: d.kaeuferName.trim(),
      kaeuferEmail: d.kaeuferEmail.trim().toLowerCase(),
      empfaengerName: d.empfaengerName.trim(),
      empfaengerEmail: d.empfaengerEmail.trim().toLowerCase(),
      nachricht: d.nachricht?.trim() || null,
      lieferDatum: tagesBeginn(d.lieferDatum),
    },
  });

  await sendeGutscheinKaufBestaetigung(gutschein);
  if (gutschein.lieferDatum <= new Date()) {
    await versendeGutschein(gutschein.id);
  }
  return gutschein;
}

export async function versendeGutschein(gutscheinId: string): Promise<boolean> {
  const g = await prisma.gutschein.findUnique({ where: { id: gutscheinId } });
  if (!g || g.status === "VERSENDET") return false;
  await sendeGutscheinCode(g);
  await prisma.gutschein.update({ where: { id: g.id }, data: { status: "VERSENDET", versandtAm: new Date() } });
  return true;
}

export async function versendeFaelligeGutscheine(): Promise<{ versandt: number }> {
  const faellig = await prisma.gutschein.findMany({
    where: { status: "GEPLANT", lieferDatum: { lte: new Date() } },
  });
  let versandt = 0;
  for (const g of faellig) {
    if (await versendeGutschein(g.id)) versandt++;
  }
  return { versandt };
}

export interface GutscheinPruefung {
  gutschein: { id: string; code: string; restCent: number } | null;
  fehler: string | null;
}

/** Prueft einen eingegebenen Code, ohne ihn zu verbrauchen. */
export async function pruefeGutscheinCode(eingabe: string): Promise<GutscheinPruefung> {
  const code = normalisiereCode(eingabe);
  if (!code) return { gutschein: null, fehler: null };
  const g = await prisma.gutschein.findUnique({ where: { code } });
  if (!g) return { gutschein: null, fehler: "Diesen Gutscheincode gibt es nicht." };
  if (g.gueltigBis < new Date()) return { gutschein: null, fehler: "Dieser Gutschein ist abgelaufen." };
  if (g.restCent <= 0) return { gutschein: null, fehler: "Dieser Gutschein ist bereits aufgebraucht." };
  return { gutschein: { id: g.id, code: g.code, restCent: g.restCent }, fehler: null };
}

/**
 * Loest bis zu "bedarfCent" vom Gutschein ein. Die Abbuchung ist atomar
 * (bedingtes Update auf den gelesenen Restbetrag), damit ein Code bei
 * gleichzeitigen Kaeufen nicht doppelt verbraucht wird.
 */
export async function loeseGutscheinEin(gutscheinId: string, bedarfCent: number): Promise<number> {
  for (let versuch = 0; versuch < 3; versuch++) {
    const g = await prisma.gutschein.findUnique({ where: { id: gutscheinId } });
    if (!g || g.restCent <= 0 || g.gueltigBis < new Date()) {
      throw new GutscheinFehler("Der Gutschein kann nicht mehr eingelöst werden.");
    }
    const abzug = Math.min(g.restCent, bedarfCent);
    const res = await prisma.gutschein.updateMany({
      where: { id: g.id, restCent: g.restCent },
      data: { restCent: g.restCent - abzug },
    });
    if (res.count === 1) return abzug;
  }
  throw new GutscheinFehler("Der Gutschein wurde gerade anderweitig verwendet, bitte noch einmal versuchen.");
}

/** Macht eine Einloesung rueckgaengig, falls der Kauf danach scheitert. */
export async function gebeGutscheinFrei(gutscheinId: string, betragCent: number) {
  await prisma.gutschein.update({ where: { id: gutscheinId }, data: { restCent: { increment: betragCent } } });
}

export async function getGutscheineFuerAdmin() {
  return prisma.gutschein.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}
