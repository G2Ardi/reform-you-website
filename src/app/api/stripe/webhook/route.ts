import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { erfuelleBestellung, markiereZahlungFehlgeschlagen } from "@/lib/repositories/stripe-bestellungen";

export const dynamic = "force-dynamic";

/**
 * Stripe-Webhook. Zweiter Weg neben der Rueckkehrseite: Auch wenn die Kundin
 * nach der Zahlung den Browser schliesst, werden Credits, Buchung oder Gutschein
 * angelegt. In Stripe (Entwickler, Webhooks) diese Adresse eintragen:
 *   https://<domain>/api/stripe/webhook
 * mit den Ereignissen checkout.session.completed,
 * checkout.session.async_payment_succeeded und checkout.session.async_payment_failed.
 * Das Signing-Secret (whsec_...) kommt als STRIPE_WEBHOOK_SECRET in die .env.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ fehler: "STRIPE_WEBHOOK_SECRET ist nicht gesetzt." }, { status: 503 });

  const signatur = request.headers.get("stripe-signature");
  if (!signatur) return NextResponse.json({ fehler: "Signatur fehlt." }, { status: 400 });

  const rohtext = await request.text();
  let ereignis: Stripe.Event;
  try {
    ereignis = getStripe().webhooks.constructEvent(rohtext, signatur, secret);
  } catch {
    return NextResponse.json({ fehler: "Ungültige Signatur." }, { status: 400 });
  }

  try {
    if (ereignis.type === "checkout.session.completed" || ereignis.type === "checkout.session.async_payment_succeeded") {
      await erfuelleBestellung((ereignis.data.object as Stripe.Checkout.Session).id);
    } else if (ereignis.type === "checkout.session.async_payment_failed") {
      await markiereZahlungFehlgeschlagen((ereignis.data.object as Stripe.Checkout.Session).id);
    }
  } catch (fehler) {
    console.error("[reform-you] Webhook-Verarbeitung fehlgeschlagen:", fehler);
    // 500, damit Stripe es spaeter erneut versucht.
    return NextResponse.json({ fehler: "Verarbeitung fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ empfangen: true });
}
