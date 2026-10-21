import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import ActionForm from "@/components/forms/ActionForm";
import { istAdminEingeloggt } from "@/lib/auth/admin";
import { adminLoginAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await istAdminEingeloggt()) redirect("/admin");

  return (
    <>
      <Header standort={null} />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="stack-3" style={{ maxWidth: "26rem" }}>
                <p className="tag">Admin</p>
                <h1 className="t-1">login</h1>
                <p className="small muted">
                  Platzhalter-Schutz über ein gemeinsames Passwort, kein echtes Rollensystem. Nicht
                  produktionsreif.
                </p>
              </div>
            </Reveal>
            <div style={{ marginTop: "var(--s4)" }}>
              <ActionForm action={adminLoginAction} initialState={null} submitLabel="Einloggen">
                <div className="form-row">
                  <label htmlFor="passwort">Admin-Passwort</label>
                  <input className="input" id="passwort" name="passwort" type="password" required />
                </div>
              </ActionForm>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
