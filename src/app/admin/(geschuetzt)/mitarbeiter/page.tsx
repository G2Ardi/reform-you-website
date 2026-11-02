import { erzwingeUmsatzRecht } from "@/lib/auth/admin";
import { getAlleMitarbeiter } from "@/lib/repositories/mitarbeiter";
import ActionForm from "@/components/forms/ActionForm";
import ActionButton from "@/components/forms/ActionButton";
import { mitarbeiterAendernAction, mitarbeiterAnlegenAction, mitarbeiterPasswortAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminMitarbeiterPage() {
  const ich = await erzwingeUmsatzRecht();
  const mitarbeiter = await getAlleMitarbeiter();

  return (
    <section className="band band-tight">
      <div className="shell stack-5">
        <div>
          <h1 className="t-2">mitarbeiter</h1>
          <p className="muted" style={{ maxWidth: "42rem" }}>
            Jede Person meldet sich mit eigener E-Mail und eigenem Passwort an. Trainer sehen Kursplan und
            Teilnehmerliste und markieren anwesend oder nicht erschienen. Admins verwalten Kurse und Buchungen,
            sehen Umsätze und verwalten Mitarbeiter nur mit dem Häkchen &bdquo;darf Umsätze sehen&ldquo;.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Rolle</th>
                <th>Umsätze</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {mitarbeiter.map((m) => {
                const binIch = m.id === ich.id;
                return (
                  <tr key={m.id}>
                    <td>
                      {m.name}
                      {binIch ? <span className="small muted"> (du)</span> : null}
                    </td>
                    <td>{m.email}</td>
                    <td>{m.rolle === "ADMIN" ? "Admin" : "Trainer"}</td>
                    <td>{m.rolle === "ADMIN" ? (m.darfUmsaetzeSehen ? "ja" : "nein") : "nein"}</td>
                    <td>{m.aktiv ? "aktiv" : "gesperrt"}</td>
                    <td>
                      <div style={{ display: "grid", gap: "0.6em" }}>
                        {m.rolle === "ADMIN" ? (
                          <ActionButton
                            label={m.darfUmsaetzeSehen ? "Umsatzrecht entziehen" : "Umsatzrecht geben"}
                            action={mitarbeiterAendernAction.bind(null, m.id, { darfUmsaetzeSehen: !m.darfUmsaetzeSehen })}
                          />
                        ) : null}
                        <ActionButton
                          label={m.rolle === "ADMIN" ? "Zu Trainer machen" : "Zu Admin machen"}
                          bestaetigung="Rolle wirklich ändern?"
                          action={mitarbeiterAendernAction.bind(null, m.id, {
                            rolle: m.rolle === "ADMIN" ? "TRAINER" : "ADMIN",
                          })}
                        />
                        <ActionButton
                          label={m.aktiv ? "Sperren" : "Entsperren"}
                          bestaetigung={m.aktiv ? "Zugang wirklich sperren?" : undefined}
                          action={mitarbeiterAendernAction.bind(null, m.id, { aktiv: !m.aktiv })}
                        />
                        <ActionForm
                          action={mitarbeiterPasswortAction.bind(null, m.id)}
                          initialState={null}
                          submitLabel="Passwort setzen"
                          className="form-row-inline"
                        >
                          <input
                            className="input"
                            name="passwort"
                            type="password"
                            placeholder="Neues Passwort"
                            minLength={8}
                            autoComplete="new-password"
                            style={{ maxWidth: "14rem" }}
                          />
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="t-3">neuen zugang anlegen</h2>
          <div style={{ marginTop: "var(--s3)" }}>
            <ActionForm action={mitarbeiterAnlegenAction} initialState={null} submitLabel="Zugang anlegen">
              <div className="form-row">
                <label htmlFor="m-name">Name</label>
                <input className="input" id="m-name" name="name" required />
              </div>
              <div className="form-row">
                <label htmlFor="m-email">E-Mail</label>
                <input className="input" id="m-email" name="email" type="email" required autoComplete="off" />
              </div>
              <div className="form-row">
                <label htmlFor="m-passwort">Startpasswort (mind. 8 Zeichen)</label>
                <input
                  className="input"
                  id="m-passwort"
                  name="passwort"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-row">
                <label htmlFor="m-rolle">Rolle</label>
                <select className="input" id="m-rolle" name="rolle" defaultValue="TRAINER">
                  <option value="TRAINER">Trainer, sieht Kursplan und Teilnehmerliste</option>
                  <option value="ADMIN">Admin, verwaltet Kurse und Buchungen</option>
                </select>
              </div>
              <div className="form-row-inline">
                <input id="m-umsatz" name="darfUmsaetzeSehen" type="checkbox" />
                <label htmlFor="m-umsatz">Darf Umsätze sehen und Mitarbeiter verwalten (nur bei Admin)</label>
              </div>
            </ActionForm>
          </div>
        </div>
      </div>
    </section>
  );
}
