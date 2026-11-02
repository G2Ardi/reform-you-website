import "server-only";
import { prisma } from "@/lib/prisma";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { erstelleKulanzGuthaben } from "@/lib/repositories/karten";
import { GUTHABEN_LAUFZEIT_MONATE } from "@/lib/credits";
import {
  sendeBuchungsbestaetigung,
  sendeErinnerung,
  sendeGutschriftBeiAusfall,
  sendeStornoBestaetigung,
  sendeStudioBenachrichtigungBuchung,
  sendeWartelistePlatzFrei,
} from "@/lib/mail/versand";

/**
 * Herzstück der Buchungslogik: buchen, stornieren, umbuchen, Warteliste,
 * Anwesenheit, Kursausfall, Erinnerungsversand.
 *
 * Regeln (Stand November 2026, mit Janina abgestimmt):
 * - Eine Buchung kostet 1 Credit oder eine bezahlte Einzelstunde.
 * - Storno vor Ablauf der Stornofrist: Credit zurück auf dieselbe Karte,
 *   bei Einzelzahlung 1 Credit Guthaben (kein Geld zurück).
 * - Storno nach Ablauf der Frist ist erlaubt, aber ohne Gutschrift. Der
 *   Platz wird frei und die Warteliste wird informiert.
 * - Warteliste: Alle Wartenden werden informiert, wenn ein Platz frei wird.
 *   Es gibt keine Reservierung und kein Zeitlimit. Wer zuerst bucht, bekommt
 *   den Platz.
 * - Umbuchen nur vor Ablauf der Stornofrist, danach gilt Storno ohne
 *   Gutschrift und eine neue Buchung für 1 Credit.
 */

const VOLLER_BEZUG = {
  kunde: true,
  karte: true,
  kursTermin: { include: { kurs: true, standort: true } },
} as const;

export class BuchungsFehler extends Error {}

async function ladeTerminFuerBuchung(kursTerminId: string) {
  const termin = await prisma.kursTermin.findUnique({
    where: { id: kursTerminId },
    include: { kurs: true, standort: true, buchungen: true },
  });
  if (!termin) throw new BuchungsFehler("Termin nicht gefunden.");
  return termin;
}

/** Belegt einen Platz: gebucht oder bereits als anwesend markiert. */
function gebuchtePlaetze(buchungen: { status: string }[]): number {
  return buchungen.filter((b) => b.status === "GEBUCHT" || b.status === "ANWESEND").length;
}

export function stornoFristEnde(beginn: Date, fristStunden: number): Date {
  return new Date(beginn.getTime() - fristStunden * 60 * 60 * 1000);
}

export async function istStornoFristAbgelaufen(beginn: Date): Promise<boolean> {
  const einstellungen = await getEinstellungen();
  return new Date() >= stornoFristEnde(beginn, einstellungen.stornoFristStunden);
}

