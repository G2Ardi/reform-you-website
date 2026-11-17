import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import HeroImage from "@/components/HeroImage";
import FigurePlaceholder from "@/components/FigurePlaceholder";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { formatDatumLang } from "@/lib/format";
import { kursKurzinfo } from "@/lib/content/standorte-content";

export const dynamic = "force-dynamic";

/** Bilder, die sich je Standort unterscheiden. Fehlt ein Standort hier,
 * greift die Wassenberg-Variante als Fallback, bis eigene Fotos da sind. */
const HERO_BILD: Record<string, string> = {
  wegberg: "/bilder/hero-wegberg.jpg",
};
const STUDIORAUM_BILD: Record<string, string> = {
  wegberg: "/bilder/studioraum-wegberg.jpg",
};

export default async function StartPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const hatKurse = standort.kurse.length > 0;
  const hatCredits = hatKurse;
  const naechstesEvent = standort.events[0] ?? null;
  const ort = standort.ort ?? standort.name;

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} />
      <main id="inhalt">
        <section className="hero">
          <HeroImage
            src={HERO_BILD[standort.slug] ?? "/bilder/hero.jpg"}
            alt={`Blick in das Studio von Reform You in ${ort}`}
          />
          <div className="shell hero-body">
            <p className="hero-mark">
              <Image
                src="/logo/reformyou-logo-light.png"
                alt="Reform You Pilates Studio"
                width={888}
                height={510}
                priority
                className="hero-mark-logo"
              />
            </p>
            <div className="btns hero-btns">
              {hatKurse ? (
                <a className="btn" href={`/${standort.slug}/buchen`}>
                  Kurs buchen
                </a>
              ) : (
                <a className="btn btn-line" href={`/${standort.slug}/kontakt`}>
                  Kontakt aufnehmen
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="stack-3">
                <p className="tag">Reformer Pilates · {ort}</p>
                <h1 className="t-1 hero-title" style={{ color: "inherit" }}>
                  fünfzig minuten, in denen dich niemand braucht.
                </h1>
              </div>
            </Reveal>
            {hatKurse ? (
              <Reveal delay={0.08}>
                <div className="btns" style={{ marginTop: "var(--s4)" }}>
                  <a className="btn" href={`/${standort.slug}/buchen`}>
                    Termin buchen
                  </a>
                  <a className="btn btn-line" href="#skala">
                    Kurse ansehen
                  </a>
                </div>
              </Reveal>
            ) : null}
          </div>
        </section>

        {standort.hinweis ? (
          <section className="band band-dark">
            <div className="shell">
              <Reveal>
                <div className="stack-3">
                  <p className="tag">Im Aufbau</p>
                  <h2 className="t-2">kurse folgen</h2>
                  <p className="lede">{standort.hinweis}</p>
                  <p>
                    <Link className="go" href="/wassenberg">
                      Zum Studio in Wassenberg
                    </Link>
                  </p>
                </div>
              </Reveal>
            </div>
          </section>
        ) : null}

        {hatKurse ? (
          <section className="band" id="skala">
            <div className="shell">
              <Reveal>
                <div className="split split-heavy-left">
                  <div className="stack-3">
                    <p className="tag">Kursangebot</p>
                    <h2 className="t-2">Kurse für jedes Level</h2>
                  </div>
                  <p className="lede">
                    Ob du gerade einsteigst, neue Herausforderungen suchst oder dir Zeit zum Dehnen nehmen möchtest:
                    Unsere Kursformate holen dich dort ab, wo du stehst passend zu deinen Zielen.
                  </p>
                </div>
              </Reveal>
              <div className="stack-5" style={{ marginTop: "var(--s5)" }}>
                {standort.kurse
                  .filter((k) => kursKurzinfo[k.slug])
                  .map((k, i) => (
                    <Reveal key={k.slug} delay={i * 0.04}>
                      <article className="split" id={k.slug}>
                        <div className="stack-3">
                          <h3 className="t-3">{kursKurzinfo[k.slug].titel.toLowerCase()}</h3>
                          {kursKurzinfo[k.slug].zusatz ? (
                            <p className="tag" style={{ color: "var(--sepia)" }}>
                              {kursKurzinfo[k.slug].zusatz}
                            </p>
                          ) : null}
                        </div>
                        <p>{k.beschreibung}</p>
                      </article>
                    </Reveal>
                  ))}
              </div>
              <p style={{ marginTop: "var(--s4)" }}>
                <a className="go" href={`/${standort.slug}/kurse`}>
                  Alle Kurse und Termine
                </a>
              </p>
            </div>
          </section>
        ) : null}

        <section className="band band-sunk">
          <div className="shell">
            <div className="split">
              <Reveal>
                <FigurePlaceholder
                  ratio="45"
                  hint="Reformer im Studio · Hochformat 4:5"
                  src="/bilder/reformer-studio.jpg"
                  alt="Reformer im Studio, Platzhalterfoto"
                />
              </Reveal>
              <Reveal delay={0.08}>
                <div className="stack-3">
                  <p className="tag">Am Gerät</p>
                  <h2 className="t-2">Ein Gerät. Viele Möglichkeiten. Reformer.</h2>
                  <p>
                    Der Reformer ist ein Pilatesgerät mit einer beweglichen Liegefläche, Federn und Seilzügen. Je nach
                    Übung unterstützen dich die Federn in deiner Bewegung oder geben dir einen gezielten Widerstand.
                    Gemeinsam passen wir die Einstellungen an dich und dein Trainingslevel an.
                  </p>
                  <p>
                    Ob im Liegen, Sitzen oder Stehen: Mit kontrollierten, fließenden Bewegungen trainierst du Kraft,
                    Beweglichkeit und Balance. Deine Atmung und eine bewusste Körperhaltung begleiten dabei jede
                    Übung.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {hatKurse ? (
          <section className="band">
            <div className="shell">
              <Reveal>
                <div className="stack-3">
                  <p className="tag">Dein erster Termin</p>
                  <h2 className="t-2">wie der erste besuch abläuft</h2>
                </div>
              </Reveal>
              <div className="when" style={{ marginTop: "var(--s5)" }}>
                <Reveal>
                  <div className="when-item">
                    <span className="when-time">Vor deinem Besuch</span>
                    <p>
                      Suche dir auf unserer Website den passenden Kurs aus, registriere dich und buche deinen Platz. Für
                      deinen Einstieg empfehlen wir Reformer Basics.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.06}>
                  <div className="when-item">
                    <span className="when-time">Ankommen &amp; kennenlernen</span>
                    <p>
                      Komm bitte zehn Minuten früher und trage bequeme Kleidung. Stoppersocken sind Pflicht. Gemeinsam
                      machen wir dich mit dem Reformer und der Pilates Atmung vertraut.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.12}>
                  <div className="when-item">
                    <span className="when-time">Nach 50 Minuten</span>
                    <p>
                      Du hast den Reformer kennengelernt und erlebt, wie bewusste Bewegung und Atmung Körper und Geist
                      verbinden. Mit diesen ersten Grundlagen kannst du in den nächsten Stunden weiter aufbauen.
                    </p>
                  </div>
                </Reveal>
              </div>
              <p className="note small" style={{ marginTop: "var(--s5)" }}>
                Unsicher, was passt?{" "}
                {standort.telefon ? (
                  <>
                    Ruf an unter <a href={`tel:${standort.telefon.replace(/\s+/g, "")}`}>{standort.telefon}</a>{" "}
                    oder{" "}
                  </>
                ) : null}
                schreib an{" "}
                {standort.email ? (
                  <a href={`mailto:${standort.email}`}>{standort.email}</a>
                ) : (
                  <Flag>Kontaktdaten offen</Flag>
                )}
                .
              </p>
            </div>
          </section>
        ) : null}

        {hatCredits ? (
          <section className="band band-dark">
            <div className="shell">
              <Reveal>
                <div className="split split-heavy-left">
                  <div className="stack-4">
                    <div className="stack-3">
                      <p className="tag">Credits</p>
                      <h2 className="t-2">buche flexibel mit credits</h2>
                    </div>
                    <p className="lede">
                      Kein Abo, keine Bindung: Du kaufst 5 oder 10 Credits und buchst damit jeden
                      Reformer-Kurs an beiden Standorten. Eine Buchung kostet 1 Credit.
                    </p>
                    <div className="btns">
                      <a className="btn" href={`/${standort.slug}/credits`}>
                        Credits ansehen
                      </a>
                      <a className="btn btn-line" href={`/${standort.slug}/gutschein`}>
                        Gutschein verschenken
                      </a>
                    </div>
                  </div>
                  <FigurePlaceholder
                    ratio="1610"
                    hint="Studioraum · Querformat 16:10"
                    src={STUDIORAUM_BILD[standort.slug] ?? "/bilder/studioraum.jpg"}
                    alt="Studioraum, Platzhalterfoto"
                  />
                </div>
              </Reveal>
            </div>
          </section>
        ) : null}

        {naechstesEvent ? (
          <section className="band">
            <div className="shell">
              <Reveal>
                <div className="stack-3">
                  <p className="tag">Termin im Kalender</p>
                  <h2 className="t-2">{naechstesEvent.titel.toLowerCase()}</h2>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="event" style={{ marginTop: "var(--s5)" }}>
                  {(() => {
                    const datum = formatDatumLang(naechstesEvent.datum);
                    return datum ? (
                      <p className="event-date">
                        <span className="event-day">{datum.tag}</span>
                        <span className="event-mon">{datum.monatJahr}</span>
                      </p>
                    ) : (
                      <p className="event-date">
                        <span className="event-mon">
                          <Flag>Termin wird angekündigt</Flag>
                        </span>
                      </p>
                    );
                  })()}
                  <div className="stack-3">
                    <p>{naechstesEvent.beschreibung}</p>
                    <p className="small muted">
                      {naechstesEvent.startzeit && naechstesEvent.endzeit
                        ? `${naechstesEvent.startzeit} bis ${naechstesEvent.endzeit} Uhr · `
                        : ""}
                      {naechstesEvent.ort ?? ""}
                      {naechstesEvent.offenerHinweis ? (
                        <>
                          {" "}
                          <Flag>{naechstesEvent.offenerHinweis}</Flag>
                        </>
                      ) : null}
                    </p>
                    <p>
                      <a className="go" href="https://www.reform-you.de/book-online">
                        Platz sichern
                      </a>
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        ) : null}

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <h2 className="t-2 inset" style={{ marginLeft: 0 }}>
                  {hatKurse
                    ? "der erste kurs ist der schwerste. danach nicht mehr."
                    : "sag uns, dass du interesse hast. wir melden uns, sobald es losgeht."}
                </h2>
                <div className="stack-3">
                  {hatKurse ? (
                    <>
                      <p>Buche Reformer Basics online. Wenn du vorher reden willst, ruf an.</p>
                      <div className="btns">
                        <a className="btn" href={`/${standort.slug}/buchen`}>
                          Termin buchen
                        </a>
                        <a className="btn btn-line" href={`/${standort.slug}/kontakt`}>
                          Kontakt
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        Der Standort {standort.name} startet zum 1. Januar 2027. Über
                        Kurse und Termine informiert Reform You, sobald sie feststehen.
                      </p>
                      <div className="btns">
                        <a className="btn" href={`/${standort.slug}/kontakt`}>
                          Kontakt
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
