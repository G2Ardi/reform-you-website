/**
 * Wochenplan und Erzeugung der Kurstermine.
 *
 * ACHTUNG: Der Wochenplan unten ist ein Platzhalter fuer die Testumgebung und
 * nicht Janinas echter Stundenplan. Bis es im Admin-Bereich eine eigene
 * Terminverwaltung gibt, wird der echte Plan hier eingetragen. Die Termine
 * entstehen mit der Uhrzeit der Zeitzone des Prozesses, im Betrieb muss
 * deshalb TZ=Europe/Berlin gesetzt sein (siehe docker-compose.yml).
 *
 * Aufruf fuer die naechsten Wochen: npm run db:termine -- 56
 */
import type { PrismaClient } from "@prisma/client";

/**
 * Wochenplan je Standort: Wochentag (0 = Sonntag), Uhrzeit, Kurs-Slug.
 * Frei erfunden fuer die Testumgebung, orientiert an "Stundenplan wird
 * monatlich neu erstellt" (Fragenkatalog Antworten, Abschnitt 3) und daran,
 * dass beide Standorte zeitlich parallel laufen, aber unterschiedliche
 * Uhrzeiten haben sollen, damit eine echte Liste zum Buchen entsteht.
 */
const wochenplanWassenberg: Array<{ wochentag: number; zeit: string; kursSlug: string }> = [
  { wochentag: 1, zeit: "09:00", kursSlug: "reformer-basics" },
  { wochentag: 1, zeit: "18:00", kursSlug: "reformer-flow" },
  { wochentag: 2, zeit: "10:00", kursSlug: "mommy-mini" },
  { wochentag: 3, zeit: "09:00", kursSlug: "reformer-flow" },
  { wochentag: 3, zeit: "18:00", kursSlug: "reformer-cardio" },
  { wochentag: 4, zeit: "17:30", kursSlug: "reformer-basics" },
  { wochentag: 5, zeit: "09:00", kursSlug: "reformer-cardio" },
  { wochentag: 6, zeit: "10:00", kursSlug: "reformer-basics" },
];

const wochenplanWegberg: Array<{ wochentag: number; zeit: string; kursSlug: string }> = [
  { wochentag: 2, zeit: "09:00", kursSlug: "reformer-basics" },
  { wochentag: 2, zeit: "18:30", kursSlug: "reformer-flow" },
  { wochentag: 3, zeit: "10:30", kursSlug: "mommy-mini" },
  { wochentag: 4, zeit: "09:00", kursSlug: "reformer-cardio" },
  { wochentag: 5, zeit: "18:00", kursSlug: "reformer-flow" },
  { wochentag: 6, zeit: "11:00", kursSlug: "reformer-basics" },
];

const wochenplaene: Record<string, typeof wochenplanWassenberg> = {
  wassenberg: wochenplanWassenberg,
  wegberg: wochenplanWegberg,
};

export async function kurstermineAnlegen(prisma: PrismaClient, anzahlTage = 21) {
  const kurse = await prisma.kurs.findMany({ include: { standort: true } });
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  let angelegt = 0;

  for (let i = 1; i <= anzahlTage; i++) {
    const tag = new Date(heute);
    tag.setDate(tag.getDate() + i);
    const wochentag = tag.getDay();

    for (const [standortSlug, plan] of Object.entries(wochenplaene)) {
      for (const eintrag of plan) {
        if (eintrag.wochentag !== wochentag) continue;
        const kurs = kurse.find(
          (k) => k.standort.slug === standortSlug && k.slug === eintrag.kursSlug,
        );
        if (!kurs) continue;

        const [stunde, minute] = eintrag.zeit.split(":").map(Number);
        const beginn = new Date(tag);
        beginn.setHours(stunde, minute, 0, 0);
        const ende = new Date(beginn.getTime() + (kurs.dauerMinuten ?? 50) * 60_000);

        const existiert = await prisma.kursTermin.findFirst({
          where: { kursId: kurs.id, beginn },
        });
        if (existiert) continue;

        await prisma.kursTermin.create({
          data: {
            kursId: kurs.id,
            standortId: kurs.standortId,
            beginn,
            ende,
            kapazitaet: kurs.kapazitaetStandard,
          },
        });
        angelegt++;
      }
    }
  }

  console.log(`Kurstermine angelegt: ${angelegt} (naechste ${anzahlTage} Tage, beide Standorte)`);
}