export async function erstelleBuchung(params: {
  kundeId: string;
  kursTerminId: string;
  zahlungsart: "KARTE" | "EINZELZAHLUNG";
  karteId?: string;
  /** Beim Kauf einer Einzelstunde: nicht auf die Warteliste ausweichen, sonst
   * wuerde der Kunde fuer einen Platz zahlen, den er nicht bekommt. */
  nurBeiFreiemPlatz?: boolean;
}) {
  const termin = await ladeTerminFuerBuchung(params.kursTerminId);

  if (termin.status !== "AKTIV") {
    throw new BuchungsFehler("Dieser Termin ist ausgefallen und kann nicht gebucht werden.");
  }
  const spaetesteBuchung = new Date(termin.beginn.getTime() - 15 * 60_000);
  if (new Date() >= spaetesteBuchung) {
    throw new BuchungsFehler("Dieser Termin ist nicht mehr buchbar (weniger als 15 Minuten vorher).");
  }

  const bereitsAktiv = await prisma.buchung.findFirst({
    where: {
      kundeId: params.kundeId,
      kursTerminId: params.kursTerminId,
      status: { in: ["GEBUCHT", "WARTELISTE"] },
    },
  });
  const freiePlaetze = termin.kapazitaet - gebuchtePlaetze(termin.buchungen);
  const wirdWarteliste = freiePlaetze <= 0;

  if (bereitsAktiv?.status === "GEBUCHT") {
    throw new BuchungsFehler("Du hast diesen Termin bereits gebucht.");
  }
  if (bereitsAktiv?.status === "WARTELISTE" && wirdWarteliste) {
    throw new BuchungsFehler("Du stehst für diesen Termin bereits auf der Warteliste.");
  }
  if (wirdWarteliste && params.nurBeiFreiemPlatz) {
    throw new BuchungsFehler("Dieser Termin ist inzwischen voll. Es wurde nichts abgebucht.");
  }

  let karte = null;
  if (params.zahlungsart === "KARTE" && !wirdWarteliste) {
    if (!params.karteId) throw new BuchungsFehler("Bitte Credits auswählen.");
    karte = await prisma.karte.findUnique({ where: { id: params.karteId } });
    if (!karte || karte.kundeId !== params.kundeId) {
      throw new BuchungsFehler("Diese Credits gehören nicht zu deinem Konto.");
    }
    if (karte.einheitenRest <= 0) throw new BuchungsFehler("Diese Credits sind aufgebraucht.");
    if (karte.gueltigBis < new Date()) throw new BuchungsFehler("Diese Credits sind abgelaufen.");
    if (karte.typ !== "GUTHABEN" && !termin.kurs.karteGueltig) {
      throw new BuchungsFehler("Für diesen Kurs können keine Credits eingelöst werden.");
    }
  }

  const buchung = await prisma.$transaction(async (tx) => {
    // Auf der Warteliste wird nichts abgebucht, die Zahlung folgt erst, wenn
    // aus dem Wartelisteneintrag eine echte Buchung wird.
    if (!wirdWarteliste && karte) {
      const res = await tx.karte.updateMany({
        where: { id: karte.id, einheitenRest: { gt: 0 } },
        data: { einheitenRest: { decrement: 1 } },
      });
      if (res.count !== 1) throw new BuchungsFehler("Diese Credits sind aufgebraucht.");
    }

    // Eigener Wartelisteneintrag wird zur echten Buchung hochgestuft.
    if (bereitsAktiv?.status === "WARTELISTE" && !wirdWarteliste) {
      return tx.buchung.update({
        where: { id: bereitsAktiv.id },
        data: {
          status: "GEBUCHT",
          zahlungsart: params.zahlungsart,
          karteId: karte?.id ?? null,
          wartelistePosition: null,
        },
        include: VOLLER_BEZUG,
      });
    }

    return tx.buchung.create({
      data: {
        kundeId: params.kundeId,
        kursTerminId: params.kursTerminId,
        status: wirdWarteliste ? "WARTELISTE" : "GEBUCHT",
        zahlungsart: params.zahlungsart,
        karteId: wirdWarteliste ? null : (karte?.id ?? null),
        wartelistePosition: wirdWarteliste
          ? (await tx.buchung.count({
              where: { kursTerminId: params.kursTerminId, status: "WARTELISTE" },
            })) + 1
          : null,
      },
      include: VOLLER_BEZUG,
    });
  });

  if (buchung.status === "GEBUCHT") {
    await sendeBuchungsbestaetigung(buchung);
    await sendeStudioBenachrichtigungBuchung(buchung);
  }

  return buchung;
}

export interface StornoErgebnis {
  buchung: Awaited<ReturnType<typeof ladeBuchungVoll>>;
  gutschrift: boolean;
  nachFrist: boolean;
}

async function ladeBuchungVoll(buchungId: string) {
  return prisma.buchung.findUnique({ where: { id: buchungId }, include: VOLLER_BEZUG });
}

