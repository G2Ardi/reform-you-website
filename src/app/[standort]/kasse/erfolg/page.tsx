import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { erfuelleBestellung, getBestellungNachSession, type BestellAusgang } from "@/lib/repositories/stripe-bestellungen";
import { formatPreis } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Rueckkehrseite von Stripe. Prueft die Zahlung und fuehrt die Bestellung aus
 * (Credits, Buchung oder Gutschein). Der Webhook macht dasselbe, die
 * Ausfuehrung passiert trotzdem nur einmal.
 */
export default async function KasseErfolgPage({
  params,
  searchParams,
}: {
  params: Promise<{ standort: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { standort: slug } = await params;
  const { session_id: sessionId } = await searchParams;
  const standort = await getStandortBySlug(slug);
  if (!standort || !sessionId) notFound();

  const bestellung = await getBestellungNachSession(sessionId);
  if (!bestellung) notFound();

  // Bestellungen mit Kundenkonto sieht nur die eingeloggte Kundin selbst.
  if (bestellung.kundeId) {
    const kunde = await getEingeloggterKunde();
    if (!kunde || kunde.id !== bestellung.kundeId) notFound();
  }

  let ausgang: BestellAusgang;
  try {
    ausgang = await erfuelleBestellung(sessionId);
  } catch (fehler) {
    console.error("[reform-you] Rueckkehr von Stripe fehlgeschlagen:", fehler);
    ausgang = { status: "IN_ARBEIT" };
  }

  const kopf = (
    <Header standort={{ slug: standort.slug, name: standort.name }} solid />
  );

  if (ausgang.status === "OFFEN") {
    return (
      <>
        {kopf}
        <main id="inhalt">
          <section className="band band-tight">
            <div className="shell stack-3" style={{ maxWidth: "36rem" }}>
              <p className="tag">Bezahlen</p>
              <h1 className="t-1">noch nicht bezahlt</h1>
              <p className="lede">Die Zahlung ist bei uns noch nicht angekommen. Es wurde nichts berechnet oder gebucht.</p>
              <div className="btns">
                <Link className="btn" href={`/${standort.slug}/credits`}>
                  Zurück zu den Credits
                </Link>
                <Link className="btn btn-line" href={`/${standort.slug}/buchen`}>
                  Zum Kursplan
                </Link>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  if (ausgang.status === "IN_ARBEIT") {
    return (
      <>
        {kopf}
        <meta httpEquiv="refresh" content="3" />
        <main id="inhalt">
          <section className="band band-tight">
            <div className="shell stack-3" style={{ maxWidth: "36rem" }}>
              <p className="tag">Bezahlen</p>
              <h1 className="t-1">einen moment</h1>
              <p className="lede">Deine Zahlung wird verarbeitet. Die Seite lädt gleich von selbst neu.</p>
            </div>
          </section>
        </main>
      </>
    );
  }

  const b = ausgang.bestellung;

  if (ausgang.status === "BEZAHLT") {
    const ergebnis = b.ergebnis ? (JSON.parse(b.ergebnis) as Record<string, string>) : {};
    return (
      <>
        {kopf}
        <main id="inhalt">
          <section className="band band-tight">
            <div className="shell stack-3" style={{ maxWidth: "36rem" }}>
              <p className="tag">Bezahlen</p>
              <h1 className="t-1">vielen dank</h1>
              {b.art === "CREDITS" ? (
                <>
                  <p className="lede">
                    Dein Kauf ({ergebnis.label ?? "Credits"}, {formatPreis(b.betragCent)}) ist angekommen. Die Credits findest du in deinem Konto, eine Bestätigung kommt per E-Mail.
                  </p>
                  <div className="btns">
                    <Link className="btn" href={`/${standort.slug}/buchen`}>
                      Kurs buchen
                    </Link>
                    <Link className="btn btn-line" href={`/${standort.slug}/konto/profil`}>
                      Mein Konto
                    </Link>
                  </div>
                </>
              ) : b.art === "EINZELSTUNDE" ? (
                <>
                  <p className="lede">
                    Gebucht: {ergebnis.kurs ?? "Einzelstunde"}
                    {ergebnis.standort ? ` in ${ergebnis.standort}` : ""}. Die Bestätigung kommt per E-Mail.
                  </p>
                  <div className="btns">
                    <Link className="btn" href={`/${standort.slug}/konto/profil`}>
                      Meine Buchungen
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="lede">
                    Dein Gutschein über {formatPreis(b.gesamtCent)} ist bestellt.
                    {ergebnis.empfaenger ? ` Der Code geht am ${String(ergebnis.lieferDatum).split("-").reverse().join(".")} per E-Mail an ${ergebnis.empfaenger}.` : ""} Eine Bestätigung bekommst du ebenfalls per E-Mail.
                  </p>
                  <div className="btns">
                    <Link className="btn" href={`/${standort.slug}`}>
                      Zur Startseite
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </>
    );
  }

  // ERSTATTET, MANUELL, FEHLGESCHLAGEN
  return (
    <>
      {kopf}
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell stack-3" style={{ maxWidth: "36rem" }}>
            <p className="tag">Bezahlen</p>
            <h1 className="t-1">das hat nicht geklappt</h1>
            <p className="form-fehler">{b.fehler ?? "Die Bestellung konnte nicht ausgeführt werden."}</p>
            <p className="lede">
              {ausgang.status === "ERSTATTET"
                ? "Der bezahlte Betrag wurde erstattet. Er erscheint je nach Zahlart in einigen Tagen auf deinem Konto."
                : "Wir kümmern uns darum und melden uns bei dir."}
            </p>
            <div className="btns">
              <Link className="btn" href={`/${standort.slug}/buchen`}>
                Zum Kursplan
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
