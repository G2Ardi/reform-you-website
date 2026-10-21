import { NextResponse } from "next/server";
import { getKurseByStandort } from "@/lib/repositories/kurse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const kurse = await getKurseByStandort(slug);
  return NextResponse.json({ kurse });
}
