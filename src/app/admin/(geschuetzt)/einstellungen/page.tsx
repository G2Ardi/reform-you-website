import ActionForm from "@/components/forms/ActionForm";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { einstellungenSpeichernAction } from "@/lib/actions/admin";
import { erzwingeAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminEinstellungenPage() {
  await erzwingeAdmin();
  const einstellungen = await getEinstellungen();

  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">einstellungen</h1>
        <p className="small muted">
          Fristen für den gesamten Betrieb, nicht hart codiert. Änderungen gelten sofort für neue
          Erinnerungs- und Stornoprüfungen.
        </p>
        <div style={{ marginTop: "var(--s4)" }}>
          <ActionForm action={einstellungenSpeichernAction} initialState={null} submitLabel="Speichern">
            <div className="form-row">
              <label htmlFor="erinnerungStundenVorher">Erinnerungsmail, Stunden vor Kursbeginn</label>
              <input
                className="input"
                id="erinnerungStundenVorher"
                name="erinnerungStundenVorher"
                type="number"
                min={1}
                defaultValue={einstellungen.erinnerungStundenVorher}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="stornoFristStunden">Stornofrist, Stunden vor Kursbeginn</label>
              <input
                className="input"
                id="stornoFristStunden"
                name="stornoFristStunden"
                type="number"
                min={1}
                defaultValue={einstellungen.stornoFristStunden}
                required
              />
            </div>
            <div className="form-row-inline">
              <input
                id="willkommenscodeAktiv"
                name="willkommenscodeAktiv"
                type="checkbox"
                defaultChecked={einstellungen.willkommenscodeAktiv}
              />
              <label htmlFor="willkommenscodeAktiv">
                Willkommenscode bei der Erstregistrierung automatisch erzeugen und per Mail verschicken
              </label>
            </div>
            <div className="form-row">
              <label htmlFor="willkommenscodeMonate">Gültigkeit des Willkommenscodes, in Monaten</label>
              <input
                className="input"
                id="willkommenscodeMonate"
                name="willkommenscodeMonate"
                type="number"
                min={1}
                max={36}
                defaultValue={einstellungen.willkommenscodeMonate}
                required
              />
            </div>
          </ActionForm>
        </div>
      </div>
    </section>
  );
}
