import { notFound } from "next/navigation";
import Header from "@/components/Header";
import FigurePlaceholder from "@/components/FigurePlaceholder";
import Reveal from "@/components/Reveal";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { studioContent } from "@/lib/content/standorte-content";

export const dynamic = "force-dynamic";

export default async function StudioPage({
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
                  <p className="tag">Studio {standort.name}</p>
                  <h1 className="t-1">{studioContent.ueberschrift}</h1>
                </div>
                <p className="lede">{studioContent.lede}</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-sunk">
          <div className="shell">
            <div className="split">
              <Reveal>
                <FigurePlaceholder
                  ratio="11"
                  hint={`${studioContent.janinaName} im Studio · Quadrat 1:1`}
                  src="/bilder/trainerin-studio.jpg"
                  alt="Neutrale Studioszene, Platzhalterfoto"
                />
              </Reveal>
              <Reveal delay={0.08}>
                <div className="stack-3">
                  <p className="tag">Kursleitung</p>
                  <h2 className="t-2">{studioContent.janinaName.toLowerCase()}</h2>
                  <p>{studioContent.janinaText}</p>
                  <p>
                    <strong>{studioContent.janinaBio.gruss}</strong>
                    <br />
                    {studioContent.janinaBio.rolle}
                  </p>
                  {studioContent.janinaBio.absaetze.map((a) => (
                    <p key={a}>{a}</p>
                  ))}
                  <p>{studioContent.janinaBio.schluss}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <Reveal>
              <div className="stack-3">
                <p className="tag">Unterschied</p>
                <h2 className="t-2">drei dinge, die hier anders sind</h2>
              </div>
            </Reveal>

            <div className="when" style={{ marginTop: "var(--s5)" }}>
              {studioContent.merkmale.map((m, i) => (
                <Reveal key={m.label} delay={i * 0.06}>
                  <div className="when-item">
                    <span className="when-time">{m.label}</span>
                    <p>{m.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.12}>
              <FigurePlaceholder
                ratio="1610"
                hint="Reformer-Reihe im Raum · Querformat 16:10"
                className="event-figure"
                src="/bilder/reformer-reihe.jpg"
                alt="Reformer-Reihe im Raum, Platzhalterfoto"
              />
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-dark">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-3">
                  <p className="tag">Community</p>
                  <h2 className="t-2">{studioContent.communityUeberschrift}</h2>
                </div>
                <p className="lede">{studioContent.communityText}</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <h2 className="t-2">{studioContent.abschlussUeberschrift}</h2>
                <div className="stack-3">
                  <p>
                    {standort.kurse.length > 0
                      ? studioContent.abschlussText
                      : "Nimm Kontakt auf, sobald du mehr wissen willst."}
                  </p>
                  <div className="btns">
                    {standort.kurse.length > 0 ? (
                      <a className="btn" href={`/${standort.slug}/buchen`}>
                        Kurs buchen
                      </a>
                    ) : null}
                    <a className="btn btn-line" href={`/${standort.slug}/kontakt`}>
                      Anfahrt
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
