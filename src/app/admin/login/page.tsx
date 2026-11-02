import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import ActionForm from "@/components/forms/ActionForm";
import { getMitarbeiter } from "@/lib/auth/admin";
import { adminLoginAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getMitarbeiter()) redirect("/admin");

  return (
    <>
      <Header standort={null} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="stack-3" style={{ maxWidth: "26rem" }}>
                <p className="tag">Admin und Trainer</p>
                <h1 className="t-1">login</h1>
                <p className="small muted">Mit der E-Mail-Adresse und dem Passwort deines Zugangs anmelden.</p>
              </div>
            </Reveal>
            <div style={{ marginTop: "var(--s4)" }}>
              <ActionForm action={adminLoginAction} initialState={null} submitLabel="Einloggen">
                <div className="form-row">
                  <label htmlFor="email">E-Mail</label>
                  <input className="input" id="email" name="email" type="email" autoComplete="username" required />
                </div>
                <div className="form-row">
                  <label htmlFor="passwort">Passwort</label>
                  <input
                    className="input"
                    id="passwort"
                    name="passwort"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </ActionForm>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
