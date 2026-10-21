import { notFound } from "next/navigation";
import { getTerminMitBuchungen } from "@/lib/repositories/kurstermine";
import { formatDatumUhrzeit } from "@/lib/format";
import ActionButton from "@/components/forms/ActionButton";
import { adminStornierenAction, kursAusfallenLassenAction, noShowMarkierenAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  GEBUCHT: "gebucht",
  WARTELISTE: "warteliste",
  STORNIERT: "storniert",
  NO_SHOW: "nicht erschienen",
};

export default async function AdminTerminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const termin = await getTerminMitBuchungen(id);
  if (!termin) notFound();

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

        {termin.status === "AKTIV" ? (
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
                <th>E-Mail</th>
                <th>Status</th>
                <th>Zahlungsart</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {termin.buchungen.length === 0 ? (
                <tr>
                  <td colSpan={5}>Noch keine Buchung.</td>
                </tr>
              ) : (
                termin.buchungen.map((b) => (
                  <tr key={b.id}>
                    <td>{b.kunde.name}</td>
                    <td>{b.kunde.email}</td>
                    <td>
                      {STATUS_LABEL[b.status] ?? b.status}
                      {b.status === "WARTELISTE" ? `, Position ${b.wartelistePosition ?? "?"}` : ""}
                    </td>
                    <td>{b.zahlungsart === "KARTE" ? "Karte" : "Einzelzahlung"}</td>
                    <td style={{ display: "flex", gap: "0.6em", flexWrap: "wrap" }}>
                      {b.status === "GEBUCHT" ? (
                        <>
                          <ActionButton
                            label="No-Show"
                            bestaetigung="Als No-Show markieren? Die Einheit verfällt ersatzlos."
                            action={noShowMarkierenAction.bind(null, b.id)}
                          />
                          <ActionButton
                            label="Kulanz-Storno"
                            bestaetigung="Trotz abgelaufener Frist stornieren und Gutschrift erteilen?"
                            action={adminStornierenAction.bind(null, b.id)}
                          />
                        </>
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
