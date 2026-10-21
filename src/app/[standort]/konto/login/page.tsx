import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import ActionForm from "@/components/forms/ActionForm";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { loginAction, type FormularFehler } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  if (kunde) redirect(`/${standort.slug}/konto/profil`);

  const action = loginAction.bind(null, standort.slug) as (
    vorher: FormularFehler | null,
    formData: FormData,
  ) => Promise<FormularFehler | null>;

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="stack-3" style={{ maxWidth: "28rem" }}>
                <p className="tag">Konto</p>
                <h1 className="t-1">login</h1>
              </div>
            </Reveal>
          </div>
        </section>
        <section className="band band-tight band-sunk">
          <div className="shell">
            <ActionForm action={action} initialState={null} submitLabel="Einloggen">
              <div className="form-row">
                <label htmlFor="email">E-Mail</label>
                <input className="input" id="email" name="email" type="email" required />
              </div>
              <div className="form-row">
                <label htmlFor="passwort">Passwort</label>
                <input className="input" id="passwort" name="passwort" type="password" required />
              </div>
            </ActionForm>
            <p className="small muted" style={{ marginTop: "var(--s3)" }}>
              Noch kein Konto?{" "}
              <Link className="go" href={`/${standort.slug}/konto/registrieren`}>
                Jetzt anlegen
              </Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
