/**
 * Gleicht Kurse und Preise einer bestehenden Datenbank mit
 * src/lib/content/standorte-content.ts ab, ohne Kunden, Buchungen oder
 * Termine anzufassen. Der Seed legt nur an und ändert nichts, daher
 * braucht eine laufende Datenbank dieses Skript, wenn sich Texte oder
 * Preise ändern.
 *
 * Je Standort:
 *  - Kurse: Beschreibung, Einzelpreis und Reihenfolge werden aktualisiert,
 *    fehlende Kurse (z. B. Reformer Deep Stretch) werden angelegt.
 *  - Preise (Preisliste): werden komplett neu geschrieben.
 *
 * Aufruf:  npm run db:inhalte
 */
import { PrismaClient } from "@prisma/client";
import { standorteContent } from "../src/lib/content/standorte-content";

const prisma = new PrismaClient();

async function main() {
  for (const inhalt of standorteContent) {
    const standort = await prisma.standort.findUnique({ where: { slug: inhalt.slug } });
    if (!standort) {
      console.log(`Standort ${inhalt.slug} fehlt in der Datenbank, übersprungen.`);
      continue;
    }

    for (const k of inhalt.kurse) {
      const vorhanden = await prisma.kurs.findUnique({
        where: { standortId_slug: { standortId: standort.id, slug: k.slug } },
      });
      if (vorhanden) {
        await prisma.kurs.update({
          where: { id: vorhanden.id },
          data: {
            beschreibung: k.beschreibung,
            preisEinzelCent: k.preisEinzelCent,
            reihenfolge: k.reihenfolge,
          },
        });
        console.log(`${inhalt.slug}: ${k.name} aktualisiert`);
      } else {
        await prisma.kurs.create({
          data: {
            standortId: standort.id,
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
          },
        });
        console.log(`${inhalt.slug}: ${k.name} neu angelegt`);
      }
    }

    await prisma.preis.deleteMany({ where: { standortId: standort.id } });
    await prisma.preis.createMany({
      data: inhalt.preise.map((p) => ({
        standortId: standort.id,
        typ: p.typ,
        bezeichnung: p.bezeichnung,
        betragCent: p.betragCent,
        einheit: p.einheit,
        hinweis: p.hinweis,
        offen: p.offen,
      })),
    });
    console.log(`${inhalt.slug}: ${inhalt.preise.length} Preiseinträge geschrieben`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
