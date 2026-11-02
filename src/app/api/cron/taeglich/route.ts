import { NextResponse } from "next/server";
import { versendeFaelligeErinnerungen } from "@/lib/repositories/buchungen";
import { versendeFaelligeGutscheine } from "@/lib/repositories/gutscheine";

export const dynamic = "force-dynamic";

/**
 * Täglicher Cronjob (siehe vercel.json): verschickt Gutschein-Codes, deren
 * Lieferdatum erreicht ist, und fällige Erinnerungen. Beides ist idempotent,
 * ein doppelter Aufruf schickt nichts doppelt.
 *
 * Zugriff: Vercel Cron ruft mit "Authorization: Bearer CRON_SECRET" auf,
 * sofern CRON_SECRET gesetzt ist. Zusätzlich lassen wir den Vercel-Cron-
 * User-Agent zu, solange kein Secret hinterlegt ist, weil der Job nur
 * bereits fällige Mails einmalig auslöst und sonst nichts verändert.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const vonVercelCron = (request.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  const erlaubt = secret ? auth === `Bearer ${secret}` : vonVercelCron || process.env.NODE_ENV !== "production";
  if (!erlaubt) return NextResponse.json({ fehler: "Nicht erlaubt." }, { status: 401 });

  const gutscheine = await versendeFaelligeGutscheine();
  const erinnerungen = await versendeFaelligeErinnerungen();
  return NextResponse.json({ gutscheineVersandt: gutscheine.versandt, erinnerungenVersandt: erinnerungen.versandt });
}
