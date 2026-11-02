import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import GutscheinForm from "@/components/forms/GutscheinForm";
import TestmodusHinweis from "@/components/TestmodusHinweis";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { GUTSCHEIN_GUELTIGKEIT_JAHRE } from "@/lib/credits";

export const dynamic = "force-dynamic";

export default async function GutscheinPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  const heute = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-3">
                  <p className="tag">Gutschein</p>
                  <h1 className="t-1">gutschein verschenken</h1>
                </div>
                <p className="lede">
                  Wähle einen Betrag und das Lieferdatum. Der Code geht per E-Mail an die Beschenkte und lässt sich im
                  Bezahlschritt für Einzelstunden und Credits einlösen, an beiden Standorten. Gültig {GUTSCHEIN_GUELTIGKEIT_JAHRE} Jahre ab Kauf.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <div style={{ marginBottom: "var(--s3)" }}>
              <TestmodusHinweis />
            </div>
            <GutscheinForm
              standortSlug={standort.slug}
              vorbelegtName={kunde?.name ?? ""}
              vorbelegtEmail={kunde?.email ?? ""}
              heute={heute}
            />
            <p className="small muted" style={{ marginTop: "var(--s3)" }}>
              Mit der Bestellung stimmst du den AGB zu. Ein Gutschein wird nicht in Geld erstattet.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
