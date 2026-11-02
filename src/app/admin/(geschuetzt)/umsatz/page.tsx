import { erzwingeUmsatzRecht } from "@/lib/auth/admin";
import { getUmsatzUebersicht } from "@/lib/repositories/umsatz";
import { formatDatumKurz } from "@/lib/credits";
import { formatPreis } from "@/lib/format";
import { istTestmodus } from "@/lib/repositories/kasse";

export const dynamic = "force-dynamic";

export default async function AdminUmsatzPage() {
  await erzwingeUmsatzRecht();
  const u = await getUmsatzUebersicht(30);

  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">umsatz</h1>
        <p className="muted" style={{ maxWidth: "40rem" }}>
          Letzte {u.tage} Tage, seit {formatDatumKurz(u.von)}. Gezählt wird das eingegangene Geld: Einzelstunden,
          Credits beim Kauf (voller Preis) und Gutscheine beim Verkauf. Ein eingelöster Gutschein zählt nicht noch
          einmal. Das ist eine Auswertung, keine Buchhaltung.
        </p>
        {istTestmodus() ? (
          <p className="hinweis-test" role="note" style={{ marginTop: "var(--s3)" }}>
            <strong>Testmodus:</strong> Die Zahlen stammen aus simulierten Zahlungen, nicht aus echtem Geld.
          </p>
        ) : null}

        <p className="umsatz-gross">
          <span className="tag">Gesamtumsatz</span>
          <span className="umsatz-gross-zahl">{formatPreis(u.gesamtCent)}</span>
          <span className="small muted">{u.anzahlZahlungen} Zahlungen</span>
        </p>

        <div style={{ marginTop: "var(--s4)", overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Posten</th>
                <th>Betrag</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Einzelstunden</td>
                <td>{formatPreis(u.einzelstundenCent)}</td>
              </tr>
              {u.einzelstundenProStandort.map((e) => (
                <tr key={e.standort}>
                  <td className="muted">davon {e.standort}</td>
                  <td className="muted">{formatPreis(e.cent)}</td>
                </tr>
              ))}
              <tr>
                <td>Credits</td>
                <td>{formatPreis(u.creditsCent)}</td>
              </tr>
              <tr>
                <td>Gutscheine</td>
                <td>{formatPreis(u.gutscheineCent)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Gesamt</strong>
                </td>
                <td>
                  <strong>{formatPreis(u.gesamtCent)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
