import ActionButton from "@/components/forms/ActionButton";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { erinnerungenVersendenAction } from "@/lib/actions/admin";
import { erzwingeAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminErinnerungenPage() {
  await erzwingeAdmin();
  const einstellungen = await getEinstellungen();

  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">versand</h1>
        <p className="muted" style={{ maxWidth: "40rem" }}>
          Erinnerungen und Gutschein-Codes gehen einmal täglich automatisch raus (Cronjob, morgens). Dieser
          Knopf stößt den Versand zusätzlich von Hand an: Erinnerungen für alle Buchungen, die in den
          nächsten {einstellungen.erinnerungStundenVorher} Stunden beginnen und noch keine erhalten haben,
          und Gutschein-Codes, deren Lieferdatum erreicht ist. Nichts geht doppelt raus.
        </p>
        <div style={{ marginTop: "var(--s4)" }}>
          <ActionButton label="Jetzt versenden" className="btn" action={erinnerungenVersendenAction} />
        </div>
      </div>
    </section>
  );
}
