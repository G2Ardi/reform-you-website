import Header from "@/components/Header";
import StandortPicker from "@/components/StandortPicker";
import { getAlleStandorte } from "@/lib/repositories/standorte";

export const dynamic = "force-dynamic";

/**
 * Startseite = Standortwahl. Sie erscheint bei jedem Besuch, es gibt keine
 * automatische Weiterleitung mehr. Auf dem Handy stehen beide Standorte
 * nebeneinander und passen ohne Scrollen auf den Bildschirm.
 */
export default async function StandortauswahlPage() {
  const standorte = await getAlleStandorte();

  return (
    <>
      <Header standort={null} solid />
      <main id="inhalt" className="picker-page">
        <div className="shell">
          <div className="picker-intro">
            <p className="tag">Reform You Pilates Studio</p>
            <h1 className="t-2">wo möchtest du trainieren?</h1>
          </div>
          <StandortPicker
            standorte={standorte.map((s) => ({
              slug: s.slug,
              name: s.name,
              hinweis: s.hinweis,
            }))}
          />
        </div>
      </main>
    </>
  );
}
