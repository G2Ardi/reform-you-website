import Link from "next/link";
import { getAlleKommendenTermine, freiePlaetze, zaehleGebuchtePlaetze } from "@/lib/repositories/kurstermine";
import { formatDatumUhrzeit } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminUebersichtPage() {
  const termine = await getAlleKommendenTermine();

  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">kommende termine</h1>
        <p className="small muted">Grober Überblick über Teilnehmerzahl pro Termin, beide Standorte.</p>
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
              {termine.map((t) => (
                <tr key={t.id}>
                  <td>{formatDatumUhrzeit(t.beginn)} Uhr</td>
                  <td>{t.kurs.name}</td>
                  <td>{t.standort.name}</td>
                  <td>
                    {zaehleGebuchtePlaetze(t.buchungen)} / {t.kapazitaet} gebucht
                    {freiePlaetze(t) <= 0 ? " (voll)" : ""}
                  </td>
                  <td>{t.status === "AUSGEFALLEN" ? "ausgefallen" : "aktiv"}</td>
                  <td>
                    <Link className="go" href={`/admin/termine/${t.id}`}>
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
