import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { unternehmen } from "@/lib/content/standorte-content";

export const dynamic = "force-dynamic";

export default async function ImpressumPage({
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
                  <p className="tag">Rechtliches</p>
                  <h1 className="t-1">impressum</h1>
                </div>
                <p className="lede">Angaben gemäß § 5 DDG.</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <dl className="facts">
                <div>
                  <dt>Betreiber</dt>
                  <dd>
                    {unternehmen.name}
                    <br />
                    {unternehmen.strasse}
                    <br />
                    {unternehmen.plz} {unternehmen.ort}
                  </dd>
                </div>
                <div>
                  <dt>Vertreten durch</dt>
                  <dd>{unternehmen.vertretenDurch}</dd>
                </div>
                <div>
                  <dt>Studio {standort.name}</dt>
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
                  <dt>Kontakt</dt>
                  <dd>
                    {standort.telefon ? (
                      <>
                        <a href={`tel:${standort.telefon.replace(/\s+/g, "")}`}>{standort.telefon}</a>
                        <br />
                      </>
                    ) : null}
                    {standort.email ? (
                      <a href={`mailto:${standort.email}`}>{standort.email}</a>
                    ) : (
                      <Flag>Kontakt offen</Flag>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Umsatzsteuer-Identifikationsnummer</dt>
                  <dd>{unternehmen.ustId}</dd>
                </div>
                <div>
                  <dt>Verantwortlich nach § 18 Abs. 2 MStV</dt>
                  <dd>
                    {unternehmen.vertretenDurch}
                    <br />
                    {hatAdresse ? (
                      <>
                        {standort.strasse}, {standort.plz} {standort.ort}
                      </>
                    ) : (
                      <Flag>Adresse noch offen</Flag>
                    )}
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <Reveal>
              <div className="split">
                <div className="stack-3">
                  <p className="tag">Offen</p>
                  <h2 className="t-2">was noch fehlt</h2>
                </div>
                <div className="stack-3">
                  <p>Für eine vollständige Rechtsseite fehlen noch:</p>
                  <ul className="list">
                    <li>
                      Handelsregister und Registernummer der GmbH{" "}
                      <Flag>offen</Flag>
                    </li>
                    <li>
                      Datenschutzerklärung als eigene Seite <Flag>offen</Flag>
                    </li>
                    <li>
                      Hinweis zur Streitschlichtung, falls gewünscht{" "}
                      <Flag>offen</Flag>
                    </li>
                  </ul>
                  <p className="small muted">
                    Diese Punkte sollte eine Rechtsberatung prüfen, nicht wir.
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
