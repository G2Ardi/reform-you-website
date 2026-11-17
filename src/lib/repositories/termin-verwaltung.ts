import "server-only";
import { prisma } from "@/lib/prisma";
import { benachrichtigeWarteliste } from "@/lib/repositories/buchungen";
import { addTageZuDatum, berlinTeile, berlinZuDate, heuteBerlin, istDatum, istUhrzeit } from "@/lib/zeit";

/**
 * Terminverwaltung für den Admin-Bereich: Kurstermine anlegen (einzeln oder
 * wöchentlich wiederholt), ändern und löschen. Termine mit Buchungen bleiben
 * geschützt: Datum und Uhrzeit ändern oder löschen geht erst, wenn niemand
 * mehr gebucht ist. Sonst gilt "Kurs ausfallen lassen", das benachrichtigt
 * alle und schreibt Credits gut.
 */

export class TerminFehler extends Error {}

const MAX_TERMINE_PRO_AKTION = 60;
const MAX_TAGE_WIEDERHOLUNG = 371;

export interface VerwaltungsKurs {
  id: string;
  name: string;
  dauerMinuten: number;
  plaetze: number;
}
export interface VerwaltungsStandort {
  id: string;
  name: string;
  kurse: VerwaltungsKurs[];
}

export async function getStandorteMitKursen(): Promise<VerwaltungsStandort[]> {
  const standorte = await prisma.standort.findMany({
    where: { aktiv: true },
    orderBy: { reihenfolge: "asc" },
    include: { kurse: { where: { aktiv: true }, orderBy: { reihenfolge: "asc" } } },
  });
  return standorte.map((s) => ({
    id: s.id,
    name: s.name,
    kurse: s.kurse.map((k) => ({ id: k.id, name: k.name, dauerMinuten: k.dauerMinuten ?? 50, plaetze: k.kapazitaetStandard })),
  }));
}

function zahl(text: string | undefined, name: string, min: number, max: number): number | undefined {
  if (text === undefined || text.trim() === "") return undefined;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) throw new TerminFehler(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
  return n;
}

export interface NeueTermineParameter {
  kursId: string;
  datum: string;
  zeit: string;
  plaetze?: string;
  dauerMinuten?: string;
  trainerName?: string;
  /** Datum "JJJJ-MM-TT", bis zu dem wöchentlich wiederholt wird, leer = nur einmal */
  wiederholenBis?: string;
}

export async function erstelleTermine(p: NeueTermineParameter): Promise<{ angelegt: number; uebersprungen: number }> {
  const kurs = await prisma.kurs.findUnique({ where: { id: p.kursId } });
  if (!kurs) throw new TerminFehler("Bitte einen Kurs auswählen.");
  if (!istDatum(p.datum)) throw new TerminFehler("Bitte ein Datum wählen.");
  if (!istUhrzeit(p.zeit)) throw new TerminFehler("Bitte eine Uhrzeit wählen.");

  const plaetze = zahl(p.plaetze, "Die Platzzahl", 1, 30) ?? kurs.kapazitaetStandard;
  const dauer = zahl(p.dauerMinuten, "Die Dauer", 10, 240) ?? kurs.dauerMinuten ?? 50;
  const trainer = p.trainerName?.trim() || null;

  const bis = p.wiederholenBis?.trim() ? p.wiederholenBis.trim() : null;
  if (bis) {
    if (!istDatum(bis)) throw new TerminFehler("Bitte ein Enddatum für die Wiederholung wählen.");
    if (bis < p.datum) throw new TerminFehler("Das Enddatum der Wiederholung liegt vor dem ersten Termin.");
    if (bis > addTageZuDatum(p.datum, MAX_TAGE_WIEDERHOLUNG)) {
      throw new TerminFehler("Wiederholen geht höchstens ein Jahr im Voraus. Lege danach weitere Termine an.");
    }
  }

  const tage: string[] = [];
  for (let tag = p.datum; tag <= (bis ?? p.datum); tag = addTageZuDatum(tag, 7)) tage.push(tag);
  if (tage.length > MAX_TERMINE_PRO_AKTION) {
    throw new TerminFehler(`Das wären ${tage.length} Termine auf einmal. Bitte höchstens ${MAX_TERMINE_PRO_AKTION} pro Vorgang.`);
  }

  const jetzt = new Date();
  let angelegt = 0;
  let uebersprungen = 0;
  for (const tag of tage) {
    const beginn = berlinZuDate(tag, p.zeit);
    const rueck = berlinTeile(beginn);
    if (rueck.datum !== tag || rueck.zeit !== p.zeit) {
      throw new TerminFehler(`Am ${tag.split("-").reverse().join(".")} gibt es die Uhrzeit ${p.zeit} wegen der Zeitumstellung nicht.`);
    }
    if (beginn < jetzt) throw new TerminFehler("Der Termin liegt in der Vergangenheit.");

    const vorhanden = await prisma.kursTermin.findFirst({ where: { kursId: kurs.id, beginn } });
    if (vorhanden) {
      uebersprungen++;
      continue;
    }
    await prisma.kursTermin.create({
      data: {
        kursId: kurs.id,
        standortId: kurs.standortId,
        beginn,
        ende: new Date(beginn.getTime() + dauer * 60_000),
        kapazitaet: plaetze,
        trainerName: trainer,
      },
    });
    angelegt++;
  }
  return { angelegt, uebersprungen };
}

