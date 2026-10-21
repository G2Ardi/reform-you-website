import "server-only";
import { prisma } from "@/lib/prisma";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { erstelleKulanzGuthaben } from "@/lib/repositories/karten";
import {
  sendeBuchungsbestaetigung,
  sendeErinnerung,
  sendeGutschriftBeiAusfall,
  sendeStornoBestaetigung,
  sendeWartelisteNachruecken,
} from "@/lib/mail/versand";

/**
 * Herzstück der Buchungslogik: buchen, stornieren, umbuchen, Warteliste,
 * No-Show, Kursausfall, Erinnerungsversand. Siehe Auftrag für die genauen
 * Regeln (Stornofrist, Warteliste-Reaktionsfrist 30 Minuten, Gutschrift
 * statt Geldrückerstattung, Kulanz durch die Admin).
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

function gebuchtePlaetze(buchungen: { status: string }[]): number {
  return buchungen.filter((b) => b.status === "GEBUCHT").length;
}

export async function erstelleBuchung(params: {
  kundeId: string;
  kursTerminId: string;
  zahlungsart: "KARTE" | "EINZELZAHLUNG";
  karteId?: string;
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
  if (bereitsAktiv) {
    throw new BuchungsFehler("Sie haben diesen Termin bereits gebucht oder stehen auf der Warteliste.");
  }

  let karte = null;
  if (params.zahlungsart === "KARTE") {
    if (!params.karteId) throw new BuchungsFehler("Bitte eine Karte auswählen.");
    karte = await prisma.karte.findUnique({ where: { id: params.karteId } });
    if (!karte || karte.kundeId !== params.kundeId) {
      throw new BuchungsFehler("Diese Karte gehört nicht zu Ihrem Konto.");
    }
    if (karte.einheitenRest <= 0) throw new BuchungsFehler("Diese Karte hat kein Restguthaben mehr.");
    if (karte.gueltigBis < new Date()) throw new BuchungsFehler("Diese Karte ist abgelaufen.");
    if (karte.typ !== "GUTHABEN" && !termin.kurs.karteGueltig) {
      throw new BuchungsFehler("Für diesen Kurs kann keine Karte eingelöst werden.");
    }
  }

  const freiePlaetze = termin.kapazitaet - gebuchtePlaetze(termin.buchungen);
  const wirdWarteliste = freiePlaetze <= 0;

  const buchung = await prisma.$transaction(async (tx) => {
    if (!wirdWarteliste && karte) {
      await tx.karte.update({
        where: { id: karte.id },
        data: { einheitenRest: { decrement: 1 } },
      });
    }

    return tx.buchung.create({
      data: {
        kundeId: params.kundeId,
        kursTerminId: params.kursTerminId,
        status: wirdWarteliste ? "WARTELISTE" : "GEBUCHT",
        zahlungsart: params.zahlungsart,
        karteId: wirdWarteliste ? null : (karte?.id ?? null),
        // Zahlungsart/Kartenwunsch merken wir uns zusätzlich am Datensatz,
        // damit beim Nachrücken aus der Warteliste dieselbe Zahlungsart
        // greift (siehe bestaetigeWartelistenPlatz).
        wartelistePosition: wirdWarteliste
          ? (await tx.buchung.count({
              where: { kursTerminId: params.kursTerminId, status: "WARTELISTE" },
            })) + 1
          : null,
      },
      include: VOLLER_BEZUG,
    });
  });

  if (!wirdWarteliste) {
    await sendeBuchungsbestaetigung(buchung);
  }

  return buchung;
}

async function pruefeStornoBerechtigung(
  buchung: { kursTermin: { beginn: Date }; status: string },
  erzwingenDurchAdmin: boolean,
) {
  if (erzwingenDurchAdmin) return;
  if (buchung.status === "WARTELISTE") return; // Warteliste ist immer kostenlos stornierbar
  const einstellungen = await getEinstellungen();
  const fristEnde = new Date(
    buchung.kursTermin.beginn.getTime() - einstellungen.stornoFristStunden * 60 * 60 * 1000,
  );
  if (new Date() >= fristEnde) {
    throw new BuchungsFehler(
      `Die Stornofrist ist abgelaufen (${einstellungen.stornoFristStunden} Stunden vor Kursbeginn). Nicht mehr stornierbar.`,
    );
  }
}

export async function storniereBuchung(params: {
  buchungId: string;
  kundeId?: string;
  erzwingenDurchAdmin?: boolean;
  grund?: string;
}) {
  const buchung = await prisma.buchung.findUnique({
    where: { id: params.buchungId },
    include: VOLLER_BEZUG,
  });
  if (!buchung) throw new BuchungsFehler("Buchung nicht gefunden.");
  if (params.kundeId && buchung.kundeId !== params.kundeId) {
    throw new BuchungsFehler("Diese Buchung gehört nicht zu Ihrem Konto.");
  }
  if (buchung.status !== "GEBUCHT" && buchung.status !== "WARTELISTE") {
    throw new BuchungsFehler("Diese Buchung ist bereits storniert oder abgeschlossen.");
  }

  await pruefeStornoBerechtigung(buchung, Boolean(params.erzwingenDurchAdmin));

  const warGebucht = buchung.status === "GEBUCHT";

  await prisma.$transaction(async (tx) => {
    await tx.buchung.update({
      where: { id: buchung.id },
      data: {
        status: "STORNIERT",
        storniertAm: new Date(),
        stornoGrund: params.grund ?? (params.erzwingenDurchAdmin ? "Kulanz, durch Admin storniert" : "Von Kunde storniert"),
      },
    });

    if (warGebucht) {
      if (buchung.zahlungsart === "KARTE" && buchung.karteId) {
        const karte = await tx.karte.findUnique({ where: { id: buchung.karteId } });
        if (karte) {
          await tx.karte.update({
            where: { id: karte.id },
            data: { einheitenRest: Math.min(karte.einheitenGesamt, karte.einheitenRest + 1) },
          });
        }
      } else if (buchung.zahlungsart === "EINZELZAHLUNG") {
        // Innerhalb der Transaktion bewusst mit "tx" statt der Repository-
        // Funktion erstelleKulanzGuthaben: die nutzt den globalen Prisma-
        // Client, eine zweite Verbindung innerhalb derselben interaktiven
        // Transaktion blockiert sich sonst selbst (SQLite erlaubt nur einen
        // Schreibzugriff gleichzeitig).
        const gueltigBis = new Date();
        gueltigBis.setMonth(gueltigBis.getMonth() + 6);
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
    }
  });

  await sendeStornoBestaetigung(buchung);

  if (warGebucht) {
    await pruefeUndBenachrichtigeWarteliste(buchung.kursTerminId);
  }

  return buchung;
}

export async function umbucheBuchung(params: { buchungId: string; kundeId?: string; neuerKursTerminId: string }) {
  const alt = await prisma.buchung.findUnique({ where: { id: params.buchungId }, include: VOLLER_BEZUG });
  if (!alt) throw new BuchungsFehler("Buchung nicht gefunden.");
  if (params.kundeId && alt.kundeId !== params.kundeId) throw new BuchungsFehler("Buchung nicht gefunden.");
  if (alt.status !== "GEBUCHT") throw new BuchungsFehler("Nur bestätigte Buchungen können umgebucht werden.");

  await pruefeStornoBerechtigung(alt, false);

  const neuerTermin = await ladeTerminFuerBuchung(params.neuerKursTerminId);
  if (neuerTermin.status !== "AKTIV") throw new BuchungsFehler("Der neue Termin ist ausgefallen.");

  const freiePlaetze = neuerTermin.kapazitaet - gebuchtePlaetze(neuerTermin.buchungen);
  const wirdWarteliste = freiePlaetze <= 0;

  const neu = await prisma.$transaction(async (tx) => {
    await tx.buchung.update({
      where: { id: alt.id },
      data: { status: "STORNIERT", storniertAm: new Date(), stornoGrund: `Umgebucht auf Termin ${params.neuerKursTerminId}` },
    });

    return tx.buchung.create({
      data: {
        kundeId: alt.kundeId,
        kursTerminId: params.neuerKursTerminId,
        status: wirdWarteliste ? "WARTELISTE" : "GEBUCHT",
        zahlungsart: alt.zahlungsart,
        karteId: alt.karteId,
        wartelistePosition: wirdWarteliste
          ? (await tx.buchung.count({ where: { kursTerminId: params.neuerKursTerminId, status: "WARTELISTE" } })) + 1
          : null,
      },
      include: VOLLER_BEZUG,
    });
  });

  await pruefeUndBenachrichtigeWarteliste(alt.kursTerminId);
  if (!wirdWarteliste) await sendeBuchungsbestaetigung(neu);

  return neu;
}

const WARTELISTE_FRIST_MINUTEN = 30;

export async function pruefeUndBenachrichtigeWarteliste(kursTerminId: string) {
  const termin = await prisma.kursTermin.findUnique({
    where: { id: kursTerminId },
    include: { buchungen: true },
  });
  if (!termin || termin.status !== "AKTIV") return;

  const freie = termin.kapazitaet - gebuchtePlaetze(termin.buchungen);
  if (freie <= 0) return;

  const schonBenachrichtigt = termin.buchungen.some(
    (b) => b.status === "WARTELISTE" && b.warteBenachrichtigtAm !== null && b.warteFristBisAm && b.warteFristBisAm > new Date(),
  );
  if (schonBenachrichtigt) return;

  const naechste = await prisma.buchung.findFirst({
    where: { kursTerminId, status: "WARTELISTE", warteBenachrichtigtAm: null },
    orderBy: { createdAt: "asc" },
    include: VOLLER_BEZUG,
  });
  if (!naechste) return;

  const warteFristBisAm = new Date(Date.now() + WARTELISTE_FRIST_MINUTEN * 60_000);
  const aktualisiert = await prisma.buchung.update({
    where: { id: naechste.id },
    data: { warteBenachrichtigtAm: new Date(), warteFristBisAm },
    include: VOLLER_BEZUG,
  });

  await sendeWartelisteNachruecken(aktualisiert);
}

/** Lazy Ablaufprüfung statt echtem Cronjob: bei jedem Aufruf prüfen, ob die
 * 30-Minuten-Frist einer benachrichtigten Warteliste-Person verstrichen ist,
 * und falls ja, die Person überspringen und die nächste benachrichtigen. */
