import "server-only";
import type { Buchung, Karte, Kunde, Kurs, KursTermin, Standort } from "@prisma/client";
import { sendeMail } from "@/lib/mail/mailer";
import { erstelleIcsTermin } from "@/lib/mail/ics";
import { erstelleAktionsToken } from "@/lib/auth/actionToken";
import { formatDatumUhrzeit, formatPreis } from "@/lib/format";

/**
 * Textbausteine und Versandfunktionen für alle in der Aufgabe geforderten
 * Mail-Anlässe: Buchungsbestätigung (mit .ics), Erinnerung (mit Storno-/
 * Umbuchen-Link), Storno-Bestätigung, Warteliste-Nachrücken, automatische
 * Gutschrift bei Kursausfall, dazu eine interne Benachrichtigung ans
 * Studio bei jeder Stornierung.
 *
 * Alle Texte in "Sie"-Form, Absender "Janina von Reform You" (siehe
 * src/lib/mail/mailer.ts).
 */

type BuchungVoll = Buchung & {
  kunde: Kunde;
  kursTermin: KursTermin & { kurs: Kurs; standort: Standort };
  karte: Karte | null;
};

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

function aktionsLink(buchungId: string, aktion: "storno" | "umbuchen" | "warteliste-bestaetigen"): string {
  const token = erstelleAktionsToken(buchungId, aktion);
  return `${baseUrl()}/aktion/${token}`;
}

function kursTitel(b: BuchungVoll): string {
  return `${b.kursTermin.kurs.name} · ${b.kursTermin.standort.name}`;
}

export async function sendeBuchungsbestaetigung(b: BuchungVoll): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);
  const ort = [b.kursTermin.standort.strasse, b.kursTermin.standort.plz, b.kursTermin.standort.ort]
    .filter(Boolean)
    .join(", ");

  const ics = erstelleIcsTermin({
    uid: b.id,
    titel: kursTitel(b),
    beschreibung: `Buchung bei Reform You Pilates Studio. Stornieren oder umbuchen: ${aktionsLink(b.id, "storno")}`,
    ort: ort || b.kursTermin.standort.name,
    beginn: b.kursTermin.beginn,
    ende: b.kursTermin.ende,
  });

  const zahlungsHinweis =
    b.zahlungsart === "KARTE"
      ? "Die Einheit wurde von Ihrer Karte abgebucht."
      : `Einzelbuchung, ${formatPreis(b.kursTermin.kurs.preisEinzelCent)}, Zahlung vor Ort bzw. laut Absprache.`;

  await sendeMail({
    an: b.kunde.email,
    betreff: `Buchungsbestätigung: ${kursTitel(b)}`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      `Ihre Buchung ist bestätigt:`,
      `${kursTitel(b)}`,
      `${termin} Uhr`,
      ort ? `Ort: ${ort}` : "",
      "",
      zahlungsHinweis,
      "",
      `Stornieren oder umbuchen können Sie hier: ${aktionsLink(b.id, "storno")}`,
      "",
      "Den Termin finden Sie als Anhang zum Eintragen in Ihren Kalender.",
      "",
      "Mit freundlichen Grüßen",
      "Janina von Reform You",
    ]
      .filter(Boolean)
      .join("\n"),
    anhaenge: [{ filename: "termin.ics", content: ics, contentType: "text/calendar" }],
  });
}

export async function sendeErinnerung(b: BuchungVoll): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);
  await sendeMail({
    an: b.kunde.email,
    betreff: `Erinnerung: ${kursTitel(b)} steht bevor`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      `kleine Erinnerung an Ihren Termin:`,
      `${kursTitel(b)}`,
      `${termin} Uhr`,
      "",
      "Können Sie doch nicht kommen? Ohne sich erneut anzumelden:",
      `Stornieren: ${aktionsLink(b.id, "storno")}`,
      `Umbuchen: ${aktionsLink(b.id, "umbuchen")}`,
      "",
      "Mit freundlichen Grüßen",
      "Janina von Reform You",
    ].join("\n"),
  });
}

export async function sendeStornoBestaetigung(b: BuchungVoll): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);
  await sendeMail({
    an: b.kunde.email,
    betreff: `Stornierung bestätigt: ${kursTitel(b)}`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      `Ihre Buchung für ${kursTitel(b)} am ${termin} Uhr wurde storniert.`,
      b.zahlungsart === "KARTE"
        ? "Die Einheit wurde Ihrer Karte wieder gutgeschrieben."
        : "Der Betrag wurde Ihnen als Guthaben gutgeschrieben, nicht als Geldrückerstattung.",
      "",
      "Mit freundlichen Grüßen",
      "Janina von Reform You",
    ].join("\n"),
  });

  const studioAdresse = process.env.STUDIO_BENACHRICHTIGUNG_EMAIL;
  if (studioAdresse) {
    await sendeMail({
      an: studioAdresse,
      betreff: `Stornierung: ${kursTitel(b)} (${b.kunde.name})`,
      text: [
        `Stornierung im Buchungssystem:`,
        `${b.kunde.name} (${b.kunde.email})`,
        `${kursTitel(b)}, ${termin} Uhr`,
        `Zahlungsart: ${b.zahlungsart}`,
      ].join("\n"),
    });
  }
}

export async function sendeWartelisteNachruecken(b: BuchungVoll): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);
  await sendeMail({
    an: b.kunde.email,
    betreff: `Ein Platz ist frei geworden: ${kursTitel(b)}`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      `gute Nachricht: in ${kursTitel(b)} am ${termin} Uhr ist ein Platz frei geworden, Sie stehen als Nächstes auf der Warteliste.`,
      "",
      `Bestätigen Sie Ihren Platz innerhalb von 30 Minuten hier: ${aktionsLink(b.id, "warteliste-bestaetigen")}`,
      "Reagieren Sie nicht rechtzeitig, rückt die nächste Person auf der Warteliste nach.",
      "",
      "Mit freundlichen Grüßen",
      "Janina von Reform You",
    ].join("\n"),
  });
}

export async function sendeGutschriftBeiAusfall(b: BuchungVoll): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);
  await sendeMail({
    an: b.kunde.email,
    betreff: `Kurs ausgefallen: ${kursTitel(b)}`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      `leider musste ${kursTitel(b)} am ${termin} Uhr ausfallen.`,
      "Sie erhalten dafür automatisch eine Gutschrift.",
      "",
      "Es tut uns leid für die kurzfristige Absage.",
      "",
      "Mit freundlichen Grüßen",
      "Janina von Reform You",
    ].join("\n"),
  });
}
