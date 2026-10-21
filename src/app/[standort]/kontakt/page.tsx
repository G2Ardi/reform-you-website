import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import { getStandortBySlug } from "@/lib/repositories/standorte";

export const dynamic = "force-dynamic";

export default async function KontaktPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const hatAdresse = standort.strasse && standort.plz && standort.ort;

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-3">
                  <p className="tag">Kontakt &amp; Anfahrt, {standort.name}</p>
                  <h1 className="t-1">so erreichst du uns</h1>
                </div>
                <p className="lede">
                  {standort.kurse.length > 0
                    ? "Termine laufen über die Onlinebuchung. Alles andere gern direkt per Telefon oder Mail."
                    : "Dieser Standort startet zum 1. Januar 2027. Schreib uns, wenn du vorab informiert werden willst."}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <dl className="facts">
                <div>
                  <dt>Studio</dt>
                  <dd>
                    {hatAdresse ? (
                      <>
                        Reform You Pilates Studio
                        <br />
                        {standort.strasse}
                        <br />
                        {standort.plz} {standort.ort}
                      </>
                    ) : (
                      <Flag>Adresse für {standort.name} noch offen</Flag>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Telefon</dt>
                  <dd>
                    {standort.telefon ? (
                      <a href={`tel:${standort.telefon.replace(/\s+/g, "")}`}>{standort.telefon}</a>
                    ) : (
                      <Flag>Telefon eintragen</Flag>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Mail</dt>
                  <dd>
                    {standort.email ? (
                      <>
                        <a href={`mailto:${standort.email}`}>{standort.email}</a>
                        <br />
                        <span className="small muted">Antwort in der Regel am selben Tag</span>
                      </>
                    ) : (
                      <Flag>Mail eintragen</Flag>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Öffnungszeiten</dt>
                  <dd>
                    {standort.oeffnungszeitenOffen || !standort.oeffnungszeiten ? (
                      <Flag>Öffnungszeiten eintragen</Flag>
                    ) : (
                      standort.oeffnungszeiten
                    )}
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>

        {standort.kurse.length > 0 ? (
          <section className="band">
            <div className="shell">
              <Reveal>
                <div className="split">
                  <div className="stack-3">
                    <p className="tag">Buchung</p>
                    <h2 className="t-2">termine laufen online</h2>
                  </div>
                  <div className="stack-3">
                    <p>
                      Kurse, Einzeltermine und Events werden über das
                      Buchungssystem gebucht. Dort siehst du auch die freien
                      Plätze.
                    </p>
                    <div className="btns">
                      <a className="btn" href={`/${standort.slug}/buchen`}>
                        Zur Onlinebuchung
                      </a>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        ) : null}

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <div className="split">
                <div className="stack-3">
                  <p className="tag">Anfahrt</p>
                  <h2 className="t-2">parken und öpnv</h2>
                </div>
                <div className="stack-3">
                  <ul className="list">
                    <li>
                      Parksituation <Flag>offen</Flag>
                    </li>
                    <li>
                      Haltestelle und Linie <Flag>offen</Flag>
                    </li>
                  </ul>
                  <p className="small muted">
                    Solange diese Angaben fehlen, sollte hier nichts stehen.
                    Falsche Parkhinweise ärgern mehr als fehlende.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-dark">
          <div className="shell">
            <Reveal>
              <div className="split">
                <div className="stack-3">
                  <p className="tag">Neuigkeiten</p>
                  <h2 className="t-2">neue kurszeiten und events</h2>
                </div>
                <div className="stack-3">
                  <p>
                    Neue Kurszeiten und Events werden per Mail angekündigt.
                    Die Anmeldung läuft über das Buchungssystem, dort trägst
                    du dich einmal ein und bekommst alle Infos, sobald es
                    losgeht.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
