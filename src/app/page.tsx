import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import StandortPicker from "@/components/StandortPicker";
import { getAlleStandorte } from "@/lib/repositories/standorte";
import { STANDORT_COOKIE } from "@/lib/standort-cookie";

export default async function StandortauswahlPage({
  searchParams,
}: {
  searchParams: Promise<{ wahl?: string }>;
}) {
  const { wahl } = await searchParams;
  const standorte = await getAlleStandorte();

  // Wiederkehrende Besucher muessen nicht jedes Mal neu waehlen: ist die
  // Wahl per Cookie gemerkt, geht es direkt zum Standort. Der Link
  // "Standort wechseln" im Kopfbereich haengt "?wahl=1" an und kommt damit
  // trotzdem jederzeit zurueck auf diese Auswahl.
  if (!wahl) {
    const cookieStore = await cookies();
    const gemerkt = cookieStore.get(STANDORT_COOKIE)?.value;
    if (gemerkt && standorte.some((s) => s.slug === gemerkt)) {
      redirect(`/${gemerkt}`);
    }
  }

  return (
    <>
      <Header standort={null} />
      <main id="inhalt" className="picker-page">
        <div className="shell">
          <Reveal className="picker-intro">
            <p className="tag">Reform You Pilates Studio</p>
            <h1 className="t-1">wähle deinen standort</h1>
            <p className="lede">
              Reformer Pilates in kleinen Gruppen. Kurse, Preise und Kontakt
              richten sich nach dem Standort, den du wählst.
            </p>
          </Reveal>
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
