import { notFound } from "next/navigation";
import Header from "@/components/Header";
import FigurePlaceholder from "@/components/FigurePlaceholder";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { formatPreis } from "@/lib/format";
import { mwstHinweis } from "@/lib/mwst";

export const dynamic = "force-dynamic";

export default async function AboPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const geschenkkarte = standort.preise.find((p) => p.typ === "GESCHENKKARTE");
  const einzelstundenPreise = standort.preise.filter((p) => p.typ === "EINZELSTUNDE");
  const kartenPreise = standort.preise.filter((p) => p.typ === "KARTE");
  const hatKurse = standort.kurse.length > 0;

  if (!hatKurse) {
    return (
      <>
        <Header standort={{ slug: standort.slug, name: standort.name }} solid />
        <main id="inhalt">
          <section className="band band-tight">
            <div className="shell">
              <Reveal>
                <div className="split split-heavy-left">
                  <div className="stack-3">
                    <p className="tag">Abo &amp; Preise</p>
                    <h1 className="t-1">folgt mit dem start</h1>
                  </div>
                  <p className="lede">
                    {standort.hinweis ??
                      "Preise für diesen Standort stehen noch nicht fest."}
                  </p>
                </div>
              </Reveal>
            </div>
          </section>
        </main>
      </>
    );
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
                  <p className="tag">Preise</p>
                  <h1 className="t-1">einzeln oder mit karte</h1>
                </div>
                <p className="lede">
                  Ein festes Abo gibt es aktuell nicht. Trainiert wird einzeln oder über eine 5er- oder
                  10er-Karte, die an beiden Standorten gilt.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <p className="tag">Einzelstunde</p>
            </Reveal>
            <ul className="list" style={{ marginTop: "var(--s3)" }}>
              {einzelstundenPreise.map((p) => (
                <li key={p.id}>
                  {p.bezeichnung}{" "}
                  {p.offen ? <Flag>offen</Flag> : <strong>{formatPreis(p.betragCent)}</strong>}
                </li>
              ))}
            </ul>
            <p className="small muted">{mwstHinweis()}</p>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <Reveal>
              <p className="tag">Guthabenkarten</p>
            </Reveal>
            <ul className="list" style={{ marginTop: "var(--s3)" }}>
              {kartenPreise.map((p) => (
                <li key={p.id}>
                  {p.bezeichnung} ({p.einheit}){" "}
                  {p.offen ? <Flag>offen</Flag> : <strong>{formatPreis(p.betragCent)}</strong>}
                  {p.hinweis ? <span className="small muted"> · {p.hinweis}</span> : null}
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ marginTop: "var(--s2)" }}>
              Nicht übertragbar, verfällt nach Ablauf der Laufzeit ersatzlos. Pausieren ist aktuell nicht
              vorgesehen. <Flag>Von Janina nicht bestätigt</Flag>
            </p>
          </div>
        </section>

        <section className="band band-dark" id="geschenkkarte">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-4">
                  <div className="stack-3">
                    <p className="tag">Wertgutschein</p>
                    <h2 className="t-2">wählen lassen statt raten</h2>
                  </div>
                  <p className="lede">
                    Wer nicht weiß, welcher Kurs passt, verschenkt einen frei wählbaren Betrag und lässt
                    die Beschenkte selbst wählen.{" "}
                    {geschenkkarte?.hinweis ?? "Einlösbar auf alle Kurse."}
                  </p>
                  <div className="btns">
                    <a className="btn" href="https://www.reform-you.de/book-online">
                      Wertgutschein kaufen
                    </a>
                  </div>
                </div>
                <FigurePlaceholder
                  ratio="1610"
                  hint="Geschenkkarte oder Studiodetail · Querformat 16:10"
                  src="/bilder/studiodetail.jpg"
                  alt="Studiodetail, Platzhalterfoto"
                />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <h2 className="t-2">ein kurs geht auch ohne karte.</h2>
                <div className="stack-3">
                  <p>
                    Buche eine einzelne Einheit, schau ob es passt, und
                    entscheide danach.
                  </p>
                  <div className="btns">
                    <a className="btn" href={`/${standort.slug}/buchen`}>
                      Einzeltermin buchen
                    </a>
                    <a className="btn btn-line" href={`/${standort.slug}/kurse`}>
                      Kurse ansehen
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