export async function pruefeWartelisteAblauf(kursTerminId: string) {
  const abgelaufen = await prisma.buchung.findMany({
    where: {
      kursTerminId,
      status: "WARTELISTE",
      warteBenachrichtigtAm: { not: null },
      warteFristBisAm: { lt: new Date() },
    },
  });

  for (const b of abgelaufen) {
    await prisma.buchung.update({
      where: { id: b.id },
      data: { status: "STORNIERT", storniertAm: new Date(), stornoGrund: "Warteliste-Frist abgelaufen" },
    });
  }

  if (abgelaufen.length > 0) {
    await pruefeUndBenachrichtigeWarteliste(kursTerminId);
  }
}

export async function bestaetigeWartelistenPlatz(buchungId: string) {
  const buchung = await prisma.buchung.findUnique({ where: { id: buchungId }, include: VOLLER_BEZUG });
  if (!buchung) throw new BuchungsFehler("Buchung nicht gefunden.");
  if (buchung.status !== "WARTELISTE") throw new BuchungsFehler("Diese Buchung steht nicht mehr auf der Warteliste.");
  if (!buchung.warteBenachrichtigtAm || !buchung.warteFristBisAm || buchung.warteFristBisAm < new Date()) {
    throw new BuchungsFehler("Die 30-Minuten-Frist für diesen Platz ist bereits abgelaufen.");
  }

  if (buchung.zahlungsart === "KARTE") {
    if (!buchung.karteId) throw new BuchungsFehler("Keine Karte hinterlegt.");
    const karte = await prisma.karte.findUnique({ where: { id: buchung.karteId } });
    if (!karte || karte.einheitenRest <= 0 || karte.gueltigBis < new Date()) {
      throw new BuchungsFehler("Ihre hinterlegte Karte reicht nicht mehr aus, bitte im Konto eine andere wählen.");
    }
    await prisma.karte.update({ where: { id: karte.id }, data: { einheitenRest: { decrement: 1 } } });
  }

  const aktualisiert = await prisma.buchung.update({
    where: { id: buchung.id },
    data: { status: "GEBUCHT", wartelistePosition: null },
    include: VOLLER_BEZUG,
  });

  await sendeBuchungsbestaetigung(aktualisiert);
  return aktualisiert;
}

export async function markiereNoShow(buchungId: string) {
  const buchung = await prisma.buchung.findUnique({ where: { id: buchungId } });
  if (!buchung || buchung.status !== "GEBUCHT") {
    throw new BuchungsFehler("Nur bestätigte Buchungen können als No-Show markiert werden.");
  }
  // No-Show: Einheit/Credit verfaellt ersatzlos, keine Erstattung.
  return prisma.buchung.update({ where: { id: buchungId }, data: { status: "NO_SHOW" } });
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
