import { notFound } from "next/navigation";
import Header from "@/components/Header";
import FederSkala from "@/components/FederSkala";
import FigurePlaceholder from "@/components/FigurePlaceholder";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { formatDatumLang, formatPreis } from "@/lib/format";
import { mwstHinweis } from "@/lib/mwst";

export const dynamic = "force-dynamic";

export default async function KursePage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const ort = standort.ort ?? standort.name;

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-3">
                  <p className="tag">Kursangebot</p>
                  <h1 className="t-1">kurse</h1>
                </div>
                {standort.kurse.length > 0 ? (
                  <p className="lede">
                    Alle Kurse finden im Studio in {ort} statt. Die
                    Federspannung zeigt, wie fordernd ein Format ist. Gebucht
                    wird online.
                  </p>
                ) : (
                  <p className="lede">
                    {standort.hinweis ?? "Kurse für diesen Standort folgen."}
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {standort.kurse.length > 0 ? (
          <>
            <section className="band band-tight band-sunk">
              <div className="shell">
                <FederSkala
                  kurse={standort.kurse}
                  linkPrefix={`/${standort.slug}/kurse#`}
                  pinned
                />
                <p className="small muted" style={{ marginTop: "var(--s3)" }}>
                  Die Einordnung leitet sich aus den Kursnamen ab.{" "}
                  <Flag>Von Janina bestätigen lassen</Flag>
                </p>
              </div>
            </section>

            <section className="band">
              <div className="shell stack-5">
                {standort.kurse.map((kurs) => (
                  <article className="split" id={kurs.slug} key={kurs.slug}>
                    <Reveal>
                      <div className="stack-3">
                        <h2 className="t-3">{kurs.name.toLowerCase()}</h2>
                        <p className="tag" style={{ color: "var(--sepia)" }}>
                          {kurs.dauerMinuten ? `${kurs.dauerMinuten} Minuten` : "Dauer offen"}
                          {kurs.hinweis ? ` · ${kurs.hinweis}` : ""}
                        </p>
                      </div>
                    </Reveal>
                    <Reveal delay={0.06}>
                      <div className="stack-3">
                        <p>{kurs.beschreibung}</p>
                        <p className="small muted">
                          {formatPreis(kurs.preisEinzelCent)} pro Einzelstunde, {mwstHinweis()}
                          {kurs.karteGueltig ? " · einlösbar mit 5er- oder 10er-Karte" : ""}
                          {kurs.karteGueltigOffen ? (
                            <>
                              {" "}
                              <Flag>nicht bestätigt</Flag>
                            </>
                          ) : null}
                        </p>
                        {kurs.offenerHinweis ? (
                          <p className="small">
                            <Flag>{kurs.offenerHinweis}</Flag>
                          </p>
                        ) : null}
                        <p>
                          <a className="go" href={`/${standort.slug}/buchen#${kurs.slug}`}>
                            Termine ansehen und buchen
                          </a>
                        </p>
                      </div>
                    </Reveal>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {standort.events.map((event) => {
          const datum = formatDatumLang(event.datum);
          return (
            <section className="band band-dark" key={event.slug}>
              <div className="shell">
                <Reveal>
                  <div className="stack-3">
                    <p className="tag">Event</p>
                    <h2 className="t-2">{event.titel.toLowerCase()}</h2>
                  </div>
                </Reveal>
                <Reveal delay={0.08}>
                  <div className="event" style={{ marginTop: "var(--s5)" }}>
                    {datum ? (
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
                    )}
                    <div className="stack-3">
                      <p>{event.beschreibung}</p>
                      <p className="small muted">
                        {event.startzeit && event.endzeit
                          ? `${event.startzeit} bis ${event.endzeit} Uhr · `
                          : ""}
                        {event.ort ?? ""}
                        {event.preisCent !== null
                          ? ` · ${(event.preisCent / 100).toLocaleString("de-DE", {
                              style: "currency",
                              currency: "EUR",
                            })} pro Person`
                          : ""}
                      </p>
                      {event.offenerHinweis ? (
                        <p className="small">
                          <Flag>{event.offenerHinweis}</Flag>
                        </p>
                      ) : null}
                      <p>
                        <a className="go" href="https://www.reform-you.de/book-online">
                          Platz sichern
                        </a>
                      </p>
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={0.1}>
                  <FigurePlaceholder
                    ratio="1610"
                    hint="Pilates-Paint-and-Wine-Abend, Leinwände und Gläser · Querformat 16:10"
                    className="event-figure"
                  />
                </Reveal>
              </div>
            </section>
          );
        })}

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <h2 className="t-2">
                  {standort.kurse.length > 0
                    ? "sag, wo du stehst. wir sagen, welcher kurs passt."
                    : "lass dich informieren, sobald es losgeht."}
                </h2>
                <div className="stack-3">
                  {standort.kurse.length > 0 ? (
                    <>
                      <p>
                        Ein Anruf reicht. Danach weißt du, ob Anfänger,
                        Fortgeschritten oder Matte der richtige Einstieg ist.
                      </p>
                      <div className="btns">
                        {standort.telefon ? (
                          <a className="btn" href={`tel:${standort.telefon.replace(/\s+/g, "")}`}>
                            {standort.telefon}
                          </a>
                        ) : null}
                        <a className="btn btn-line" href={`/${standort.slug}/kontakt`}>
                          Kontakt
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="btns">
                      <a className="btn btn-line" href={`/${standort.slug}/kontakt`}>
                        Kontakt
                      </a>
                    </div>
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
