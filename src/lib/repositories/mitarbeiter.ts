import "server-only";
import { prisma } from "@/lib/prisma";
import { hashePasswort, pruefePasswort } from "@/lib/auth/password";
import type { MitarbeiterRolle } from "@prisma/client";

export class MitarbeiterFehler extends Error {}

export async function findeMitarbeiterNachEmail(email: string) {
  return prisma.mitarbeiter.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function getAlleMitarbeiter() {
  return prisma.mitarbeiter.findMany({ orderBy: [{ rolle: "asc" }, { name: "asc" }] });
}

export async function erstelleMitarbeiter(params: {
  name: string;
  email: string;
  passwort: string;
  rolle: MitarbeiterRolle;
  darfUmsaetzeSehen: boolean;
}) {
  const email = params.email.trim().toLowerCase();
  if (!params.name.trim()) throw new MitarbeiterFehler("Bitte einen Namen angeben.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MitarbeiterFehler("Bitte eine gültige E-Mail-Adresse angeben.");
  if (params.passwort.length < 8) throw new MitarbeiterFehler("Das Passwort muss mindestens 8 Zeichen haben.");
  if (await findeMitarbeiterNachEmail(email)) throw new MitarbeiterFehler("Für diese E-Mail-Adresse gibt es schon einen Zugang.");

  return prisma.mitarbeiter.create({
    data: {
      name: params.name.trim(),
      email,
      passwortHash: await hashePasswort(params.passwort),
      rolle: params.rolle,
      // Trainer sehen nie Umsätze, egal was übergeben wird.
      darfUmsaetzeSehen: params.rolle === "ADMIN" && params.darfUmsaetzeSehen,
    },
  });
}

export async function aktualisiereMitarbeiter(
  id: string,
  daten: { aktiv?: boolean; rolle?: MitarbeiterRolle; darfUmsaetzeSehen?: boolean; passwort?: string },
) {
  const aktuell = await prisma.mitarbeiter.findUnique({ where: { id } });
  if (!aktuell) throw new MitarbeiterFehler("Mitarbeiter nicht gefunden.");

  const rolle = daten.rolle ?? aktuell.rolle;
  const umsatz = rolle === "ADMIN" && (daten.darfUmsaetzeSehen ?? aktuell.darfUmsaetzeSehen);
  const aktiv = daten.aktiv ?? aktuell.aktiv;

  // Es muss immer mindestens ein aktiver Admin mit Umsatzrecht übrig bleiben,
  // sonst sperrt sich das Studio aus der Mitarbeiterverwaltung aus.
  const verliertInhaberRecht =
    aktuell.aktiv && aktuell.rolle === "ADMIN" && aktuell.darfUmsaetzeSehen && !(aktiv && rolle === "ADMIN" && umsatz);
  if (verliertInhaberRecht) {
    const andere = await prisma.mitarbeiter.count({
      where: { id: { not: id }, aktiv: true, rolle: "ADMIN", darfUmsaetzeSehen: true },
    });
    if (andere === 0) {
      throw new MitarbeiterFehler("Es muss mindestens ein aktiver Admin mit Umsatzrecht übrig bleiben.");
    }
  }

  if (daten.passwort !== undefined && daten.passwort.length > 0 && daten.passwort.length < 8) {
    throw new MitarbeiterFehler("Das Passwort muss mindestens 8 Zeichen haben.");
  }

  const updated = await prisma.mitarbeiter.update({
    where: { id },
    data: {
      aktiv,
      rolle,
      darfUmsaetzeSehen: umsatz,
      ...(daten.passwort ? { passwortHash: await hashePasswort(daten.passwort) } : {}),
    },
  });

  if (!aktiv) await prisma.mitarbeiterSession.deleteMany({ where: { mitarbeiterId: id } });
  return updated;
}

/**
 * Prüft E-Mail und Passwort. Gibt es noch gar keinen Mitarbeiter, legt der
 * erste Login mit dem Passwort aus ADMIN_PASSWORT automatisch den ersten
 * Admin (mit Umsatzrecht) an. So kommt die Inhaberin ohne Skript ins System.
 */
export async function pruefeMitarbeiterLogin(emailEingabe: string, passwort: string) {
  const email = emailEingabe.trim().toLowerCase();
  if (!email || !passwort) return null;

  const anzahl = await prisma.mitarbeiter.count();
  if (anzahl === 0) {
    const startPasswort = process.env.ADMIN_PASSWORT;
    if (startPasswort && passwort === startPasswort && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return prisma.mitarbeiter.create({
        data: {
          name: "Inhaberin",
          email,
          passwortHash: await hashePasswort(passwort),
          rolle: "ADMIN",
          darfUmsaetzeSehen: true,
        },
      });
    }
    return null;
  }

  const m = await findeMitarbeiterNachEmail(email);
  if (!m || !m.aktiv) return null;
  if (!(await pruefePasswort(passwort, m.passwortHash))) return null;
  return m;
}
