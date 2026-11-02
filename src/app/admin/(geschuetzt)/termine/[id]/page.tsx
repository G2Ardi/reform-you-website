import { notFound } from "next/navigation";
import { getTerminMitBuchungen } from "@/lib/repositories/kurstermine";
import { getMitarbeiter } from "@/lib/auth/admin";
import { formatDatumUhrzeit } from "@/lib/format";
import ActionButton from "@/components/forms/ActionButton";
import {
  adminStornierenAction,
  anwesendMarkierenAction,
  kursAusfallenLassenAction,
  noShowMarkierenAction,
} from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  GEBUCHT: "gebucht",
  WARTELISTE: "warteliste",
  STORNIERT: "storniert",
  NO_SHOW: "nicht erschienen",
  ANWESEND: "anwesend",
};

export default async function AdminTerminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const termin = await getTerminMitBuchungen(id);
  if (!termin) notFound();

  const mitarbeiter = await getMitarbeiter();
  const istAdmin = mitarbeiter?.rolle === "ADMIN";

  // Aktive Buchungen zuerst, dann Warteliste nach Position, Stornierte zuletzt.
  const reihenfolge = (s: string) => (s === "GEBUCHT" || s === "ANWESEND" || s === "NO_SHOW" ? 0 : s === "WARTELISTE" ? 1 : 2);
  const buchungen = [...termin.buchungen].sort(
    (a, b) =>
      reihenfolge(a.status) - reihenfolge(b.status) ||
      (a.wartelistePosition ?? 0) - (b.wartelistePosition ?? 0) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">
          {termin.kurs.name} · {termin.standort.name}
        </h1>
        <p className="muted">
          {formatDatumUhrzeit(termin.beginn)} Uhr · Kapazität {termin.kapazitaet} · Status{" "}
          {termin.status === "AUSGEFALLEN" ? "ausgefallen" : "aktiv"}
        </p>

        {istAdmin && termin.status === "AKTIV" ? (
          <div style={{ marginTop: "var(--s3)" }}>
            <ActionButton
              label="Kurs ausfallen lassen (automatische Gutschrift an alle)"
              bestaetigung="Diesen Kurstermin wirklich ausfallen lassen? Alle gebuchten Teilnehmer erhalten automatisch eine Gutschrift und eine Mail."
              action={kursAusfallenLassenAction.bind(null, termin.id)}
            />
          </div>
        ) : null}

        <div style={{ marginTop: "var(--s4)", overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Kunde</th>
                {istAdmin ? <th>E-Mail</th> : null}
                <th>Status</th>
                <th>Bezahlt mit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {buchungen.length === 0 ? (
                <tr>
                  <td colSpan={istAdmin ? 5 : 4}>Noch keine Buchung.</td>
                </tr>
              ) : (
                buchungen.map((b) => (
                  <tr key={b.id}>
                    <td>{b.kunde.name}</td>
                    {istAdmin ? <td>{b.kunde.email}</td> : null}
                    <td>
                      {STATUS_LABEL[b.status] ?? b.status}
                      {b.status === "WARTELISTE" ? `, Position ${b.wartelistePosition ?? "?"}` : ""}
                    </td>
                    <td>{b.status === "WARTELISTE" ? "noch offen" : b.zahlungsart === "KARTE" ? "Credits" : "Einzelstunde"}</td>
                    <td style={{ display: "flex", gap: "0.6em", flexWrap: "wrap" }}>
                      {b.status === "GEBUCHT" || b.status === "NO_SHOW" ? (
                        <ActionButton
                          label="Anwesend"
                          className="btn btn-klein"
                          action={anwesendMarkierenAction.bind(null, b.id)}
                        />
                      ) : null}
                      {b.status === "GEBUCHT" || b.status === "ANWESEND" ? (
                        <ActionButton
                          label="No-Show"
                          bestaetigung="Als No-Show markieren? Der Credit verfällt ersatzlos."
                          action={noShowMarkierenAction.bind(null, b.id)}
                        />
                      ) : null}
                      {istAdmin && b.status === "GEBUCHT" ? (
                        <ActionButton
                          label="Kulanz-Storno"
                          bestaetigung="Trotz abgelaufener Frist stornieren und Gutschrift erteilen?"
                          action={adminStornierenAction.bind(null, b.id)}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
