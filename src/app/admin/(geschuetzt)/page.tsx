import Link from "next/link";
import { getAlleKommendenTermine, freiePlaetze, zaehleGebuchtePlaetze } from "@/lib/repositories/kurstermine";
import { getUmsatzUebersicht } from "@/lib/repositories/umsatz";
import { getMitarbeiter } from "@/lib/auth/admin";
import { formatDatumUhrzeit, formatPreis } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminUebersichtPage() {
  const mitarbeiter = await getMitarbeiter();
  const darfUmsatz = Boolean(mitarbeiter && mitarbeiter.rolle === "ADMIN" && mitarbeiter.darfUmsaetzeSehen);

  const termine = await getAlleKommendenTermine();
  const umsatz = darfUmsatz ? await getUmsatzUebersicht(30) : null;

  return (
    <section className="band band-tight">
      <div className="shell">
        {umsatz ? (
          <Link className="umsatz-kachel" href="/admin/umsatz">
            <span className="tag">Umsatz, letzte 30 Tage</span>
            <span className="umsatz-kachel-zahl">{formatPreis(umsatz.gesamtCent)}</span>
            <span className="small muted">Aufschlüsselung ansehen</span>
          </Link>
        ) : null}

        <h1 className="t-2">kommende termine</h1>
        <p className="small muted">Überblick über Teilnehmerzahl pro Termin, beide Standorte.</p>
        <div style={{ marginTop: "var(--s4)", overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Termin</th>
                <th>Kurs</th>
                <th>Standort</th>
                <th>Teilnehmer</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {termine.map((t) => {
                const warteliste = t.buchungen.filter((b) => b.status === "WARTELISTE").length;
                return (
                  <tr key={t.id}>
                    <td>{formatDatumUhrzeit(t.beginn)} Uhr</td>
                    <td>{t.kurs.name}</td>
                    <td>{t.standort.name}</td>
                    <td>
                      {zaehleGebuchtePlaetze(t.buchungen)} / {t.kapazitaet} gebucht
                      {freiePlaetze(t) <= 0 ? " (voll)" : ""}
                      {warteliste > 0 ? `, ${warteliste} auf der Warteliste` : ""}
                    </td>
                    <td>{t.status === "AUSGEFALLEN" ? "ausgefallen" : "aktiv"}</td>
                    <td>
                      <Link className="go" href={`/admin/termine/${t.id}`}>
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