export async function storniereBuchung(params: {
  buchungId: string;
  kundeId?: string;
  erzwingenDurchAdmin?: boolean;
  grund?: string;
}): Promise<StornoErgebnis> {
  const buchung = await ladeBuchungVoll(params.buchungId);
  if (!buchung) throw new BuchungsFehler("Buchung nicht gefunden.");
  if (params.kundeId && buchung.kundeId !== params.kundeId) {
    throw new BuchungsFehler("Diese Buchung gehört nicht zu deinem Konto.");
  }
  if (buchung.status !== "GEBUCHT" && buchung.status !== "WARTELISTE") {
    throw new BuchungsFehler("Diese Buchung ist bereits storniert oder abgeschlossen.");
  }
  if (buchung.kursTermin.beginn < new Date() && !params.erzwingenDurchAdmin) {
    throw new BuchungsFehler("Dieser Termin hat bereits begonnen und kann nicht mehr storniert werden.");
  }

  const warGebucht = buchung.status === "GEBUCHT";
  // Warteliste ist immer kostenlos stornierbar. Bei einer gebuchten Stunde
  // gibt es nach Fristablauf keine Gutschrift, ausser der Admin gibt Kulanz.
  const nachFrist = warGebucht && (await istStornoFristAbgelaufen(buchung.kursTermin.beginn));
  const gutschrift = warGebucht && (!nachFrist || Boolean(params.erzwingenDurchAdmin));

  const standardGrund = params.erzwingenDurchAdmin
    ? "Kulanz, durch Admin storniert"
    : nachFrist
      ? "Von Kunde nach Ablauf der Stornofrist storniert, keine Gutschrift"
      : "Von Kunde storniert";

  await prisma.$transaction(async (tx) => {
    await tx.buchung.update({
      where: { id: buchung.id },
      data: { status: "STORNIERT", storniertAm: new Date(), stornoGrund: params.grund ?? standardGrund },
    });

    if (!gutschrift) return;

    if (buchung.zahlungsart === "KARTE" && buchung.karteId) {
      const karte = await tx.karte.findUnique({ where: { id: buchung.karteId } });
      if (karte) {
        // Ablaufdatum der Credits bleibt unverändert, auch bei kurzer Restlaufzeit.
        await tx.karte.update({
          where: { id: karte.id },
          data: { einheitenRest: Math.min(karte.einheitenGesamt, karte.einheitenRest + 1) },
        });
      }
    } else if (buchung.zahlungsart === "EINZELZAHLUNG") {
      // Kein Geld zurück: 1 Credit Guthaben. Innerhalb der Transaktion bewusst
      // mit "tx" statt der Repository-Funktion, siehe erstelleKulanzGuthaben.
      const gueltigBis = new Date();
      gueltigBis.setMonth(gueltigBis.getMonth() + GUTHABEN_LAUFZEIT_MONATE);
      await tx.karte.create({
        data: {
          kundeId: buchung.kundeId,
          typ: "GUTHABEN",
          einheitenGesamt: 1,
          einheitenRest: 1,
          gueltigBis,
          notiz: `Guthaben aus Stornierung der Einzelbuchung ${buchung.id}`,
        },
      });
    }
  });

  await sendeStornoBestaetigung(buchung, { gutschrift, nachFrist });

  if (warGebucht) {
    await benachrichtigeWarteliste(buchung.kursTerminId);
  }

  return { buchung, gutschrift, nachFrist };
}

/** Termine, auf die eine bestehende Buchung ohne Aufpreis verschoben werden
 * darf: gleiche Credits-Eignung, bei Einzelzahlung gleicher Einzelpreis,
 * freier Platz, beide Standorte. */
export async function getUmbuchOptionen(buchungId: string) {
  const alt = await prisma.buchung.findUnique({ where: { id: buchungId }, include: VOLLER_BEZUG });
  if (!alt) return [];

  const nurKarteGueltig = alt.zahlungsart === "KARTE" && alt.karte?.typ !== "GUTHABEN";
  const kandidaten = await prisma.kursTermin.findMany({
    where: {
      status: "AKTIV",
      beginn: { gte: new Date(Date.now() + 15 * 60_000) },
      id: { not: alt.kursTerminId },
      kurs: {
        ...(nurKarteGueltig ? { karteGueltig: true } : {}),
        ...(alt.zahlungsart === "EINZELZAHLUNG" ? { preisEinzelCent: alt.kursTermin.kurs.preisEinzelCent } : {}),
      },
    },
    include: { kurs: true, standort: true, buchungen: true },
    orderBy: { beginn: "asc" },
    take: 60,
  });
  return kandidaten.filter((t) => t.kapazitaet - gebuchtePlaetze(t.buchungen) > 0);
}

