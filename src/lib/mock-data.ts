import type {
  AboModell,
  Event as EventModell,
  Kurs,
  Preis,
  Produkt,
  Standort,
} from "@prisma/client";
import { standorteContent, type StandortContent } from "@/lib/content/standorte-content";

/**
 * Offline-Fallback, falls keine DATABASE_URL gesetzt ist oder die
 * Datenbank nicht erreichbar ist (z. B. bei "npm run build" ohne DB, oder
 * in der lokalen Entwicklung vor dem ersten "npm run db:migrate").
 *
 * Die Form entspricht exakt dem, was Prisma mit den passenden `include`
 * Optionen zurueckgeben wuerde, damit Seiten und Repository-Aufrufer nicht
 * zwischen echten und simulierten Daten unterscheiden muessen.
 *
 * Quelle der Inhalte: src/lib/content/standorte-content.ts, siehe dort.
 */

export type StandortMitInhalt = Standort & {
  kurse: Kurs[];
  aboModelle: AboModell[];
  preise: Preis[];
  events: EventModell[];
  produkte: Produkt[];
};

const jetzt = new Date("2026-10-12T00:00:00.000Z");

function toStandortMitInhalt(content: StandortContent): StandortMitInhalt {
  const standortId = `mock-${content.slug}`;

  return {
    id: standortId,
    slug: content.slug,
    name: content.name,
    aktivSeit: content.aktivSeit ? new Date(content.aktivSeit) : null,
    strasse: content.strasse,
    plz: content.plz,
    ort: content.ort,
    telefon: content.telefon,
    email: content.email,
    oeffnungszeiten: content.oeffnungszeiten,
    oeffnungszeitenOffen: content.oeffnungszeitenOffen,
    parkhinweis: content.parkhinweis,
    parkhinweisOffen: content.parkhinweisOffen,
    gruppengroesse: content.gruppengroesse,
    gruppengroesseOffen: content.gruppengroesseOffen,
    hinweis: content.hinweis,
    aktiv: true,
    reihenfolge: content.reihenfolge,
    createdAt: jetzt,
    updatedAt: jetzt,
    kurse: content.kurse.map((k) => ({
      id: `mock-${content.slug}-kurs-${k.slug}`,
      standortId,
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
      aktiv: true,
      createdAt: jetzt,
      updatedAt: jetzt,
    })),
    aboModelle: content.aboModelle.map((a, i) => ({
      id: `mock-${content.slug}-abo-${i}`,
      standortId,
      name: a.name,
      beschreibung: a.beschreibung,
      reihenfolge: a.reihenfolge,
      aktiv: true,
      createdAt: jetzt,
      updatedAt: jetzt,
    })),
    preise: content.preise.map((p, i) => ({
      id: `mock-${content.slug}-preis-${i}`,
      standortId,
      typ: p.typ,
      bezeichnung: p.bezeichnung,
      betragCent: p.betragCent,
      einheit: p.einheit,
      hinweis: p.hinweis,
      offen: p.offen,
      createdAt: jetzt,
      updatedAt: jetzt,
    })),
    events: content.events.map((e) => ({
      id: `mock-${content.slug}-event-${e.slug}`,
      standortId,
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
      aktiv: true,
      createdAt: jetzt,
      updatedAt: jetzt,
    })),
    produkte: content.produkte.map((p, i) => ({
      id: `mock-${content.slug}-produkt-${i}`,
      standortId,
      typ: p.typ,
      name: p.name,
      beschreibung: p.beschreibung,
      preisCent: p.preisCent,
      aktiv: true,
      externerAnbieter: null,
      externeProduktId: null,
      createdAt: jetzt,
      updatedAt: jetzt,
    })),
  };
}

export const mockStandorte: StandortMitInhalt[] = standorteContent
  .slice()
  .sort((a, b) => a.reihenfolge - b.reihenfolge)
  .map(toStandortMitInhalt);

export function findMockStandort(slug: string): StandortMitInhalt | undefined {
  return mockStandorte.find((s) => s.slug === slug);
}
