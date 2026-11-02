import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Kursplan, { type KursplanTermin } from "@/components/Kursplan";
import { getStandortBySlug, getAlleStandorte } from "@/lib/repositories/standorte";
import { getTermineImFenster, freiePlaetze } from "@/lib/repositories/kurstermine";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { getAktiveKartenFuerKunde } from "@/lib/repositories/karten";
import { kartenLabel } from "@/lib/credits";
import { formatPreis } from "@/lib/format";
import { mwstHinweis } from "@/lib/mwst";

export const dynamic = "force-dynamic";

export default async function BuchenPage({
  params,
  searchParams,
}: {
  params: Promise<{ standort: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { standort: slug } = await params;
  const { tag } = await searchParams;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  const termine = await getTermineImFenster();
  const alleStandorte = await getAlleStandorte();
  const aktiveKarten = kunde ? await getAktiveKartenFuerKunde(kunde.id) : [];

  const kursplanTermine: KursplanTermin[] = termine.map((termin) => {
    const frei = freiePlaetze(termin);
    // Gekaufte Credits gelten nur für Kurse mit karteGueltig, Guthaben aus
    // Stornierungen oder Kulanz für jeden Kurs.
    const nutzbareKarten = aktiveKarten.filter((k) => termin.kurs.karteGueltig || k.typ === "GUTHABEN");
    const meine = kunde
      ? termin.buchungen.find((b) => b.kundeId === kunde.id && (b.status === "GEBUCHT" || b.status === "WARTELISTE"))
      : undefined;

    return {
      id: termin.id,
      beginnIso: termin.beginn.toISOString(),
      endeIso: termin.ende.toISOString(),
      kapazitaet: termin.kapazitaet,
      frei,
      kapazitaetOffen: termin.kurs.kapazitaetOffen,
      ausgefallen: termin.status === "AUSGEFALLEN",
      trainerName: termin.trainerName,
      kursName: termin.kurs.name,
      skalaLabel: termin.kurs.skalaLabel,
      karteGueltig: termin.kurs.karteGueltig,
      preisLabel: formatPreis(termin.kurs.preisEinzelCent),
      standortSlug: termin.standort.slug,
      standortName: termin.standort.name,
      nutzbareKarten: nutzbareKarten.map((k) => ({
        id: k.id,
        label: `${kartenLabel(k.typ)}, ${k.einheitenRest} übrig`,
      })),
      meinStatus: meine ? (meine.status as "GEBUCHT" | "WARTELISTE") : null,
      meineBuchungId: meine?.id ?? null,
    };
  });

  const standortOptionen = alleStandorte.map((s) => ({ slug: s.slug, name: s.name }));

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight plan-band">
          <div className="shell">
            <div className="plan-kopf">
              <div className="stack-3">
                <p className="tag">Termine</p>
                <h1 className="t-1">buchen</h1>
              </div>
              <p className="small muted plan-kopf-text">
                Tag wählen, Kurs buchen. Buchen geht mit Konto.{" "}
                {!kunde ? (
                  <>
                    <Link className="go" href={`/${standort.slug}/konto/login?weiter=${encodeURIComponent(`/${standort.slug}/buchen`)}`}>
                      Login
                    </Link>{" "}
                    oder{" "}
                    <Link className="go" href={`/${standort.slug}/konto/registrieren`}>
                      Konto anlegen
                    </Link>
                    .{" "}
                  </>
                ) : null}
                Preise {mwstHinweis()}.
              </p>
            </div>

            {kursplanTermine.length === 0 ? (
              <p className="muted">Aktuell sind keine Termine geplant.</p>
            ) : (
              <Kursplan
                aktuellerStandortSlug={standort.slug}
                standorte={standortOptionen}
                eingeloggt={Boolean(kunde)}
                termine={kursplanTermine}
                startTag={tag}
              />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
