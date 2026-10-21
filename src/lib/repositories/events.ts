import "server-only";

import type { Event as EventModell } from "@prisma/client";
import { getStandortBySlug } from "@/lib/repositories/standorte";

export async function getEventsByStandort(
  standortSlug: string,
): Promise<EventModell[]> {
  const standort = await getStandortBySlug(standortSlug);
  return standort?.events ?? [];
}
