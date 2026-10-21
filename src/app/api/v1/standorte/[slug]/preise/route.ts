import { NextResponse } from "next/server";
import { getPreiseByStandort } from "@/lib/repositories/preise";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const preise = await getPreiseByStandort(slug);
  return NextResponse.json({ preise });
}
