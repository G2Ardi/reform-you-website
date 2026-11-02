import "server-only";
import type { Buchung, Gutschein, Karte, Kunde, Kurs, KursTermin, Standort } from "@prisma/client";
import { sendeMail } from "@/lib/mail/mailer";
import { erstelleIcsTermin } from "@/lib/mail/ics";
import { formatDatumUhrzeit, formatPreis } from "@/lib/format";
import { formatDatumKurz, kartenLabel } from "@/lib/credits";

/**
 * Textbausteine und Versandfunktionen für alle Mail-Anlässe: Buchungs-
 * bestätigung (mit .ics und Link zum Termin), Erinnerung, Stornobestätigung,
 * Warteliste (Platz frei), Gutschrift bei Kursausfall, Kauf von Credits,
 * Gutschein (Kauf und Code), dazu interne Benachrichtigungen ans Studio bei
 * jeder Buchung und Stornierung.
 *
 * Alle Texte in "Sie"-Form, Absender "Janina von Reform You" (siehe
 * src/lib/mail/mailer.ts). Die Links führen auf eine Seite mit Login, es
 * gibt keine Aktionen ohne Anmeldung mehr.
 */

type BuchungVoll = Buchung & {
  kunde: Kunde;
  kursTermin: KursTermin & { kurs: Kurs; standort: Standort };
  karte: Karte | null;
};

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Link zur Buchung im Kundenkonto, mit Stornieren und Verschieben. Verlangt Login. */
function buchungsLink(b: BuchungVoll): string {
  return `${baseUrl()}/${b.kursTermin.standort.slug}/konto/buchung/${b.id}`;
}

/** Link zum Kursplan am Tag des Termins. */
function kursplanLink(b: BuchungVoll): string {
  const tag = b.kursTermin.beginn.toISOString().slice(0, 10);
  return `${baseUrl()}/${b.kursTermin.standort.slug}/buchen?tag=${tag}`;
}

function studioAdresse(): string {
  return process.env.STUDIO_BENACHRICHTIGUNG_EMAIL ?? "info@reform-you.de";
}

function kursTitel(b: BuchungVoll): string {
  return `${b.kursTermin.kurs.name} · ${b.kursTermin.standort.name}`;
}

const GRUSS = ["Mit freundlichen Grüßen", "Janina von Reform You"];

export async function sendeBuchungsbestaetigung(b: BuchungVoll): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);
  const ort = [b.kursTermin.standort.strasse, b.kursTermin.standort.plz, b.kursTermin.standort.ort]
    .filter(Boolean)
    .join(", ");

  const ics = erstelleIcsTermin({
    uid: b.id,
    titel: kursTitel(b),
    beschreibung: `Buchung bei Reform You Pilates Studio. Stornieren oder verschieben: ${buchungsLink(b)}`,
    ort: ort || b.kursTermin.standort.name,
    beginn: b.kursTermin.beginn,
    ende: b.kursTermin.ende,
  });

  const zahlungsHinweis =
    b.zahlungsart === "KARTE" && b.karte
      ? [
          "1 Credit wurde abgebucht.",
          `Verbleibende Credits: ${b.karte.einheitenRest} (${kartenLabel(b.karte.typ)}), gültig bis ${formatDatumKurz(b.karte.gueltigBis)}.`,
        ]
      : [`Einzelstunde, ${formatPreis(b.kursTermin.kurs.preisEinzelCent)}, bezahlt.`];

  await sendeMail({
    an: b.kunde.email,
    betreff: `Buchungsbestätigung: ${kursTitel(b)}`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      "Ihre Buchung ist bestätigt:",
      kursTitel(b),
      `${termin} Uhr`,
      ort ? `Ort: ${ort}` : "",
      "",
      ...zahlungsHinweis,
      "",
      `Zum Termin, mit Stornieren oder Verschieben (Login erforderlich): ${buchungsLink(b)}`,
      "",
      "Den Termin finden Sie als Anhang zum Eintragen in Ihren Kalender.",
      "",
      ...GRUSS,
    ]
      .filter((z, i, arr) => z !== "" || arr[i - 1] !== "")
      .join("\n"),
    anhaenge: [{ filename: "termin.ics", content: ics, contentType: "text/calendar" }],
  });
}

export async function sendeStudioBenachrichtigungBuchung(b: BuchungVoll): Promise<void> {
  await sendeMail({
    an: studioAdresse(),
    betreff: `Neue Buchung: ${kursTitel(b)} (${b.kunde.name})`,
    text: [
      "Neue Buchung im Buchungssystem:",
      `${b.kunde.name} (${b.kunde.email}, ${b.kunde.telefon})`,
      `${kursTitel(b)}, ${formatDatumUhrzeit(b.kursTermin.beginn)} Uhr`,
      `Bezahlt mit: ${b.zahlungsart === "KARTE" ? "Credits" : "Einzelstunde"}`,
    ].join("\n"),
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
      "kleine Erinnerung an Ihren Termin:",
      kursTitel(b),
      `${termin} Uhr`,
      "",
      `Stornieren oder verschieben (Login erforderlich): ${buchungsLink(b)}`,
      "",
      ...GRUSS,
    ].join("\n"),
  });
}

