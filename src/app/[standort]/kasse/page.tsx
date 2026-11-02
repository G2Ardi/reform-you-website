import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import ActionForm from "@/components/forms/ActionForm";
import TestmodusHinweis from "@/components/TestmodusHinweis";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { CREDITS_KATALOG, type KaufbareCredits } from "@/lib/credits";
import { erstelleKasseUebersicht, type KasseAuswahl } from "@/lib/repositories/kasse";
import { freiePlaetze, istNochBuchbar } from "@/lib/repositories/kurstermine";
import { prisma } from "@/lib/prisma";
import { formatPreis } from "@/lib/format";
import { mwstHinweis } from "@/lib/mwst";
import { kaufenAction, type KasseErgebnis } from "@/lib/actions/kasse";

export const dynamic = "force-dynamic";

type SuchParameter = { art?: string; typ?: string; termin?: string; code?: string };

/**
 * Bezahlschritt für Credits und Einzelstunden: Zusammenfassung, Gutschein
 * einlösen, zahlungspflichtig kaufen. Gutschein und Preis werden beim Kauf
 * serverseitig erneut berechnet, nichts davon kommt ungeprüft aus dem Formular.
 */
export default async function KassePage({
  params,
  searchParams,
}: {
  params: Promise<{ standort: string }>;
  searchParams: Promise<SuchParameter>;
}) {
  const { standort: slug } = await params;
  const q = await searchParams;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const basis = `/${standort.slug}/kasse`;
  const ohneCode = new URLSearchParams();
  if (q.art) ohneCode.set("art", q.art);
  if (q.typ) ohneCode.set("typ", q.typ);
  if (q.termin) ohneCode.set("termin", q.termin);
  const aktuellerPfad = `${basis}?${ohneCode.toString()}`;

  const kunde = await getEingeloggterKunde();
  if (!kunde) redirect(`/${standort.slug}/konto/login?weiter=${encodeURIComponent(aktuellerPfad)}`);

  let auswahl: KasseAuswahl | null = null;
  if (q.art === "credits" && q.typ && q.typ in CREDITS_KATALOG) {
    auswahl = { art: "credits", typ: q.typ as KaufbareCredits };
  } else if (q.art === "einzel" && q.termin) {
    auswahl = { art: "einzel", kursTerminId: q.termin };
  }

  const fehlerSeite = (text: string, link: { href: string; label: string }) => (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell stack-3">
            <p className="form-fehler" style={{ maxWidth: "34rem" }}>
              {text}
            </p>
            <Link className="go" href={link.href}>
              {link.label}
            </Link>
          </div>
        </section>
      </main>
    </>
  );

  if (!auswahl) {
    return fehlerSeite("Es wurde nichts zum Kaufen ausgewählt.", {
      href: `/${standort.slug}/credits`,
      label: "Zu den Credits",
    });
  }

  // Einzelstunde: Der Termin muss noch frei und buchbar sein, bevor jemand zahlt.
  if (auswahl.art === "einzel") {
    const termin = await prisma.kursTermin.findUnique({
      where: { id: auswahl.kursTerminId },
      include: { buchungen: true },
    });
    const zurueck = { href: `/${standort.slug}/buchen`, label: "Zurück zum Kursplan" };
    if (!termin) return fehlerSeite("Dieser Termin existiert nicht mehr.", zurueck);
    if (termin.status !== "AKTIV") return fehlerSeite("Dieser Termin ist ausgefallen.", zurueck);
    if (!istNochBuchbar(termin.beginn)) {
      return fehlerSeite("Dieser Termin ist nicht mehr buchbar.", zurueck);
    }
    if (freiePlaetze(termin) <= 0) {
      return fehlerSeite("Dieser Termin ist inzwischen voll. Tritt der Warteliste im Kursplan bei.", zurueck);
    }
    if (termin.buchungen.some((b) => b.kundeId === kunde.id && b.status === "GEBUCHT")) {
      return fehlerSeite("Diesen Termin hast du bereits gebucht.", {
        href: `/${standort.slug}/konto/profil`,
        label: "Zu deinem Konto",
      });
    }
  }

  const uebersicht = await erstelleKasseUebersicht(auswahl, q.code);

  const action = kaufenAction.bind(null, standort.slug) as (
    vorher: KasseErgebnis | null,
    formData: FormData,
  ) => Promise<KasseErgebnis | null>;

  const versteckt: Record<string, string> =
    auswahl.art === "credits" ? { art: "credits", typ: auswahl.typ } : { art: "einzel", termin: auswahl.kursTerminId };

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <div className="stack-3" style={{ maxWidth: "34rem" }}>
              <p className="tag">Bezahlen</p>
              <h1 className="t-1">zur kasse</h1>
            </div>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell kasse-raster">
            <div className="kasse-spalte">
              <h2 className="t-3">{uebersicht.titel}</h2>
              <p className="muted">{uebersicht.beschreibung}</p>

              <form method="get" action={basis} className="kasse-gutschein">
                {Object.entries(versteckt).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <label htmlFor="code">Gutscheincode</label>
                <div className="kasse-gutschein-zeile">
                  <input
                    className="input"
                    id="code"
                    name="code"
                    defaultValue={q.code ?? ""}
                    placeholder="RY-XXXX-XXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                  <button className="btn btn-line" type="submit">
                    Einlösen
                  </button>
                </div>
              </form>
              {uebersicht.gutscheinFehler ? <p className="form-fehler">{uebersicht.gutscheinFehler}</p> : null}
              {uebersicht.gutschein ? (
                <p className="form-erfolg">
                  Gutschein {uebersicht.gutschein.code} eingelöst, {formatPreis(uebersicht.gutschein.abzugCent)}{" "}
                  abgezogen.
                  {uebersicht.gutschein.restNachherCent > 0
                    ? ` Es bleiben ${formatPreis(uebersicht.gutschein.restNachherCent)} auf dem Code.`
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="kasse-spalte">
              <dl className="kasse-summe">
                <div>
                  <dt>{uebersicht.titel}</dt>
                  <dd>{formatPreis(uebersicht.gesamtCent)}</dd>
                </div>
                {uebersicht.gutschein ? (
                  <div>
                    <dt>Gutschein</dt>
                    <dd>−{formatPreis(uebersicht.gutschein.abzugCent)}</dd>
                  </div>
                ) : null}
                <div className="kasse-summe-gesamt">
                  <dt>Zu zahlen</dt>
                  <dd>{formatPreis(uebersicht.zuZahlenCent)}</dd>
                </div>
              </dl>
              <p className="small muted">Preise {mwstHinweis()}.</p>

              <TestmodusHinweis />

              <ActionForm action={action} initialState={null} submitLabel="Zahlungspflichtig kaufen">
                {Object.entries(versteckt).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <input type="hidden" name="code" value={uebersicht.gutschein?.code ?? ""} />
                <p className="small muted">
                  Mit dem Kauf stimmst du den{" "}
                  <Link className="go" href={`/${standort.slug}/agb`}>
                    AGB
                  </Link>{" "}
                  zu.
                  {auswahl.art === "credits"
                    ? " Die Gültigkeit der Credits beginnt mit dem Kauf."
                    : " Stornieren ist bis 24 Stunden vor Kursbeginn mit Gutschrift möglich."}
                </p>
              </ActionForm>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