async function aktiveBuchungen(kursTerminId: string) {
  return prisma.buchung.count({
    where: { kursTerminId, status: { in: ["GEBUCHT", "WARTELISTE", "ANWESEND", "NO_SHOW"] } },
  });
}

export async function aktualisiereTermin(
  id: string,
  p: { plaetze?: string; trainerName?: string; datum?: string; zeit?: string },
): Promise<void> {
  const termin = await prisma.kursTermin.findUnique({ where: { id }, include: { kurs: true, buchungen: true } });
  if (!termin) throw new TerminFehler("Termin nicht gefunden.");
  if (termin.status !== "AKTIV") throw new TerminFehler("Ein ausgefallener Termin lässt sich nicht mehr ändern.");

  const plaetze = zahl(p.plaetze, "Die Platzzahl", 1, 30) ?? termin.kapazitaet;
  const belegt = termin.buchungen.filter((b) => b.status === "GEBUCHT" || b.status === "ANWESEND").length;
  if (plaetze < belegt) throw new TerminFehler(`Es sind schon ${belegt} Plätze gebucht, weniger geht nicht.`);

  const daten: { kapazitaet: number; trainerName: string | null; beginn?: Date; ende?: Date } = {
    kapazitaet: plaetze,
    trainerName: p.trainerName?.trim() || null,
  };

  const aktuell = berlinTeile(termin.beginn);
  const neuDatum = p.datum?.trim() || aktuell.datum;
  const neuZeit = p.zeit?.trim() || aktuell.zeit;
  if (neuDatum !== aktuell.datum || neuZeit !== aktuell.zeit) {
    if (!istDatum(neuDatum) || !istUhrzeit(neuZeit)) throw new TerminFehler("Bitte ein gültiges Datum und eine gültige Uhrzeit angeben.");
    if ((await aktiveBuchungen(id)) > 0) {
      throw new TerminFehler(
        "Für diesen Termin gibt es Buchungen oder Wartelisteneinträge. Datum und Uhrzeit lassen sich dann nicht ändern. Lass den Kurs ausfallen und lege einen neuen Termin an.",
      );
    }
    const beginn = berlinZuDate(neuDatum, neuZeit);
    const rueck = berlinTeile(beginn);
    if (rueck.datum !== neuDatum || rueck.zeit !== neuZeit) throw new TerminFehler("Diese Uhrzeit gibt es wegen der Zeitumstellung nicht.");
    if (beginn < new Date()) throw new TerminFehler("Der Termin liegt in der Vergangenheit.");
    const dauerMs = termin.ende.getTime() - termin.beginn.getTime();
    daten.beginn = beginn;
    daten.ende = new Date(beginn.getTime() + dauerMs);
  }

  await prisma.kursTermin.update({ where: { id }, data: daten });

  // Mehr Plätze heißt: Die Warteliste bekommt Bescheid.
  if (plaetze > termin.kapazitaet) await benachrichtigeWarteliste(id);
}

export async function loescheTermin(id: string): Promise<void> {
  const termin = await prisma.kursTermin.findUnique({ where: { id } });
  if (!termin) throw new TerminFehler("Termin nicht gefunden.");
  if ((await aktiveBuchungen(id)) > 0) {
    throw new TerminFehler("Für diesen Termin gibt es Buchungen oder Wartelisteneinträge. Lass den Kurs stattdessen ausfallen.");
  }
  await prisma.kursTermin.delete({ where: { id } });
}

export function heute(): string {
  return heuteBerlin();
}
