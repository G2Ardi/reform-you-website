import { NextResponse } from "next/server";
import { getProdukteByStandort } from "@/lib/repositories/produkte";

/**
 * Shop-Vorbereitung: Produkte (Abos, Einzelstunden, Geschenkkarten) fuer
 * einen Standort. Ein Zahlungsanbieter haengt hier bewusst noch nicht,
 * siehe Produkt.externerAnbieter im Prisma-Schema und README.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const produkte = await getProdukteByStandort(slug);
  return NextResponse.json({ produkte });
}
