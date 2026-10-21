import "server-only";

import type { Produkt } from "@prisma/client";
import { getStandortBySlug } from "@/lib/repositories/standorte";

/**
 * Produkte fuer den vorbereiteten Shop (Abos, Einzelstunden,
 * Geschenkkarten). Ein Zahlungsanbieter ist bewusst nicht angebunden,
 * siehe Produkt.externerAnbieter im Prisma-Schema. Diese Funktion ist der
 * Punkt, an dem spaeter ein Checkout-Flow andocken wuerde.
 */
export async function getProdukteByStandort(
  standortSlug: string,
): Promise<Produkt[]> {
  const standort = await getStandortBySlug(standortSlug);
  return standort?.produkte ?? [];
}
