import "server-only";

import type { Preis } from "@prisma/client";
import { getStandortBySlug } from "@/lib/repositories/standorte";

export async function getPreiseByStandort(standortSlug: string): Promise<Preis[]> {
  const standort = await getStandortBySlug(standortSlug);
  return standort?.preise ?? [];
}
