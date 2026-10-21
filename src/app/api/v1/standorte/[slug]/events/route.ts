import { NextResponse } from "next/server";
import { getEventsByStandort } from "@/lib/repositories/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const events = await getEventsByStandort(slug);
  return NextResponse.json({ events });
}
