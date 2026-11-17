import Link from "next/link";
import { erzwingeAdmin } from "@/lib/auth/admin";
import { getStandorteMitKursen } from "@/lib/repositories/termin-verwaltung";
import { heuteBerlin } from "@/lib/zeit";
import TerminAnlegenForm from "@/components/forms/TerminAnlegenForm";

export const dynamic = "force-dynamic";

export default async function AdminTerminNeuPage() {
  await erzwingeAdmin();
  const standorte = await getStandorteMitKursen();

  return (
    <section className="band band-tight">
      <div className="shell">
        <h1 className="t-2">termin anlegen</h1>
        <p className="muted" style={{ maxWidth: "42rem" }}>
          Uhrzeiten gelten in deutscher Zeit. Mit Wiederholung entsteht jede Woche ein Termin am selben Wochentag zur
          selben Uhrzeit. Termine, die es schon gibt, werden übersprungen. Angelegte Termine erscheinen sofort im
          Kursplan.{" "}
          <Link className="go" href="/admin">
            Zur Terminübersicht
          </Link>
        </p>
        <div style={{ marginTop: "var(--s4)" }}>
          <TerminAnlegenForm standorte={standorte} heute={heuteBerlin()} />
        </div>
      </div>
    </section>
  );
}
