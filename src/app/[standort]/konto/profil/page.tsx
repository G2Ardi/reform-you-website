import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Flag from "@/components/Flag";
import StornoButton from "@/components/forms/StornoButton";
import UmbuchenForm from "@/components/forms/UmbuchenForm";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";
import { getBuchungenFuerKunde } from "@/lib/repositories/buchungen";
import { getAlleKartenFuerKunde } from "@/lib/repositories/karten";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { getUmbuchOptionen } from "@/lib/repositories/kurstermine";
import { formatDatumUhrzeit } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  GEBUCHT: "gebucht",
  WARTELISTE: "warteliste",
  STORNIERT: "storniert",
  NO_SHOW: "nicht erschienen",
};

const KARTE_LABEL: Record<string, string> = {
  FUENFER: "5er-Karte",
  ZEHNER: "10er-Karte",
  GUTHABEN: "Guthaben",
};

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  if (!kunde) redirect(`/${standort.slug}/konto/login`);

  const [buchungen, karten, einstellungen] = await Promise.all([
    getBuchungenFuerKunde(kunde.id),
    getAlleKartenFuerKunde(kunde.id),
    getEinstellungen(),
  ]);

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
          </div>
        </section>

        <section className="band band-tight band-sunk">
          <div className="shell">
            <Reveal>
              <h2 className="t-3">ihre karten</h2>
            </Reveal>
            {karten.length === 0 ? (
              <p className="muted" style={{ marginTop: "var(--s3)" }}>
                Noch keine Karte. Eine 5er- oder 10er-Karte gilt an beiden Standorten.
              </p>
            ) : (
              <div style={{ marginTop: "var(--s3)" }}>
                {karten.map((k) => (
                  <div className="card" key={k.id}>
                    <strong>{KARTE_LABEL[k.typ]}</strong>
                    <span>
                      {k.einheitenRest} von {k.einheitenGesamt} Einheiten übrig
                    </span>
                    <span className="small muted">
                      gültig bis {k.gueltigBis.toLocaleDateString("de-DE")}
                      {k.gueltigBis < new Date() ? " (abgelaufen)" : ""}
                    </span>
                    {k.notiz ? <span className="small muted">{k.notiz}</span> : null}
                  </div>
                ))}
              </div>
            )}
            <p className="small muted" style={{ marginTop: "var(--s3)" }}>
              Pausieren einer Karte ist aktuell nicht vorgesehen. <Flag>Von Janina nicht bestätigt</Flag>
            </p>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <Reveal>
              <h2 className="t-3">ihre buchungen</h2>
            </Reveal>
            {buchungen.length === 0 ? (
              <p className="muted" style={{ marginTop: "var(--s3)" }}>
                Noch keine Buchung. <a className="go" href={`/${standort.slug}/buchen`}>Jetzt einen Termin buchen</a>
              </p>
            ) : (
              <div style={{ marginTop: "var(--s3)" }}>
                {await Promise.all(
                  buchungen.map(async (b) => {
                    const fristEnde = new Date(
                      b.kursTermin.beginn.getTime() - einstellungen.stornoFristStunden * 60 * 60 * 1000,
                    );
                    const nochStornierbar = b.status === "GEBUCHT" && new Date() < fristEnde;
                    const nochUmbuchbar = nochStornierbar;

                    const optionen = nochUmbuchbar
                      ? (await getUmbuchOptionen(b.kursTermin.kurs.slug, b.kursTermin.id)).map((t) => ({
                          id: t.id,
                          label: `${t.standort.name}, ${formatDatumUhrzeit(t.beginn)} Uhr`,
                        }))
                      : [];

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
                        {b.status === "GEBUCHT" && !nochStornierbar ? (
                          <span className="small muted">nicht mehr stornierbar</span>
                        ) : null}
                        {nochStornierbar ? (
                          <div className="btns" style={{ marginTop: "0.4em" }}>
                            <StornoButton standortSlug={standort.slug} buchungId={b.id} />
                          </div>
                        ) : null}
                        {nochUmbuchbar ? (
                          <div style={{ marginTop: "0.4em" }}>
                            <UmbuchenForm standortSlug={standort.slug} buchungId={b.id} optionen={optionen} />
                          </div>
                        ) : null}
                      </div>
                    );
                  }),
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
