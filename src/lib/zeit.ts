/**
 * Datum und Uhrzeit in deutscher Zeit (Europe/Berlin), unabhaengig von der
 * Zeitzone des Servers. Der Admin traegt Kurszeiten so ein, wie sie im Studio
 * gelten, gespeichert wird der exakte Zeitpunkt (UTC).
 */
const TZ = "Europe/Berlin";

const formatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Zerlegt einen Zeitpunkt in Berliner Datum "JJJJ-MM-TT" und Uhrzeit "HH:MM". */
export function berlinTeile(d: Date): { datum: string; zeit: string } {
  const [datum, zeit] = formatter.format(d).split(" ");
  return { datum, zeit };
}

/** Wandelt Berliner Datum und Uhrzeit in den exakten Zeitpunkt um (beachtet Sommer- und Winterzeit). */
export function berlinZuDate(datum: string, zeit: string): Date {
  const [y, m, d] = datum.split("-").map(Number);
  const [h, mi] = zeit.split(":").map(Number);
  const gewuenscht = Date.UTC(y, m - 1, d, h, mi);
  let versuch = gewuenscht;
  for (let i = 0; i < 3; i++) {
    const t = berlinTeile(new Date(versuch));
    const [yy, mm, dd] = t.datum.split("-").map(Number);
    const [hh, mn] = t.zeit.split(":").map(Number);
    versuch += gewuenscht - Date.UTC(yy, mm - 1, dd, hh, mn);
  }
  return new Date(versuch);
}

export function istDatum(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T12:00:00Z`));
}

export function istUhrzeit(text: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

/** Addiert Kalendertage zu einem Datum "JJJJ-MM-TT". */
export function addTageZuDatum(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

export function heuteBerlin(): string {
  return berlinTeile(new Date()).datum;
}
