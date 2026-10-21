import "server-only";

import type { Kurs } from "@prisma/client";
import { getStandortBySlug } from "@/lib/repositories/standorte";

/** Alle Kurse eines Standorts, sortiert nach ihrer Position auf der
 * Federskala-Seite. Matten Pilates (ohne Feder) steht am Ende, weil es
 * keine Position auf der Achse hat. */
export async function getKurseByStandort(standortSlug: string): Promise<Kurs[]> {
  const standort = await getStandortBySlug(standortSlug);
  return standort?.kurse ?? [];
}

export async function getKursBySlug(
  standortSlug: string,
  kursSlug: string,
): Promise<Kurs | null> {
  const kurse = await getKurseByStandort(standortSlug);
  return kurse.find((k) => k.slug === kursSlug) ?? null;
}
