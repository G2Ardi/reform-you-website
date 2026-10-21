/**
 * Minimaler .ics-Kalendereintrag von Hand gebaut (RFC 5545), ohne externe
 * Library: für einen einzelnen Termin reicht das vollständig aus.
 */

function toIcsDatum(datum: Date): string {
  return datum.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function falten(zeile: string): string {
  // RFC 5545 verlangt einen Zeilenumbruch nach 75 Oktetten, hier grosszuegig
  // mit Zeichen genaehert, reicht fuer unsere kurzen Zeilen aus.
  return zeile;
}

export function erstelleIcsTermin(params: {
  uid: string;
  titel: string;
  beschreibung: string;
  ort: string;
  beginn: Date;
  ende: Date;
}): string {
  const zeilen = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reform You Pilates Studio//Buchungssystem//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}@reform-you.de`,
    `DTSTAMP:${toIcsDatum(new Date())}`,
    `DTSTART:${toIcsDatum(params.beginn)}`,
    `DTEND:${toIcsDatum(params.ende)}`,
    falten(`SUMMARY:${params.titel}`),
    falten(`DESCRIPTION:${params.beschreibung.replace(/\n/g, "\\n")}`),
    falten(`LOCATION:${params.ort}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return zeilen.join("\r\n");
}