export async function umbucheBuchung(params: { buchungId: string; kundeId?: string; neuerKursTerminId: string }) {
  const alt = await ladeBuchungVoll(params.buchungId);
  if (!alt) throw new BuchungsFehler("Buchung nicht gefunden.");
  if (params.kundeId && alt.kundeId !== params.kundeId) throw new BuchungsFehler("Buchung nicht gefunden.");
  if (alt.status !== "GEBUCHT") throw new BuchungsFehler("Nur bestätigte Buchungen können verschoben werden.");

  if (await istStornoFristAbgelaufen(alt.kursTermin.beginn)) {
    throw new BuchungsFehler(
      "Die Frist ist abgelaufen. Du kannst die Buchung noch stornieren (ohne Gutschrift) und einen neuen Kurs für 1 Credit buchen.",
    );
  }

  const neuerTermin = await ladeTerminFuerBuchung(params.neuerKursTerminId);
  if (neuerTermin.status !== "AKTIV") throw new BuchungsFehler("Der neue Termin ist ausgefallen.");
  if (neuerTermin.beginn.getTime() - 15 * 60_000 <= Date.now()) {
    throw new BuchungsFehler("Der neue Termin ist nicht mehr buchbar.");
  }
  if (alt.zahlungsart === "KARTE" && alt.karte?.typ !== "GUTHABEN" && !neuerTermin.kurs.karteGueltig) {
    throw new BuchungsFehler("Für diesen Kurs können keine Credits eingelöst werden.");
  }
  if (alt.zahlungsart === "EINZELZAHLUNG" && neuerTermin.kurs.preisEinzelCent !== alt.kursTermin.kurs.preisEinzelCent) {
    throw new BuchungsFehler("Dieser Kurs kostet etwas anderes. Bitte stornieren und neu buchen.");
  }

  const bereitsGebucht = await prisma.buchung.findFirst({
    where: { kundeId: alt.kundeId, kursTerminId: params.neuerKursTerminId, status: { in: ["GEBUCHT", "WARTELISTE"] } },
  });
  if (bereitsGebucht && bereitsGebucht.status === "GEBUCHT") {
    throw new BuchungsFehler("Für diesen Termin bist du bereits gebucht.");
  }

  if (neuerTermin.kapazitaet - gebuchtePlaetze(neuerTermin.buchungen) <= 0) {
    throw new BuchungsFehler("Der neue Termin ist voll. Tritt der Warteliste im Kursplan bei und storniere danach diese Buchung.");
  }

  const neu = await prisma.$transaction(async (tx) => {
    await tx.buchung.update({
      where: { id: alt.id },
      data: { status: "STORNIERT", storniertAm: new Date(), stornoGrund: `Verschoben auf Termin ${params.neuerKursTerminId}` },
    });

    if (bereitsGebucht?.status === "WARTELISTE") {
      await tx.buchung.update({
        where: { id: bereitsGebucht.id },
        data: { status: "STORNIERT", storniertAm: new Date(), stornoGrund: "Durch Verschieben ersetzt" },
      });
    }

    return tx.buchung.create({
      data: {
        kundeId: alt.kundeId,
        kursTerminId: params.neuerKursTerminId,
        status: "GEBUCHT",
        zahlungsart: alt.zahlungsart,
        karteId: alt.karteId,
      },
      include: VOLLER_BEZUG,
    });
  });

  await benachrichtigeWarteliste(alt.kursTerminId);
  await sendeBuchungsbestaetigung(neu);
  await sendeStudioBenachrichtigungBuchung(neu);

  return neu;
}

/**
 * Wird ein Platz frei, bekommen alle Wartenden dieses Termins eine Mail mit
 * Link zum Kursplan. Es gibt keine Reservierung: wer zuerst bucht, bekommt
 * den Platz. Wer schon eine Mail zu diesem freien Platz hat, bekommt keine
 * zweite.
 */
export async function benachrichtigeWarteliste(kursTerminId: string) {
  const termin = await prisma.kursTermin.findUnique({
    where: { id: kursTerminId },
    include: { buchungen: true },
  });
  if (!termin || termin.status !== "AKTIV") return;
  if (termin.beginn < new Date()) return;

  const freie = termin.kapazitaet - gebuchtePlaetze(termin.buchungen);
  if (freie <= 0) return;

  const wartende = await prisma.buchung.findMany({
    where: { kursTerminId, status: "WARTELISTE" },
    include: VOLLER_BEZUG,
    orderBy: { createdAt: "asc" },
  });

  for (const w of wartende) {
    await sendeWartelistePlatzFrei(w);
    await prisma.buchung.update({ where: { id: w.id }, data: { warteBenachrichtigtAm: new Date() } });
  }
}

