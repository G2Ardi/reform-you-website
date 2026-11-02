import ActionForm from "@/components/forms/ActionForm";
import { kulanzAction } from "@/lib/actions/admin";
import { erzwingeAdmin } from "@/lib/auth/admin";
import { CREDITS_KATALOG } from "@/lib/credits";
import { formatPreis } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminKulanzPage() {
  await erzwingeAdmin();
  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">kulanz</h1>
        <p className="muted" style={{ maxWidth: "40rem" }}>
          Freitext-Werkzeug für Ausnahmen außerhalb der normalen Regeln: Credits manuell
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
                <option value="guthaben-1">1 Credit Guthaben gutschreiben</option>
                <option value="guthaben-5">5 Credits Guthaben gutschreiben</option>
                <option value="karte-5er">{`${CREDITS_KATALOG.FUENFER.label} gutschreiben (${CREDITS_KATALOG.FUENFER.laufzeitMonate} Monate, Wert ${formatPreis(CREDITS_KATALOG.FUENFER.preisCent)})`}</option>
                <option value="karte-10er">{`${CREDITS_KATALOG.ZEHNER.label} gutschreiben (${CREDITS_KATALOG.ZEHNER.laufzeitMonate} Monate, Wert ${formatPreis(CREDITS_KATALOG.ZEHNER.preisCent)})`}</option>
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
