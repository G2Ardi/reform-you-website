import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import { getStandortBySlug } from "@/lib/repositories/standorte";

export const dynamic = "force-dynamic";

export default async function AgbPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

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
                  <h1 className="t-1">agb</h1>
                </div>
                <p className="lede">
                  Die allgemeinen Geschäftsbedingungen werden von der
                  bestehenden Seite unverändert übernommen, sobald sie
                  vorliegen.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <div className="split">
                <div className="stack-3">
                  <p className="tag">Status</p>
                  <h2 className="t-2">text noch nicht übernommen</h2>
                </div>
                <div className="stack-3">
                  <p>
                    Rechtstexte formulieren wir nicht neu, weil jede Änderung
                    rechtliche Wirkung hat. Der Text wird eins zu eins von der
                    bestehenden Seite kopiert.
                  </p>
                  <p>
                    <Flag>AGB-Text von der alten Seite einsetzen</Flag>
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <Reveal>
              <div className="split">
                <div className="stack-3">
                  <p className="tag">Checkliste</p>
                  <h2 className="t-2">was der text abdecken sollte</h2>
                </div>
                <div className="stack-3">
                  <ul className="list">
                    <li>Zustandekommen des Vertrags bei Onlinebuchung</li>
                    <li>Absage und Umbuchung von Terminen, mit Frist</li>
                    <li>Laufzeit und Kündigung der Abos</li>
                    <li>Verhalten im Studio und Haftung</li>
                    <li>Gesundheitliche Voraussetzungen und Teilnahme nach der Geburt</li>
                    <li>Gutscheine und deren Gültigkeit</li>
                  </ul>
                  <p className="small muted">
                    Diese Liste ist eine Checkliste, keine Rechtsberatung.
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
