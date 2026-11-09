import { erzwingeAdmin } from "@/lib/auth/admin";
import { getFreikurseFuerAdmin } from "@/lib/repositories/freikurse";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import ActionForm from "@/components/forms/ActionForm";
import ActionButton from "@/components/forms/ActionButton";
import { freikursErzeugenAction, freikursSperrenAction } from "@/lib/actions/admin";
import { formatDatumKurz } from "@/lib/credits";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { OFFEN: "offen", EINGELOEST: "eingelöst", GESPERRT: "gesperrt" };

export default async function AdminCodesPage() {
  await erzwingeAdmin();
  const [codes, einstellungen] = await Promise.all([getFreikurseFuerAdmin(), getEinstellungen()]);

  return (
    <section className="band band-tight">
      <div className="shell stack-5">
        <div>
          <h1 className="t-2">willkommenscodes</h1>
          <p className="muted" style={{ maxWidth: "42rem" }}>
            Ein Code ist eine kostenlose Einzelstunde in einem Reformer-Kurs, einmal einlösbar. Bei der
            Erstregistrierung entsteht er {einstellungen.willkommenscodeAktiv ? "automatisch" : "derzeit nicht automatisch (ausgeschaltet)"}, gültig{" "}
            {einstellungen.willkommenscodeMonate} Monate. Ein- und Ausschalten und die Gültigkeit stehen unter Einstellungen.
          </p>
        </div>

        <div>
          <h2 className="t-3">code von hand erzeugen</h2>
          <div style={{ marginTop: "var(--s3)" }}>
            <ActionForm action={freikursErzeugenAction} initialState={null} submitLabel="Code erzeugen">
              <div className="form-row">
                <label htmlFor="c-email">E-Mail der Empfängerin (optional, dann wird der Code gleich verschickt)</label>
                <input className="input" id="c-email" name="email" type="email" autoComplete="off" />
              </div>
              <div className="form-row">
                <label htmlFor="c-monate">Gültigkeit in Monaten (leer = {einstellungen.willkommenscodeMonate})</label>
                <input className="input" id="c-monate" name="monate" type="number" min={1} max={36} />
              </div>
              <div className="form-row">
                <label htmlFor="c-notiz">Notiz (intern)</label>
                <input className="input" id="c-notiz" name="notiz" placeholder="z. B. Aktion Frühjahr" />
              </div>
            </ActionForm>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Art</th>
                <th>Status</th>
                <th>Gültig bis</th>
                <th>Für</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={6}>Noch keine Codes.</td>
                </tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.code}</strong>
                    </td>
                    <td>{c.art === "AUTO" ? "automatisch" : "von Hand"}</td>
                    <td>{STATUS_LABEL[c.status] ?? c.status}</td>
                    <td>{formatDatumKurz(c.gueltigBis)}</td>
                    <td>
                      {c.kunde ? `${c.kunde.name} (${c.kunde.email})` : (c.email ?? "")}
                      {c.notiz ? <span className="small muted"> · {c.notiz}</span> : null}
                    </td>
                    <td>
                      {c.status === "OFFEN" ? (
                        <ActionButton
                          label="Sperren"
                          bestaetigung="Diesen Code sperren? Er lässt sich danach nicht mehr einlösen."
                          action={freikursSperrenAction.bind(null, c.id)}
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
