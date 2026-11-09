import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Gesundheitspruefung fuer Docker und Ueberwachung: antwortet nur mit 200, wenn
 * die Datenbank wirklich erreichbar ist. (Die Seiten selbst fallen ohne
 * Datenbank auf Beispieldaten zurueck, deshalb taugen sie dafuer nicht.)
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "datenbank nicht erreichbar" }, { status: 503 });
  }
}
