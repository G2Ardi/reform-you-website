import ActionForm from "@/components/forms/ActionForm";
import { kulanzAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default function AdminKulanzPage() {
  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">kulanz</h1>
        <p className="muted" style={{ maxWidth: "40rem" }}>
          Freitext-Werkzeug für Ausnahmen außerhalb der normalen Regeln: eine Einheit oder Karte manuell
          gutschreiben, unabhängig von Stornofristen. Nicht hübsch, aber funktional.
        </p>
        <div style={{ marginTop: "var(--s4)" }}>
          <ActionForm action={kulanzAction} initialState={null} submitLabel="Ausführen">
            <div className="form-row">
              <label htmlFor="email">Kunden-E-Mail</label>
              <input className="input" id="email" name="email" type="email" required />
            </div>
            <div className="form-row">
              <label htmlFor="aktion">Aktion</label>
              <select className="input" id="aktion" name="aktion" required>
                <option value="guthaben-1">1 Einheit Guthaben gutschreiben</option>
                <option value="guthaben-5">5 Einheiten Guthaben gutschreiben</option>
                <option value="karte-5er">5er-Karte gutschreiben (120€, 3 Monate)</option>
                <option value="karte-10er">10er-Karte gutschreiben (220€, 6 Monate)</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="notiz">Notiz (Grund, intern)</label>
              <input className="input" id="notiz" name="notiz" placeholder="z. B. Kulanz nach Beschwerde" />
            </div>
          </ActionForm>
        </div>
      </div>
    </section>
  );
}
