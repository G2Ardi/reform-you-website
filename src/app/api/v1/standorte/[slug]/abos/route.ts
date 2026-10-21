import { NextResponse } from "next/server";
import { getAboModelleByStandort } from "@/lib/repositories/abos";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const aboModelle = await getAboModelleByStandort(slug);
  return NextResponse.json({ aboModelle });
}