export async function sendeStornoBestaetigung(
  b: BuchungVoll,
  ergebnis: { gutschrift: boolean; nachFrist: boolean },
): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);

  let gutschriftText: string;
  if (b.status === "WARTELISTE") {
    gutschriftText = "Sie stehen nicht mehr auf der Warteliste.";
  } else if (!ergebnis.gutschrift) {
    gutschriftText =
      "Die Stornierung erfolgte nach Ablauf der Stornofrist. Es gibt dafür keine Gutschrift, der Platz wird für die Warteliste frei.";
  } else if (b.zahlungsart === "KARTE") {
    gutschriftText = b.karte
      ? `Der Credit wurde Ihnen wieder gutgeschrieben, die Credits sind weiter gültig bis ${formatDatumKurz(b.karte.gueltigBis)}.`
      : "Der Credit wurde Ihnen wieder gutgeschrieben.";
  } else {
    gutschriftText = "Der Betrag wurde Ihnen als Guthaben (1 Credit) gutgeschrieben, nicht als Geldrückerstattung.";
  }

  await sendeMail({
    an: b.kunde.email,
    betreff: `Stornierung bestätigt: ${kursTitel(b)}`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      `Ihre Buchung für ${kursTitel(b)} am ${termin} Uhr wurde storniert.`,
      gutschriftText,
      "",
      ...GRUSS,
    ].join("\n"),
  });

  await sendeMail({
    an: studioAdresse(),
    betreff: `Stornierung: ${kursTitel(b)} (${b.kunde.name})`,
    text: [
      "Stornierung im Buchungssystem:",
      `${b.kunde.name} (${b.kunde.email}, ${b.kunde.telefon})`,
      `${kursTitel(b)}, ${termin} Uhr`,
      `Zahlungsart: ${b.zahlungsart === "KARTE" ? "Credits" : "Einzelstunde"}`,
      b.status === "WARTELISTE"
        ? "Hinweis: Eintrag auf der Warteliste."
        : ergebnis.gutschrift
          ? "Gutschrift erteilt."
          : "Nach Ablauf der Stornofrist, keine Gutschrift.",
    ].join("\n"),
  });
}

export async function sendeWartelistePlatzFrei(b: BuchungVoll): Promise<void> {
  const termin = formatDatumUhrzeit(b.kursTermin.beginn);
  await sendeMail({
    an: b.kunde.email,
    betreff: `Ein Platz ist frei geworden: ${kursTitel(b)}`,
    text: [
      `Guten Tag ${b.kunde.name},`,
      "",
      `gute Nachricht: in ${kursTitel(b)} am ${termin} Uhr ist ein Platz frei geworden.`,
      "Der Platz ist nicht reserviert. Wer zuerst bucht, bekommt ihn.",
      "",
      `Jetzt buchen: ${kursplanLink(b)}`,
      "",
      ...GRUSS,
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
      ...GRUSS,
    ].join("\n"),
  });
}

export async function sendeCreditsKauf(kunde: Kunde, karte: Karte, bezahltCent: number): Promise<void> {
  await sendeMail({
    an: kunde.email,
    betreff: `Ihr Kauf: ${kartenLabel(karte.typ)}`,
    text: [
      `Guten Tag ${kunde.name},`,
      "",
      `vielen Dank für Ihren Kauf: ${kartenLabel(karte.typ)}.`,
      `Gültig bis ${formatDatumKurz(karte.gueltigBis)}, an beiden Standorten einlösbar. Eine Buchung kostet 1 Credit.`,
      bezahltCent > 0 ? `Bezahlt: ${formatPreis(bezahltCent)}.` : "Der Betrag wurde mit einem Gutschein beglichen.",
      "",
      ...GRUSS,
    ].join("\n"),
  });
}

export async function sendeGutscheinKaufBestaetigung(g: Gutschein): Promise<void> {
  const tag = formatDatumKurz(g.lieferDatum);
  await sendeMail({
    an: g.kaeuferEmail,
    betreff: "Ihre Gutschein-Bestellung bei Reform You",
    text: [
      `Guten Tag ${g.kaeuferName},`,
      "",
      `vielen Dank für Ihre Bestellung: Gutschein über ${formatPreis(g.betragCent)} für ${g.empfaengerName}.`,
      `Der Code geht am ${tag} per E-Mail an ${g.empfaengerEmail}.`,
      `Der Gutschein ist bis ${formatDatumKurz(g.gueltigBis)} gültig.`,
      "",
      ...GRUSS,
    ].join("\n"),
  });
}

export async function sendeGutscheinCode(g: Gutschein): Promise<void> {
  await sendeMail({
    an: g.empfaengerEmail,
    betreff: `${g.kaeuferName} schenkt Ihnen einen Gutschein von Reform You`,
    text: [
      `Hallo ${g.empfaengerName},`,
      "",
      `${g.kaeuferName} schenkt Ihnen einen Gutschein über ${formatPreis(g.betragCent)} für das Reform You Pilates Studio.`,
      g.nachricht ? `\nNachricht von ${g.kaeuferName}:\n${g.nachricht}\n` : "",
      `Ihr Gutscheincode: ${g.code}`,
      "",
      `Einlösen: Auf der Website einen Kurs oder Credits wählen und im Bezahlschritt den Code eingeben. Gültig bis ${formatDatumKurz(g.gueltigBis)}, an beiden Standorten.`,
      "",
      ...GRUSS,
    ]
      .filter((z, i, arr) => z !== "" || arr[i - 1] !== "")
      .join("\n"),
  });
}
