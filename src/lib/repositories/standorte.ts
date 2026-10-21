import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { findMockStandort, mockStandorte, type StandortMitInhalt } from "@/lib/mock-data";

/**
 * Datenzugriffs-Schicht fuer Standorte.
 *
 * Das ist bewusst der einzige Ort, an dem Seiten und API-Routen an Daten
 * kommen, nicht verstreute Prisma-Aufrufe in Komponenten. Grund: dieselbe
 * Datenbasis soll spaeter auch eine native Buchungsapp bedienen, siehe
 * README. Die App ruft dann dieselben Funktionen oder die /api/v1 Routen,
 * die wiederum diese Funktionen aufrufen.
 *
 * Jede Funktion faellt auf src/lib/mock-data.ts zurueck, wenn keine
 * DATABASE_URL gesetzt ist oder die Datenbank nicht erreichbar ist. Das
 * haelt "npm run build" und die lokale Entwicklung ohne Postgres lauffaehig,
 * siehe README Abschnitt "Ohne Datenbank arbeiten".
 */

const einschluss = {
  kurse: { orderBy: { reihenfolge: "asc" as const } },
  aboModelle: { orderBy: { reihenfolge: "asc" as const } },
  preise: true,
  events: { orderBy: { reihenfolge: "asc" as const } },
  produkte: true,
};

let dbWarnungGezeigt = false;

function aufDbFehlerReagieren(fehler: unknown) {
  if (!dbWarnungGezeigt) {
    dbWarnungGezeigt = true;
    // Einmal pro Prozess loggen, nicht bei jedem Request: in der
    // Entwicklung ohne lokale Datenbank waere das sonst sehr laut.
    console.warn(
      "[reform-you] Keine Datenbankverbindung, nutze eingebaute Beispieldaten. " +
        "Siehe webapp/README.md, Abschnitt 'Ohne Datenbank arbeiten'.",
      fehler instanceof Error ? fehler.message : fehler,
    );
  }
}

export async function getAlleStandorte(): Promise<StandortMitInhalt[]> {
  try {
    const standorte = await prisma.standort.findMany({
      where: { aktiv: true },
      orderBy: { reihenfolge: "asc" },
      include: einschluss,
    });
    return standorte;
  } catch (fehler) {
    aufDbFehlerReagieren(fehler);
    return mockStandorte;
  }
}

/**
 * Mit React "cache" umschlossen: Layout und Seite fragen innerhalb
 * desselben Requests denselben Standort ab, sollen dafuer aber nicht
 * zweimal die Datenbank bemuehen.
 */
export const getStandortBySlug = cache(async function getStandortBySlug(
  slug: string,
): Promise<StandortMitInhalt | null> {
  try {
    const standort = await prisma.standort.findUnique({
      where: { slug },
      include: einschluss,
    });
    return standort;
  } catch (fehler) {
    aufDbFehlerReagieren(fehler);
    return findMockStandort(slug) ?? null;
  }
});

export async function getStandortSlugs(): Promise<string[]> {
  try {
    const standorte = await prisma.standort.findMany({
      where: { aktiv: true },
      select: { slug: true },
    });
    return standorte.map((s) => s.slug);
  } catch (fehler) {
    aufDbFehlerReagieren(fehler);
    return mockStandorte.map((s) => s.slug);
  }
}
