import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import HeroImage from "@/components/HeroImage";
import FederSkala from "@/components/FederSkala";
import FigurePlaceholder from "@/components/FigurePlaceholder";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { formatDatumLang } from "@/lib/format";

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
  const hatAbo = standort.aboModelle.length > 0;
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
                <p className="lede" style={{ maxWidth: "40ch" }}>
                  Kleine Gruppen am Reformer. Das Gerät wird auf dich
                  eingestellt, nicht du auf das Gerät.
                </p>
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
                    <h2 className="t-2">fünf formate auf einer skala</h2>
                  </div>
                  <p className="lede">
                    Am Reformer stellt die Federspannung ein, wie schwer eine
                    Übung ist. Deshalb steht jedes Format hier an seiner
                    Position, nicht in einer Reihe gleich aussehender
                    Kacheln.
                  </p>
                </div>
              </Reveal>
              <FederSkala
                kurse={standort.kurse}
                linkPrefix={`/${standort.slug}/kurse#`}
              />
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
                  <h2 className="t-2">widerstand, den du selbst bestimmst</h2>
                  <p>
                    Der Reformer ist ein Wagen auf Schienen. Sein Widerstand
                    kommt aus Federn, die vor jeder Übung neu eingestellt
                    werden. Genau darin liegt der Unterschied zum klassischen
                    Krafttraining: du arbeitest gegen einen Widerstand, der zu
                    dir passt, nicht gegen ein festes Gewicht.
                  </p>
                  <p>
                    Weil die Bewegung fließend bleibt, arbeitet die
                    Tiefenmuskulatur mit. Das Training funktioniert auch nach
                    einer Verletzung oder einer Schwangerschaft, weil sich das
                    Gerät anpassen lässt und nicht du.
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
                    <span className="when-time">vorher</span>
                    <p>
                      Kurs online buchen. Ohne Vorführung, ohne
                      Beratungsgespräch. Für den Einstieg passt Reformer
                      Basics, mit Baby oder Kleinkind Pilates x Mommy &amp; Mini.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.06}>
                  <div className="when-item">
                    <span className="when-time">zehn minuten früher</span>
                    <p>
                      Bequeme Kleidung, Stoppersocken. Die zehn Minuten gehen
                      dafür drauf, den Reformer auf deine Körpergröße
                      einzustellen.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.12}>
                  <div className="when-item">
                    <span className="when-time">nach fünfzig minuten</span>
                    <p>
                      Du weißt, wie das Gerät funktioniert, und ob der
                      nächste Termin Anfänger oder Fortgeschritten heißt.
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

        {hatAbo ? (
          <section className="band band-dark">
            <div className="shell">
              <Reveal>
                <div className="split split-heavy-left">
                  <div className="stack-4">
                    <div className="stack-3">
                      <p className="tag">Abo-Modell</p>
                      <h2 className="t-2">der feste platz in deiner woche</h2>
                    </div>
                    <p className="lede">
                      Ein Abo sichert dir deinen Termin, statt dass du jede
                      Woche neu schaust, ob noch etwas frei ist. Verfügbar für
                      alle vier Kursformate.
                    </p>
                    <p className="small">
                      <Flag>Konditionen eintragen</Flag>
                    </p>
                    <div className="btns">
                      <a className="btn" href={`/${standort.slug}/abo`}>
                        Abo ansehen
                      </a>
                      <a className="btn btn-line" href={`/${standort.slug}/abo#geschenkkarte`}>
                        Geschenkkarte
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
