import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StornoButton from "@/components/forms/StornoButton";
import UmbuchenForm from "@/components/forms/UmbuchenForm";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import {
  getBuchungMitBezug,
  getUmbuchOptionen,
  stornoFristEnde,
} from "@/lib/repositories/buchungen";
import { formatDatumUhrzeit } from "@/lib/format";
import { formatDatumKurz, kartenLabel } from "@/lib/credits";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  GEBUCHT: "gebucht",
  WARTELISTE: "auf der Warteliste",
  STORNIERT: "storniert",
  NO_SHOW: "nicht erschienen",
  ANWESEND: "teilgenommen",
};

/**
 * Ziel des Links "zum Termin" aus der Bestätigungsmail. Verlangt Login (mit
 * Rückkehr hierher), zeigt den Termin und bietet Stornieren und Verschieben.
 */
export default async function BuchungDetailPage({
  params,
}: {
  params: Promise<{ standort: string; id: string }>;
}) {
  const { standort: slug, id } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  if (!kunde) {
    redirect(`/${standort.slug}/konto/login?weiter=${encodeURIComponent(`/${standort.slug}/konto/buchung/${id}`)}`);
  }

  const buchung = await getBuchungMitBezug(id);
  if (!buchung || buchung.kundeId !== kunde.id) notFound();

  const einstellungen = await getEinstellungen();
  const beginn = buchung.kursTermin.beginn;
  const fristEnde = stornoFristEnde(beginn, einstellungen.stornoFristStunden);
  const nachFrist = new Date() >= fristEnde;
  const beendet = beginn < new Date();
  const kannStornieren = (buchung.status === "GEBUCHT" || buchung.status === "WARTELISTE") && !beendet;
  const kannVerschieben = buchung.status === "GEBUCHT" && !nachFrist && !beendet;

  const optionen = kannVerschieben
    ? (await getUmbuchOptionen(buchung.id)).map((t) => ({
        id: t.id,
        label: `${t.kurs.name}, ${t.standort.name}, ${formatDatumUhrzeit(t.beginn)} Uhr`,
      }))
    : [];

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <div className="stack-3" style={{ maxWidth: "40rem" }}>
              <p className="tag">Deine Buchung</p>
              <h1 className="t-1">{buchung.kursTermin.kurs.name.toLowerCase()}</h1>
              <p className="lede">
                {buchung.kursTermin.standort.name}, {formatDatumUhrzeit(beginn)} Uhr
              </p>
              <p>
                Status: <strong>{STATUS_LABEL[buchung.status] ?? buchung.status}</strong>
                {buchung.zahlungsart === "KARTE" && buchung.karte && buchung.status === "GEBUCHT" ? (
                  <>
                    <br />
                    <span className="small muted">
                      Bezahlt mit {kartenLabel(buchung.karte.typ)}, gültig bis {formatDatumKurz(buchung.karte.gueltigBis)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </section>

        {kannStornieren ? (
          <section className="band band-tight band-sunk">
            <div className="shell stack-4" style={{ maxWidth: "40rem" }}>
              {buchung.status === "GEBUCHT" ? (
                <p className={nachFrist ? "form-fehler" : "muted"}>
                  {nachFrist
                    ? `Die Stornofrist (${einstellungen.stornoFristStunden} Stunden vor Kursbeginn) ist abgelaufen. Du kannst noch stornieren, bekommst dafür aber keine Gutschrift. Der Platz wird für die Warteliste frei.`
                    : `Kostenlos stornieren und verschieben kannst du bis ${formatDatumUhrzeit(fristEnde)} Uhr. Du bekommst deine Gutschrift zurück.`}
                </p>
              ) : null}

              <div className="stack-3">
                <h2 className="t-3">stornieren</h2>
                <StornoButton
                  standortSlug={standort.slug}
                  buchungId={buchung.id}
                  nachFrist={nachFrist}
                  warteliste={buchung.status === "WARTELISTE"}
                />
              </div>

              {buchung.status === "GEBUCHT" ? (
                <div className="stack-3">
                  <h2 className="t-3">verschieben</h2>
                  {kannVerschieben ? (
                    <UmbuchenForm standortSlug={standort.slug} buchungId={buchung.id} optionen={optionen} />
                  ) : (
                    <p className="small muted">
                      Nach Ablauf der Frist geht Verschieben nicht mehr. Storniere diese Buchung (ohne Gutschrift) und buche
                      im{" "}
                      <Link className="go" href={`/${standort.slug}/buchen`}>
                        Kursplan
                      </Link>{" "}
                      einen neuen Kurs für 1 Credit.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="band band-tight band-sunk">
            <div className="shell">
              <p className="muted">
                {buchung.status === "STORNIERT"
                  ? "Diese Buchung ist storniert."
                  : "Dieser Termin ist vorbei oder die Buchung ist abgeschlossen."}{" "}
                <Link className="go" href={`/${standort.slug}/buchen`}>
                  Neuen Termin buchen
                </Link>
              </p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
