import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import ActionForm from "@/components/forms/ActionForm";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { getEingeloggterKunde } from "@/lib/auth/session";
import { registrierenAction, type FormularFehler } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function RegistrierenPage({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const kunde = await getEingeloggterKunde();
  if (kunde) redirect(`/${standort.slug}/konto/profil`);

  const action = registrierenAction.bind(null, standort.slug) as (
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
              <div className="stack-3" style={{ maxWidth: "34rem" }}>
                <p className="tag">Konto</p>
                <h1 className="t-1">konto anlegen</h1>
                <p className="lede">
                  Buchen geht nur mit Konto, kein Gast-Checkout. Ab 16 Jahren, jüngere mit einem
                  Elternteil.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
        <section className="band band-tight band-sunk">
          <div className="shell">
            <ActionForm action={action} initialState={null} submitLabel="Konto anlegen">
              <div className="form-row">
                <label htmlFor="name">Name</label>
                <input className="input" id="name" name="name" required />
              </div>
              <div className="form-row">
                <label htmlFor="email">E-Mail</label>
                <input className="input" id="email" name="email" type="email" required />
              </div>
              <div className="form-row">
                <label htmlFor="telefon">Telefon</label>
                <input className="input" id="telefon" name="telefon" required />
              </div>
              <div className="form-cols-2">
                <div className="form-row">
                  <label htmlFor="strasse">Straße und Hausnummer</label>
                  <input className="input" id="strasse" name="strasse" required />
                </div>
                <div className="form-row">
                  <label htmlFor="plz">PLZ</label>
                  <input className="input" id="plz" name="plz" required />
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="ort">Ort</label>
                <input className="input" id="ort" name="ort" required />
              </div>
              <div className="form-row">
                <label htmlFor="passwort">Passwort (mind. 8 Zeichen)</label>
                <input className="input" id="passwort" name="passwort" type="password" minLength={8} required />
              </div>
              <div className="form-row-inline">
                <input id="mindestalter" name="mindestalter" type="checkbox" required />
                <label htmlFor="mindestalter">Ich bin mindestens 16 Jahre alt (ggf. mit einem Elternteil).</label>
              </div>
              <div className="form-row-inline">
                <input id="agb" name="agb" type="checkbox" required />
                <label htmlFor="agb">
                  Ich akzeptiere die <Link href={`/${standort.slug}/agb`}>AGB</Link>.
                </label>
              </div>
            </ActionForm>
            <p className="small muted" style={{ marginTop: "var(--s3)" }}>
              Schon ein Konto? <Link className="go" href={`/${standort.slug}/konto/login`}>Zum Login</Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
