import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Kursplan, { type KursplanTermin } from "@/components/Kursplan";
import { getStandortBySlug, getAlleStandorte } from "@/lib/repositories/standorte";
import { getTermineImFenster, freiePlaetze } from "@/lib/repositories/kurstermine";
import { pruefeWartelisteAblauf } from "@/lib/repositories/buchungen";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { getAktiveKartenFuerKunde } from "@/lib/repositories/karten";
import { formatPreis } from "@/lib/format";
import { mwstHinweis } from "@/lib/mwst";

export const dynamic = "force-dynamic";

export default async function BuchenPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  const termine = await getTermineImFenster();

  // Lazy Ablaufpruefung der Warteliste statt echtem Cronjob, siehe
  // src/lib/repositories/buchungen.ts. Nur fuer kommende Termine mit
  // tatsaechlich benachrichtigter Warteliste noetig, nicht fuer jeden
  // Termin im Fenster. Nacheinander statt parallel, da die Datenbank hier
  // nur sehr wenige gleichzeitige Verbindungen zulaesst (direkte
  // Migrations-Verbindung, siehe .env) und das jetzt standortuebergreifend
  // mehr Termine gleichzeitig betrifft als zuvor.
  const terminePruefenNoetig = termine.filter(
    (t) =>
      t.beginn >= new Date() &&
      t.buchungen.some((b) => b.status === "WARTELISTE" && b.warteBenachrichtigtAm),
  );
  for (const t of terminePruefenNoetig) {
    await pruefeWartelisteAblauf(t.id);
  }
  const frischeTermine = terminePruefenNoetig.length > 0 ? await getTermineImFenster() : termine;
  const alleStandorte = await getAlleStandorte();

  const aktiveKarten = kunde ? await getAktiveKartenFuerKunde(kunde.id) : [];

  const kursplanTermine: KursplanTermin[] = frischeTermine.map((termin) => {
    const frei = freiePlaetze(termin);
    const karteOk = termin.kurs.karteGueltig || aktiveKarten.some((k) => k.typ === "GUTHABEN");
    const nutzbareKarten = karteOk
      ? aktiveKarten.filter((k) => termin.kurs.karteGueltig || k.typ === "GUTHABEN")
      : [];

    return {
      id: termin.id,
      beginnIso: termin.beginn.toISOString(),
      endeIso: termin.ende.toISOString(),
      kapazitaet: termin.kapazitaet,
      frei,
      kapazitaetOffen: termin.kurs.kapazitaetOffen,
      ausgefallen: termin.status === "AUSGEFALLEN",
      trainerName: termin.trainerName,
      kursName: termin.kurs.name,
      skalaLabel: termin.kurs.skalaLabel,
      karteGueltig: termin.kurs.karteGueltig,
      preisLabel: formatPreis(termin.kurs.preisEinzelCent),
      standortSlug: termin.standort.slug,
      standortName: termin.standort.name,
      nutzbareKarten: nutzbareKarten.map((k) => ({
        id: k.id,
        label: `${k.typ === "GUTHABEN" ? "Guthaben" : k.typ === "FUENFER" ? "5er-Karte" : "10er-Karte"} (${k.einheitenRest} übrig)`,
      })),
    };
  });

  const standortOptionen = alleStandorte.map((s) => ({ slug: s.slug, name: s.name }));

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-3">
                  <p className="tag">Termine</p>
                  <h1 className="t-1">buchen</h1>
                </div>
                <p className="lede">
                  Stundenplan für beide Standorte, standardmäßig auf {standort.name} gefiltert, oben
                  umschaltbar. Nach Woche, Standort, Kurs, Niveau oder Lehrkraft filterbar, buchen geht
                  nur mit Konto.{" "}
                  {!kunde ? (
                    <>
                      <Link className="go" href={`/${standort.slug}/konto/login`}>
                        Login
                      </Link>{" "}
                      oder{" "}
                      <Link className="go" href={`/${standort.slug}/konto/registrieren`}>
                        Konto anlegen
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
                <p className="small muted">Preise {mwstHinweis()}.</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            {kursplanTermine.length === 0 ? (
              <p className="muted">Aktuell sind keine Termine geplant.</p>
            ) : (
              <Kursplan
                aktuellerStandortSlug={standort.slug}
                standorte={standortOptionen}
                eingeloggt={Boolean(kunde)}
                termine={kursplanTermine}
              />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
