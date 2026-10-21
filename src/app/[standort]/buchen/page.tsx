import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import BuchenForm from "@/components/forms/BuchenForm";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getKommendeTermineFuerStandort, freiePlaetze } from "@/lib/repositories/kurstermine";
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
  const termine = await getKommendeTermineFuerStandort(standort.slug);

  // Lazy Ablaufpruefung der Warteliste statt echtem Cronjob, siehe
  // src/lib/repositories/buchungen.ts.
  await Promise.all(termine.map((t) => pruefeWartelisteAblauf(t.id)));
  const frischeTermine = await getKommendeTermineFuerStandort(standort.slug);

  const aktiveKarten = kunde ? await getAktiveKartenFuerKunde(kunde.id) : [];

  const nachTag = new Map<string, typeof frischeTermine>();
  for (const t of frischeTermine) {
    const tag = t.beginn.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" });
    if (!nachTag.has(tag)) nachTag.set(tag, []);
    nachTag.get(tag)!.push(t);
  }

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
                  Stundenplan für {standort.ort ?? standort.name}, öffentlich sichtbar. Buchen geht nur mit
                  Konto.{" "}
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
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band">
          <div className="shell stack-5">
            {frischeTermine.length === 0 ? (
              <p className="muted">Aktuell sind keine Termine geplant.</p>
            ) : (
              Array.from(nachTag.entries()).map(([tag, termineAmTag]) => (
                <div key={tag}>
                  <h2 className="t-3" style={{ marginBottom: "var(--s3)" }}>
                    {tag}
                  </h2>
                  <div className="stack-3">
                    {termineAmTag.map((termin) => {
                      const frei = freiePlaetze(termin);
                      const istVoll = frei <= 0;
                      const karteOk =
                        termin.kurs.karteGueltig || aktiveKarten.some((k) => k.typ === "GUTHABEN");
                      const nutzbareKarten = karteOk
                        ? aktiveKarten.filter((k) => termin.kurs.karteGueltig || k.typ === "GUTHABEN")
                        : [];

                      return (
                        <article className="card" key={termin.id}>
                          <div className="split" style={{ alignItems: "baseline" }}>
                            <div>
                              <strong>{termin.kurs.name}</strong>
                              <div className="small muted">
                                {termin.beginn.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr ·{" "}
                                {termin.kurs.dauerMinuten ? `${termin.kurs.dauerMinuten} Min.` : "Dauer offen"}
                              </div>
                            </div>
                            <div className="small">
                              <strong>{formatPreis(termin.kurs.preisEinzelCent)}</strong>
                              <div className="muted">{mwstHinweis()}</div>
                            </div>
                          </div>
                          <div className="small muted">
                            {frei > 0 ? `${frei} von ${termin.kapazitaet} Plätzen frei` : "Termin ausgebucht"}
                            {termin.kurs.kapazitaetOffen ? (
                              <>
                                {" "}
                                <Flag>Kapazität nicht bestätigt</Flag>
                              </>
                            ) : null}
                          </div>
                          {!termin.kurs.karteGueltig ? (
                            <p className="small">
                              <Flag>Ob Karten hier gelten, ist nicht bestätigt</Flag>
                            </p>
                          ) : null}

                          {kunde ? (
                            <BuchenForm
                              standortSlug={standort.slug}
                              kursTerminId={termin.id}
                              preisLabel={formatPreis(termin.kurs.preisEinzelCent)}
                              karten={nutzbareKarten.map((k) => ({
                                id: k.id,
                                label: `${k.typ === "GUTHABEN" ? "Guthaben" : k.typ === "FUENFER" ? "5er-Karte" : "10er-Karte"} (${k.einheitenRest} übrig)`,
                              }))}
                              wartelisteNoetig={istVoll}
                            />
                          ) : (
                            <p className="small">
                              <Link className="go" href={`/${standort.slug}/konto/login`}>
                                Zum Buchen einloggen
                              </Link>
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
