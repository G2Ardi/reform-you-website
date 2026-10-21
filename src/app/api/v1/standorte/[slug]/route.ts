import { NextResponse } from "next/server";
import { getStandortBySlug } from "@/lib/repositories/standorte";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) {
    return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({ standort });
}
