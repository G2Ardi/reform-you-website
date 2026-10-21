import "server-only";

import type { AboModell } from "@prisma/client";
import { getStandortBySlug } from "@/lib/repositories/standorte";

export async function getAboModelleByStandort(
  standortSlug: string,
): Promise<AboModell[]> {
  const standort = await getStandortBySlug(standortSlug);
  return standort?.aboModelle ?? [];
}
