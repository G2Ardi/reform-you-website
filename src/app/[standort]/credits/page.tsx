import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import FigurePlaceholder from "@/components/FigurePlaceholder";
import TestmodusHinweis from "@/components/TestmodusHinweis";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { CREDITS_KATALOG, type KaufbareCredits } from "@/lib/credits";
import { formatPreis } from "@/lib/format";
import { mwstHinweis } from "@/lib/mwst";

export const dynamic = "force-dynamic";

export default async function CreditsPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const hatKurse = standort.kurse.length > 0;
  const pakete = Object.entries(CREDITS_KATALOG) as [KaufbareCredits, (typeof CREDITS_KATALOG)[KaufbareCredits]][];

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
                    <p className="tag">Credits</p>
                    <h1 className="t-1">folgt mit dem start</h1>
                  </div>
                  <p className="lede">{standort.hinweis ?? "Preise für diesen Standort stehen noch nicht fest."}</p>
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
                  <p className="tag">Credits</p>
                  <h1 className="t-1">buchen mit credits</h1>
                </div>
                <p className="lede">
                  Kein Abo, keine Bindung. Du kaufst 5 oder 10 Credits, eine Buchung kostet 1 Credit. Credits gelten an
                  beiden Standorten.
                </p>
              </div>
            </Reveal>
            <div style={{ marginTop: "var(--s3)" }}>
              <TestmodusHinweis />
            </div>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <p className="tag">Credits kaufen</p>
            </Reveal>
            <div className="credits-pakete">
              {pakete.map(([typ, p]) => (
                <article className="credits-paket" key={typ}>
                  <h2 className="t-2 credits-paket-name">{p.label.toLowerCase()}</h2>
                  <p className="credits-paket-preis">{formatPreis(p.preisCent)}</p>
                  <ul className="list credits-paket-liste">
                    <li>{p.laufzeitMonate} Monate gültig, ab Kauf</li>
                    <li>An beiden Standorten einlösbar</li>
                    <li>Eine Buchung kostet 1 Credit</li>
                  </ul>
                  <Link className="btn" href={`/${standort.slug}/kasse?art=credits&typ=${typ}`}>
                    {p.label} kaufen
                  </Link>
                </article>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: "var(--s3)" }}>
              Preise {mwstHinweis()}. Credits sind nicht übertragbar und verfallen nach Ablauf der Gültigkeit.
              Pausieren ist nicht vorgesehen.
            </p>
          </div>
        </section>

        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <p className="tag">Einzelstunde</p>
            </Reveal>
            <ul className="list" style={{ marginTop: "var(--s3)" }}>
              {standort.kurse.map((k) => (
                <li key={k.id}>
                  {k.name} <strong>{formatPreis(k.preisEinzelCent)}</strong>
                  {!k.karteGueltig ? <span className="small muted"> · nur als Einzelstunde, nicht mit Credits</span> : null}
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ marginTop: "var(--s2)" }}>
              Eine Einzelstunde buchst du direkt im{" "}
              <Link className="go" href={`/${standort.slug}/buchen`}>
                Kursplan
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <p className="tag">Stornieren und verschieben</p>
            </Reveal>
            <ul className="list" style={{ marginTop: "var(--s3)" }}>
              <li>
                Bis 24 Stunden vor Kursbeginn bekommst du deinen Credit zurück. Hast du eine Einzelstunde bezahlt, gibt
                es 1 Credit als Guthaben, kein Geld.
              </li>
              <li>
                Danach kannst du weiter stornieren, aber ohne Gutschrift. So wird der Platz für die Warteliste frei.
              </li>
              <li>
                Verschieben geht bis 24 Stunden vor Kursbeginn. Danach heißt es stornieren und neu buchen, der neue Kurs
                kostet wieder 1 Credit.
              </li>
            </ul>
          </div>
        </section>

        <section className="band band-dark" id="gutschein">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-4">
                  <div className="stack-3">
                    <p className="tag">Gutschein</p>
                    <h2 className="t-2">wählen lassen statt raten</h2>
                  </div>
                  <p className="lede">
                    Verschenke einen frei wählbaren Betrag. Der Code kommt per E-Mail und gilt an beiden Standorten.
                  </p>
                  <div className="btns">
                    <Link className="btn" href={`/${standort.slug}/gutschein`}>
                      Gutschein kaufen
                    </Link>
                  </div>
                </div>
                <FigurePlaceholder
                  ratio="1610"
                  hint="Studiodetail · Querformat 16:10"
                  src="/bilder/studiodetail.jpg"
                  alt="Studiodetail"
                />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
