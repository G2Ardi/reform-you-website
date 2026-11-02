import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import StornoButton from "@/components/forms/StornoButton";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";
import { getBuchungenFuerKunde, stornoFristEnde } from "@/lib/repositories/buchungen";
import { getAlleKartenFuerKunde } from "@/lib/repositories/karten";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { formatDatumUhrzeit } from "@/lib/format";
import { formatDatumKurz, kartenLabel } from "@/lib/credits";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  GEBUCHT: "gebucht",
  WARTELISTE: "warteliste",
  STORNIERT: "storniert",
  NO_SHOW: "nicht erschienen",
  ANWESEND: "teilgenommen",
};

export default async function ProfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ standort: string }>;
  searchParams: Promise<{ neu?: string }>;
}) {
  const { standort: slug } = await params;
  const { neu } = await searchParams;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  if (!kunde) redirect(`/${standort.slug}/konto/login`);

  const [buchungen, karten, einstellungen] = await Promise.all([
    getBuchungenFuerKunde(kunde.id),
    getAlleKartenFuerKunde(kunde.id),
    getEinstellungen(),
  ]);

  const jetzt = new Date();

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="split split-heavy-left">
                <div className="stack-3">
                  <p className="tag">Konto</p>
                  <h1 className="t-1">{kunde.name.toLowerCase()}</h1>
                  <p className="muted">{kunde.email}</p>
                </div>
                <form action={logoutAction.bind(null, standort.slug)}>
                  <button className="btn btn-line" type="submit">
                    Ausloggen
                  </button>
                </form>
              </div>
            </Reveal>
            {neu === "credits" ? (
              <p className="form-erfolg" style={{ marginTop: "var(--s3)", maxWidth: "36rem" }}>
                Kauf abgeschlossen. Deine Credits sind unten aufgeführt, eine Bestätigung kommt per E-Mail.
              </p>
            ) : null}
            {neu === "buchung" ? (
              <p className="form-erfolg" style={{ marginTop: "var(--s3)", maxWidth: "36rem" }}>
                Gebucht. Du bekommst gleich eine Bestätigung per E-Mail.
              </p>
            ) : null}
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <h2 className="t-3">deine credits</h2>
            </Reveal>
            {karten.length === 0 ? (
              <p className="muted" style={{ marginTop: "var(--s3)" }}>
                Noch keine Credits.{" "}
                <Link className="go" href={`/${standort.slug}/credits`}>
                  Credits kaufen
                </Link>
              </p>
            ) : (
              <div style={{ marginTop: "var(--s3)" }}>
                {karten.map((k) => (
                  <div className="card" key={k.id}>
                    <strong>{kartenLabel(k.typ)}</strong>
                    <span>
                      {k.einheitenRest} von {k.einheitenGesamt} Credits übrig
                    </span>
                    <span className="small muted">
                      gültig bis {formatDatumKurz(k.gueltigBis)}
                      {k.gueltigBis < jetzt ? " (abgelaufen)" : ""}
                    </span>
                    {k.notiz ? <span className="small muted">{k.notiz}</span> : null}
                  </div>
                ))}
              </div>
            )}
            <p className="small muted" style={{ marginTop: "var(--s3)" }}>
              Credits gelten an beiden Standorten. Pausieren ist nicht vorgesehen.
            </p>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <Reveal>
              <h2 className="t-3">deine buchungen</h2>
            </Reveal>
            {buchungen.length === 0 ? (
              <p className="muted" style={{ marginTop: "var(--s3)" }}>
                Noch keine Buchung.{" "}
                <Link className="go" href={`/${standort.slug}/buchen`}>
                  Jetzt einen Termin buchen
                </Link>
              </p>
            ) : (
              <div style={{ marginTop: "var(--s3)" }}>
                {buchungen.map((b) => {
                  const fristEnde = stornoFristEnde(b.kursTermin.beginn, einstellungen.stornoFristStunden);
                  const nachFrist = jetzt >= fristEnde;
                  const bevorstehend = b.kursTermin.beginn > jetzt;
                  const aktiv = b.status === "GEBUCHT" || b.status === "WARTELISTE";

                  return (
                    <div className="card" key={b.id}>
                      <strong>
                        {b.kursTermin.kurs.name} · {b.kursTermin.standort.name}
                      </strong>
                      <span>{formatDatumUhrzeit(b.kursTermin.beginn)} Uhr</span>
                      <span className="small">
                        Status: {STATUS_LABEL[b.status] ?? b.status}
                        {b.status === "WARTELISTE" ? `, Position ${b.wartelistePosition ?? "?"}` : ""}
                      </span>
                      {aktiv && bevorstehend ? (
                        <>
                          {b.status === "GEBUCHT" && nachFrist ? (
                            <span className="small muted">
                              Stornofrist abgelaufen, Stornieren geht noch, aber ohne Gutschrift.
                            </span>
                          ) : null}
                          <div className="btns" style={{ marginTop: "0.4em", alignItems: "center" }}>
                            <StornoButton
                              standortSlug={standort.slug}
                              buchungId={b.id}
                              nachFrist={b.status === "GEBUCHT" && nachFrist}
                              warteliste={b.status === "WARTELISTE"}
                            />
                            {b.status === "GEBUCHT" && !nachFrist ? (
                              <Link className="go small" href={`/${standort.slug}/konto/buchung/${b.id}`}>
                                Verschieben
                              </Link>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
