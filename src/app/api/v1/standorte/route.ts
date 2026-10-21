import { NextResponse } from "next/server";
import { getAlleStandorte } from "@/lib/repositories/standorte";

/**
 * API-Schicht fuer den spaeteren Zweitverbraucher derselben Datenbasis:
 * eine native Buchungsapp fuer Play Store und App Store (zweitrangig, noch
 * nicht gebaut). Diese Route und ihre Geschwister unter /api/v1 sind reine
 * duenne Wrapper um die Repository-Funktionen in src/lib/repositories.
 */
export async function GET() {
  const standorte = await getAlleStandorte();
  return NextResponse.json({ standorte });
}