export async function markiereNoShow(buchungId: string) {
  const buchung = await prisma.buchung.findUnique({ where: { id: buchungId } });
  if (!buchung || (buchung.status !== "GEBUCHT" && buchung.status !== "ANWESEND")) {
    throw new BuchungsFehler("Nur bestätigte Buchungen können als No-Show markiert werden.");
  }
  // No-Show: Einheit/Credit verfaellt ersatzlos, keine Erstattung.
  return prisma.buchung.update({ where: { id: buchungId }, data: { status: "NO_SHOW" } });
}

export async function markiereAnwesend(buchungId: string) {
  const buchung = await prisma.buchung.findUnique({ where: { id: buchungId } });
  if (!buchung || (buchung.status !== "GEBUCHT" && buchung.status !== "NO_SHOW")) {
    throw new BuchungsFehler("Nur bestätigte Buchungen können als anwesend markiert werden.");
  }
  return prisma.buchung.update({ where: { id: buchungId }, data: { status: "ANWESEND" } });
}

export async function lasseKursAusfallen(kursTerminId: string) {
  const termin = await prisma.kursTermin.findUnique({
    where: { id: kursTerminId },
    include: { buchungen: { include: VOLLER_BEZUG } },
  });
  if (!termin) throw new BuchungsFehler("Termin nicht gefunden.");

  await prisma.kursTermin.update({
    where: { id: kursTerminId },
    data: { status: "AUSGEFALLEN", ausgefallenAm: new Date() },
  });

  let gutgeschrieben = 0;
  for (const buchung of termin.buchungen) {
    if (buchung.status === "GEBUCHT") {
      await prisma.buchung.update({
        where: { id: buchung.id },
        data: { status: "STORNIERT", storniertAm: new Date(), stornoGrund: "Kursausfall durch Studio" },
      });
      if (buchung.zahlungsart === "KARTE" && buchung.karteId) {
        const karte = await prisma.karte.findUnique({ where: { id: buchung.karteId } });
        if (karte) {
          await prisma.karte.update({
            where: { id: karte.id },
            data: { einheitenRest: Math.min(karte.einheitenGesamt, karte.einheitenRest + 1) },
          });
        }
      } else {
        await erstelleKulanzGuthaben(buchung.kundeId, 1, `Gutschrift wegen Kursausfall, Termin ${kursTerminId}`);
      }
      await sendeGutschriftBeiAusfall(buchung);
      gutgeschrieben++;
    } else if (buchung.status === "WARTELISTE") {
      await prisma.buchung.update({
        where: { id: buchung.id },
        data: { status: "STORNIERT", storniertAm: new Date(), stornoGrund: "Kursausfall durch Studio" },
      });
    }
  }

  return { gutgeschrieben };
}

export async function versendeFaelligeErinnerungen() {
  const einstellungen = await getEinstellungen();
  const jetzt = new Date();
  const fensterEnde = new Date(jetzt.getTime() + einstellungen.erinnerungStundenVorher * 60 * 60 * 1000);

  const faellig = await prisma.buchung.findMany({
    where: {
      status: "GEBUCHT",
      erinnertAm: null,
      kursTermin: { beginn: { gte: jetzt, lte: fensterEnde }, status: "AKTIV" },
    },
    include: VOLLER_BEZUG,
  });

  let versandt = 0;
  for (const buchung of faellig) {
    await sendeErinnerung(buchung);
    await prisma.buchung.update({ where: { id: buchung.id }, data: { erinnertAm: new Date() } });
    versandt++;
  }

  return { versandt, geprueft: faellig.length };
}

export async function getBuchungenFuerKunde(kundeId: string) {
  return prisma.buchung.findMany({
    where: { kundeId },
    include: { kursTermin: { include: { kurs: true, standort: true } }, karte: true },
    orderBy: { kursTermin: { beginn: "desc" } },
  });
}

export async function getBuchungMitBezug(buchungId: string) {
  return prisma.buchung.findUnique({ where: { id: buchungId }, include: VOLLER_BEZUG });
}
