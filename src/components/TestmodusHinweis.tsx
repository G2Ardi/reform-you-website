import { zahlungsModus } from "@/lib/stripe";

/** Deutlicher Hinweis, solange nicht mit echtem Geld bezahlt wird. */
export default function TestmodusHinweis() {
  const modus = zahlungsModus();
  if (modus === "STRIPE_LIVE") return null;
  return (
    <p className="hinweis-test" role="note">
      <strong>Testmodus:</strong>{" "}
      {modus === "STRIPE_TEST"
        ? "Bezahlt wird über Stripe im Testmodus. Mit der Testkarte 4242 4242 4242 4242, einem beliebigen Datum in der Zukunft und beliebiger Prüfziffer. Es wird kein Geld abgebucht."
        : "Die Bezahlung wird nur simuliert, es wird kein Geld abgebucht."}
    </p>
  );
}
