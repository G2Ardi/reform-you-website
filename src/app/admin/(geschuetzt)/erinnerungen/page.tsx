import ActionButton from "@/components/forms/ActionButton";
import { getEinstellungen } from "@/lib/repositories/einstellungen";
import { erinnerungenVersendenAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminErinnerungenPage() {
  const einstellungen = await getEinstellungen();

  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">erinnerungen</h1>
        <p className="muted" style={{ maxWidth: "40rem" }}>
          Es gibt noch keinen echten Cronjob. Dieser Knopf stößt den Versand für alle Buchungen an, die
          in den nächsten {einstellungen.erinnerungStundenVorher} Stunden beginnen und noch keine
          Erinnerung erhalten haben. In Produktion ersetzt ein echter Cronjob (z. B. Vercel Cron oder ein
          Server-Cronjob) diesen manuellen Klick, siehe README.
        </p>
        <div style={{ marginTop: "var(--s4)" }}>
          <ActionButton
            label="Erinnerungen jetzt versenden"
            className="btn"
            action={erinnerungenVersendenAction}
          />
        </div>
      </div>
    </section>
  );
}
