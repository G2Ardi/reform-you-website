/**
 * Fuellt die Datenbank mit den echten, bestaetigten Inhalten aus
 * src/lib/content/standorte-content.ts.
 *
 * Laeuft NICHT ohne eine echte DATABASE_URL. Siehe webapp/README.md fuer
 * den Weg zu einer lokalen oder gehosteten Postgres-Instanz. Aufruf ueber:
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { standorteContent } from "../src/lib/content/standorte-content";

const prisma = new PrismaClient();

/**
 * Testkonto, mit dem sich eine komplette Buchung inklusive Kartenabzug
 * durchklicken laesst. Zugangsdaten stehen zusaetzlich in der README.
 */
const TEST_KUNDE_EMAIL = "test@reform-you.de";
const TEST_KUNDE_PASSWORT = "test1234";

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

async function kurstermineAnlegen() {
  const kurse = await prisma.kurs.findMany({ include: { standort: true } });
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  const ANZAHL_TAGE = 21;
  let angelegt = 0;

  for (let i = 1; i <= ANZAHL_TAGE; i++) {
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

  console.log(`Kurstermine angelegt: ${angelegt} (naechste ${ANZAHL_TAGE} Tage, beide Standorte)`);
}

async function testKundeAnlegen() {
  const passwortHash = await bcrypt.hash(TEST_KUNDE_PASSWORT, 10);

  const kunde = await prisma.kunde.upsert({
    where: { email: TEST_KUNDE_EMAIL },
    update: {},
    create: {
      name: "Theresa Test",
      email: TEST_KUNDE_EMAIL,
      passwortHash,
      telefon: "+49 151 00000000",
      strasse: "Teststraße 1",
      plz: "41849",
      ort: "Wassenberg",
      agbAkzeptiertAm: new Date(),
    },
  });

  const bestehendeKarte = await prisma.karte.findFirst({
    where: { kundeId: kunde.id, typ: "ZEHNER" },
  });

  if (!bestehendeKarte) {
    const gueltigBis = new Date();
    gueltigBis.setMonth(gueltigBis.getMonth() + 6);
    await prisma.karte.create({
      data: {
        kundeId: kunde.id,
        typ: "ZEHNER",
        einheitenGesamt: 10,
        einheitenRest: 7,
        gueltigBis,
        notiz: "Testkarte für die lokale Buchungs-Testumgebung, bereits angebrochen (7 von 10 Einheiten übrig)",
      },
    });
  }

  console.log(
    `Testkunde angelegt oder vorhanden: ${TEST_KUNDE_EMAIL} / ${TEST_KUNDE_PASSWORT}, mit aktiver 10er-Karte`,
  );
}

async function einstellungenAnlegen() {
  await prisma.einstellung.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, erinnerungStundenVorher: 36, stornoFristStunden: 24 },
  });
  console.log("Einstellungen angelegt oder vorhanden: Erinnerung 36h, Stornofrist 24h");
}

async function main() {
  for (const standort of standorteContent) {
    const erstellt = await prisma.standort.upsert({
      where: { slug: standort.slug },
      update: {},
      create: {
        slug: standort.slug,
        name: standort.name,
        aktivSeit: standort.aktivSeit ? new Date(standort.aktivSeit) : null,
        strasse: standort.strasse,
        plz: standort.plz,
        ort: standort.ort,
        telefon: standort.telefon,
        email: standort.email,
        oeffnungszeiten: standort.oeffnungszeiten,
        oeffnungszeitenOffen: standort.oeffnungszeitenOffen,
        parkhinweis: standort.parkhinweis,
        parkhinweisOffen: standort.parkhinweisOffen,
        gruppengroesse: standort.gruppengroesse,
        gruppengroesseOffen: standort.gruppengroesseOffen,
        hinweis: standort.hinweis,
        reihenfolge: standort.reihenfolge,
        kurse: {
          create: standort.kurse.map((k) => ({
            slug: k.slug,
            name: k.name,
            dauerMinuten: k.dauerMinuten,
            beschreibung: k.beschreibung,
            skalaArt: k.skalaArt,
            skalaPosition: k.skalaPosition,
            skalaLabel: k.skalaLabel,
            hinweis: k.hinweis,
            offenerHinweis: k.offenerHinweis,
            reihenfolge: k.reihenfolge,
            preisEinzelCent: k.preisEinzelCent,
            karteGueltig: k.karteGueltig,
            karteGueltigOffen: k.karteGueltigOffen,
            kapazitaetStandard: k.kapazitaetStandard,
            kapazitaetOffen: k.kapazitaetOffen,
          })),
        },
        aboModelle: {
          create: standort.aboModelle.map((a) => ({
            name: a.name,
            beschreibung: a.beschreibung,
            reihenfolge: a.reihenfolge,
          })),
        },
        preise: {
          create: standort.preise.map((p) => ({
            typ: p.typ,
            bezeichnung: p.bezeichnung,
            betragCent: p.betragCent,
            einheit: p.einheit,
            hinweis: p.hinweis,
            offen: p.offen,
          })),
        },
        events: {
          create: standort.events.map((e) => ({
            slug: e.slug,
            titel: e.titel,
            beschreibung: e.beschreibung,
            datum: e.datum ? new Date(e.datum) : null,
            startzeit: e.startzeit,
            endzeit: e.endzeit,
            ort: e.ort,
            preisCent: e.preisCent,
            wiederkehrend: e.wiederkehrend,
            offenerHinweis: e.offenerHinweis,
            reihenfolge: e.reihenfolge,
          })),
        },
        produkte: {
          create: standort.produkte.map((p) => ({
            typ: p.typ,
            name: p.name,
            beschreibung: p.beschreibung,
            preisCent: p.preisCent,
          })),
        },
      },
    });
    console.log(`Standort angelegt oder vorhanden: ${erstellt.name} (${erstellt.slug})`);
  }

  await kurstermineAnlegen();
  await testKundeAnlegen();
  await einstellungenAnlegen();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
