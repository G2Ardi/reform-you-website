import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { pruefeAktionsToken } from "@/lib/auth/actionToken";
import { getBuchungMitBezug } from "@/lib/repositories/buchungen";
import { getUmbuchOptionen } from "@/lib/repositories/kurstermine";
import { formatDatumUhrzeit } from "@/lib/format";
import AktionsButtons from "@/components/forms/AktionsButtons";

export const dynamic = "force-dynamic";

/**
 * Ziel der signierten Links aus Erinnerungs- und anderen E-Mails:
 * Stornieren, Umbuchen oder einen Warteliste-Platz bestätigen, ohne Login.
 * Siehe Auftrag und src/lib/auth/actionToken.ts.
 */
export default async function AktionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const nutzlast = pruefeAktionsToken(token);

  if (!nutzlast) {
    return (
      <>
        <Header standort={null} solid />
        <main id="inhalt">
          <section className="band">
            <div className="shell">
              <p className="form-fehler" style={{ maxWidth: "30rem" }}>
                Dieser Link ist ungültig oder abgelaufen. Bitte im Kundenkonto einloggen.
              </p>
            </div>
          </section>
        </main>
      </>
    );
  }

  const buchung = await getBuchungMitBezug(nutzlast.buchungId);
  if (!buchung) {
    return (
      <>
        <Header standort={null} solid />
        <main id="inhalt">
          <section className="band">
            <div className="shell">
              <p className="form-fehler" style={{ maxWidth: "30rem" }}>
                Zu diesem Link wurde keine Buchung gefunden.
              </p>
            </div>
          </section>
        </main>
      </>
    );
  }

  const optionen =
    nutzlast.aktion === "umbuchen"
      ? (await getUmbuchOptionen(buchung.kursTermin.kurs.slug, buchung.kursTermin.id)).map((t) => ({
          id: t.id,
          label: `${t.standort.name}, ${formatDatumUhrzeit(t.beginn)} Uhr`,
        }))
      : [];

  return (
    <>
      <Header standort={null} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell">
            <Reveal>
              <div className="stack-3" style={{ maxWidth: "32rem" }}>
                <p className="tag">Ihre Buchung</p>
                <h1 className="t-2">
                  {buchung.kursTermin.kurs.name} · {buchung.kursTermin.standort.name}
                </h1>
                <p className="muted">{formatDatumUhrzeit(buchung.kursTermin.beginn)} Uhr</p>
                <p className="small muted">Status: {buchung.status.toLowerCase()}</p>
              </div>
            </Reveal>
          </div>
        </section>
        <section className="band band-tight band-sunk">
          <div className="shell">
            <AktionsButtons token={token} aktion={nutzlast.aktion} umbuchOptionen={optionen} />
          </div>
        </section>
      </main>
    </>
  );
}
