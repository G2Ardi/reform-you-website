import "server-only";
import Stripe from "stripe";

/**
 * Stripe-Anbindung. Ist STRIPE_SECRET_KEY nicht gesetzt, laeuft die Zahlung
 * wie bisher als Simulation ohne Geld (siehe kasse.ts). Mit einem Schluessel
 * sk_test_... laeuft sie ueber Stripe im Testmodus, mit sk_live_... echt.
 */

export type ZahlungsModus = "SIMULIERT" | "STRIPE_TEST" | "STRIPE_LIVE";

export function zahlungsModus(): ZahlungsModus {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return "SIMULIERT";
  return key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "STRIPE_LIVE" : "STRIPE_TEST";
}

export function stripeAktiv(): boolean {
  return zahlungsModus() !== "SIMULIERT";
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ist nicht gesetzt.");
  if (!client) client = new Stripe(key);
  return client;
}

/** Stripe verlangt bei Zahlungen in Euro mindestens 50 Cent. */
export const STRIPE_MINDESTBETRAG_CENT = 50;
